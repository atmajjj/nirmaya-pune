import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { researcherApplications, NewResearcherApplication, ApplicationStatus } from './schema';

/**
 * Create a new researcher application
 */
export async function createResearcherApplication(
  data: Pick<NewResearcherApplication, 'full_name' | 'email' | 'phone_number' | 'organization' | 'purpose'>
): Promise<typeof researcherApplications.$inferSelect> {
  const [application] = await db
    .insert(researcherApplications)
    .values({
      ...data,
      status: 'pending',
    })
    .returning();
  
  return application;
}

/**
 * Get all researcher applications (admin only)
 */
export async function getAllResearcherApplications(status?: ApplicationStatus) {
  const conditions = [eq(researcherApplications.is_deleted, false)];
  
  if (status) {
    conditions.push(eq(researcherApplications.status, status));
  }
  
  return await db
    .select()
    .from(researcherApplications)
    .where(and(...conditions))
    .orderBy(desc(researcherApplications.created_at));
}

/**
 * Get application by ID
 */
export async function getApplicationById(id: string) {
  const [application] = await db
    .select()
    .from(researcherApplications)
    .where(
      and(
        eq(researcherApplications.id, id),
        eq(researcherApplications.is_deleted, false)
      )
    );
  
  return application;
}

/**
 * Check if email already has an application
 */
export async function findApplicationByEmail(email: string) {
  const [application] = await db
    .select()
    .from(researcherApplications)
    .where(
      and(
        eq(researcherApplications.email, email),
        eq(researcherApplications.is_deleted, false)
      )
    );
  
  return application;
}

/**
 * Update application status to accepted
 */
export async function acceptApplication(
  applicationId: string,
  reviewedBy: number,
  inviteToken: string
) {
  const [updated] = await db
    .update(researcherApplications)
    .set({
      status: 'accepted',
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
      invite_token: inviteToken,
      invite_sent_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(researcherApplications.id, applicationId))
    .returning();
  
  return updated;
}

/**
 * Update application status to rejected
 */
export async function rejectApplication(
  applicationId: string,
  reviewedBy: number,
  rejectionReason?: string
) {
  const [updated] = await db
    .update(researcherApplications)
    .set({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
      rejection_reason: rejectionReason,
      updated_at: new Date(),
    })
    .where(eq(researcherApplications.id, applicationId))
    .returning();
  
  return updated;
}