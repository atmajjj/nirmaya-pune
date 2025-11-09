import { eq, and, or, desc, asc } from 'drizzle-orm';
import { db } from '../../database/drizzle';
import { invitations, type Invitation, type NewInvitation } from './admin-invite.schema';

/**
 * Find invitation by ID (excluding deleted invitations)
 */
export const findInvitationById = async (id: number): Promise<Invitation | undefined> => {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.invitation_id, id), eq(invitations.is_deleted, false)))
    .limit(1);

  return invitation;
};

/**
 * Find invitation by email (excluding deleted invitations)
 */
export const findInvitationByEmail = async (email: string): Promise<Invitation | undefined> => {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.email, email), eq(invitations.is_deleted, false)))
    .limit(1);

  return invitation;
};

/**
 * Find invitation by token (excluding deleted invitations)
 */
export const findInvitationByToken = async (token: string): Promise<Invitation | undefined> => {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.invite_token, token), eq(invitations.is_deleted, false)))
    .limit(1);

  return invitation;
};

/**
 * Get all invitations with optional filtering and pagination
 */
export const getInvitations = async (
  filters: { status?: string } = {},
  pagination: { page?: number; limit?: number } = {}
): Promise<{ invitations: Invitation[]; total: number }> => {
  const { status } = filters;
  const { page = 1, limit = 10 } = pagination;

  let whereClause = eq(invitations.is_deleted, false);

  if (status) {
    whereClause = and(whereClause, eq(invitations.status, status as any));
  }

  const offset = (page - 1) * limit;

  const [invitationsResult, totalResult] = await Promise.all([
    db
      .select()
      .from(invitations)
      .where(whereClause)
      .orderBy(desc(invitations.created_at))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: invitations.invitation_id })
      .from(invitations)
      .where(whereClause),
  ]);

  return {
    invitations: invitationsResult,
    total: totalResult.length,
  };
};

/**
 * Create a new invitation
 */
export const createInvitation = async (invitationData: NewInvitation): Promise<Invitation> => {
  const [newInvitation] = await db
    .insert(invitations)
    .values(invitationData)
    .returning();

  return newInvitation;
};

/**
 * Update invitation by ID
 */
export const updateInvitation = async (
  id: number,
  updateData: Partial<NewInvitation>
): Promise<Invitation | undefined> => {
  const [updatedInvitation] = await db
    .update(invitations)
    .set(updateData)
    .where(eq(invitations.invitation_id, id))
    .returning();

  return updatedInvitation;
};

/**
 * Soft delete invitation by ID
 */
export const deleteInvitation = async (id: number, deletedBy: number): Promise<void> => {
  await db
    .update(invitations)
    .set({
      is_deleted: true,
      updated_at: new Date(),
    })
    .where(eq(invitations.invitation_id, id));
};