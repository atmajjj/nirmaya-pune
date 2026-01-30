import { db } from '../../../database/drizzle';
import { dataSources, DataSource, NewDataSource, DataSourceStatus } from './schema';
import { users } from '../../user/shared/schema';
import { eq, and, desc, asc, ilike, or, sql } from 'drizzle-orm';
import { DataSourceWithUploader, ListDataSourcesQuery } from './interface';

/**
 * Create a new data source record
 */
export async function createDataSource(data: NewDataSource): Promise<DataSource> {
  const [dataSource] = await db
    .insert(dataSources)
    .values({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();
  return dataSource;
}

/**
 * Find data source by ID (excluding soft deleted)
 */
export async function findDataSourceById(id: number): Promise<DataSource | undefined> {
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(and(eq(dataSources.id, id), eq(dataSources.is_deleted, false)))
    .limit(1);
  return dataSource;
}

/**
 * Find data source by ID with uploader details
 */
export async function findDataSourceWithUploaderById(
  id: number
): Promise<DataSourceWithUploader | undefined> {
  const [result] = await db
    .select({
      id: dataSources.id,
      filename: dataSources.filename,
      original_filename: dataSources.original_filename,
      file_type: dataSources.file_type,
      mime_type: dataSources.mime_type,
      file_size: dataSources.file_size,
      file_path: dataSources.file_path,
      file_url: dataSources.file_url,
      uploaded_by: dataSources.uploaded_by,
      status: dataSources.status,
      error_message: dataSources.error_message,
      metadata: dataSources.metadata,
      description: dataSources.description,
      calculation_status: dataSources.calculation_status,
      calculation_upload_id: dataSources.calculation_upload_id,
      calculation_error: dataSources.calculation_error,
      calculation_completed_at: dataSources.calculation_completed_at,
      created_by: dataSources.created_by,
      created_at: dataSources.created_at,
      updated_by: dataSources.updated_by,
      updated_at: dataSources.updated_at,
      is_deleted: dataSources.is_deleted,
      deleted_by: dataSources.deleted_by,
      deleted_at: dataSources.deleted_at,
      uploader: {
        id: users.id,
        full_name: users.name,
        email: users.email,
      },
    })
    .from(dataSources)
    .leftJoin(users, eq(dataSources.uploaded_by, users.id))
    .where(and(eq(dataSources.id, id), eq(dataSources.is_deleted, false)))
    .limit(1);

  return result as DataSourceWithUploader | undefined;
}

/**
 * List data sources with optional filters and pagination
 */
export async function listDataSources(
  query: ListDataSourcesQuery
): Promise<{ data: DataSourceWithUploader[]; total: number }> {
  const {
    page = 1,
    limit = 10,
    status,
    file_type,
    uploaded_by,
    search,
    sort_by = 'created_at',
    sort_order = 'desc',
  } = query;

  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [eq(dataSources.is_deleted, false)];

  if (status) {
    conditions.push(eq(dataSources.status, status));
  }

  if (file_type) {
    conditions.push(eq(dataSources.file_type, file_type));
  }

  if (uploaded_by) {
    conditions.push(eq(dataSources.uploaded_by, uploaded_by));
  }

  if (search) {
    conditions.push(
      or(
        ilike(dataSources.filename, `%${search}%`),
        ilike(dataSources.original_filename, `%${search}%`),
        ilike(dataSources.description, `%${search}%`)
      )!
    );
  }

  const whereClause = and(...conditions);

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dataSources)
    .where(whereClause);

  // Build ORDER BY
  const orderByColumn =
    sort_by === 'filename'
      ? dataSources.filename
      : sort_by === 'file_size'
        ? dataSources.file_size
        : dataSources.created_at;

  const orderByClause = sort_order === 'asc' ? asc(orderByColumn) : desc(orderByColumn);

  // Get data with uploader details
  const results = await db
    .select({
      id: dataSources.id,
      filename: dataSources.filename,
      original_filename: dataSources.original_filename,
      file_type: dataSources.file_type,
      mime_type: dataSources.mime_type,
      file_size: dataSources.file_size,
      file_path: dataSources.file_path,
      file_url: dataSources.file_url,
      uploaded_by: dataSources.uploaded_by,
      status: dataSources.status,
      error_message: dataSources.error_message,
      metadata: dataSources.metadata,
      description: dataSources.description,
      calculation_status: dataSources.calculation_status,
      calculation_upload_id: dataSources.calculation_upload_id,
      calculation_error: dataSources.calculation_error,
      calculation_completed_at: dataSources.calculation_completed_at,
      created_by: dataSources.created_by,
      created_at: dataSources.created_at,
      updated_by: dataSources.updated_by,
      updated_at: dataSources.updated_at,
      is_deleted: dataSources.is_deleted,
      deleted_by: dataSources.deleted_by,
      deleted_at: dataSources.deleted_at,
      uploader: {
        id: users.id,
        full_name: users.name,
        email: users.email,
      },
    })
    .from(dataSources)
    .leftJoin(users, eq(dataSources.uploaded_by, users.id))
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  return {
    data: results as DataSourceWithUploader[],
    total: count,
  };
}

/**
 * Update data source
 */
export async function updateDataSource(
  id: number,
  data: Partial<NewDataSource>
): Promise<DataSource | undefined> {
  const [updated] = await db
    .update(dataSources)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(and(eq(dataSources.id, id), eq(dataSources.is_deleted, false)))
    .returning();
  return updated;
}

/**
 * Update data source status
 */
export async function updateDataSourceStatus(
  id: number,
  status: DataSourceStatus,
  errorMessage?: string
): Promise<DataSource | undefined> {
  const updateData: Partial<NewDataSource> = {
    status,
    updated_at: new Date(),
  };

  if (errorMessage !== undefined) {
    updateData.error_message = errorMessage;
  }

  const [updated] = await db
    .update(dataSources)
    .set(updateData)
    .where(and(eq(dataSources.id, id), eq(dataSources.is_deleted, false)))
    .returning();
  return updated;
}

/**
 * Soft delete a data source
 */
export async function deleteDataSource(
  id: number,
  deletedBy: number
): Promise<DataSource | undefined> {
  const [deleted] = await db
    .update(dataSources)
    .set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(and(eq(dataSources.id, id), eq(dataSources.is_deleted, false)))
    .returning();
  return deleted;
}

/**
 * Count data sources by status for a specific user
 */
export async function countDataSourcesByStatus(
  userId: number
): Promise<Record<DataSourceStatus, number>> {
  const results = await db
    .select({
      status: dataSources.status,
      count: sql<number>`count(*)::int`,
    })
    .from(dataSources)
    .where(and(eq(dataSources.uploaded_by, userId), eq(dataSources.is_deleted, false)))
    .groupBy(dataSources.status);

  const counts: Record<string, number> = {};
  results.forEach(row => {
    counts[row.status] = row.count;
  });

  return counts as Record<DataSourceStatus, number>;
}

/**
 * Get all available data sources (for scientist to select)
 */
export async function getAvailableDataSources(): Promise<DataSourceWithUploader[]> {
  const results = await db
    .select({
      id: dataSources.id,
      filename: dataSources.filename,
      original_filename: dataSources.original_filename,
      file_type: dataSources.file_type,
      mime_type: dataSources.mime_type,
      file_size: dataSources.file_size,
      file_path: dataSources.file_path,
      file_url: dataSources.file_url,
      uploaded_by: dataSources.uploaded_by,
      status: dataSources.status,
      error_message: dataSources.error_message,
      metadata: dataSources.metadata,
      description: dataSources.description,
      created_by: dataSources.created_by,
      created_at: dataSources.created_at,
      updated_by: dataSources.updated_by,
      updated_at: dataSources.updated_at,
      is_deleted: dataSources.is_deleted,
      deleted_by: dataSources.deleted_by,
      deleted_at: dataSources.deleted_at,
      uploader: {
        id: users.id,
        full_name: users.name,
        email: users.email,
      },
    })
    .from(dataSources)
    .leftJoin(users, eq(dataSources.uploaded_by, users.id))
    .where(and(eq(dataSources.status, 'available'), eq(dataSources.is_deleted, false)))
    .orderBy(desc(dataSources.created_at));

  return results as DataSourceWithUploader[];
}
