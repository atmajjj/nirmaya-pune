import DB from "../../../../database/index.schema";
import HttpException from "../../../exceptions/HttpException";
import { DATABASE_SOURCES_TABLE } from "../database/database_sources.schema";
import { SOURCES_TABLE } from "../sources.schema";

// Import new infrastructure
import { databaseConnectionService } from "../../../utils/database-connection";
import type { DatabaseConfig } from "../../../utils/database-connection";

export interface EnhancedDatabaseSource extends DatabaseSource {
  // Connection status information
  connection_tested: boolean;
  last_connection_test?: Date;
  last_connection_error?: string;
}

export interface DatabaseSource {
  id: number;
  source_id: number;
  db_host: string;
  db_port: number;
  db_user: string;
  db_name: string;
  schema_name?: string;
  connection_tested: boolean;
  last_connection_test?: Date;
  last_connection_error?: string;
}

export interface DatabaseSourceCreateInput {
  agent_id: number;
  name: string;
  description?: string;
  db_host: string;
  db_port: number;
  db_user: string;
  db_password: string;
  db_name: string;
  connection_string?: string;
  schema_name?: string;
  test_connection?: boolean;
}

export interface DatabaseSourceUpdateInput {
  name?: string;
  description?: string;
  db_host?: string;
  db_port?: number;
  db_user?: string;
  db_password?: string;
  db_name?: string;
  connection_string?: string;
  schema_name?: string;
  test_connection?: boolean;
}

class DatabaseSourceService {
  public async getAllDatabaseSources(
    agentId: number
  ): Promise<EnhancedDatabaseSource[]> {
    try {
      const databaseSources = await DB(SOURCES_TABLE)
        .join(
          DATABASE_SOURCES_TABLE,
          `${SOURCES_TABLE}.id`,
          `${DATABASE_SOURCES_TABLE}.source_id`
        )
        .select([
          `${SOURCES_TABLE}.id as source_id`,
          `${SOURCES_TABLE}.name`,
          `${SOURCES_TABLE}.description`,
          `${SOURCES_TABLE}.status`,
          `${SOURCES_TABLE}.is_embedded`,
          `${SOURCES_TABLE}.created_at`,
          `${SOURCES_TABLE}.updated_at`,
          `${DATABASE_SOURCES_TABLE}.id`,
          `${DATABASE_SOURCES_TABLE}.db_host`,
          `${DATABASE_SOURCES_TABLE}.db_port`,
          `${DATABASE_SOURCES_TABLE}.db_user`,
          `${DATABASE_SOURCES_TABLE}.db_name`,
          `${DATABASE_SOURCES_TABLE}.schema_name`,
          `${DATABASE_SOURCES_TABLE}.connection_tested`,
          `${DATABASE_SOURCES_TABLE}.last_connection_test`,
          `${DATABASE_SOURCES_TABLE}.last_connection_error`,
        ])
        .where(`${SOURCES_TABLE}.agent_id`, agentId)
        .where(`${SOURCES_TABLE}.source_type`, "database")
        .where(`${SOURCES_TABLE}.is_deleted`, false)
        .orderBy(`${SOURCES_TABLE}.created_at`, "desc");

      return databaseSources.map((source: any) => ({
        ...source,
        connection_tested: source.connection_tested || false,
      }));
    } catch (error: any) {
      throw new HttpException(
        500,
        `Failed to retrieve database sources: ${error.message}`
      );
    }
  }

  public async getDatabaseSourceById(
    sourceId: number
  ): Promise<EnhancedDatabaseSource> {
    try {
      console.log("Looking up database source with ID:", sourceId);

      // Debug: Check what's in database_sources table
      console.log("Table name being used:", DATABASE_SOURCES_TABLE);
      console.log("Looking for ID:", sourceId, "Type:", typeof sourceId);

      const dbSourceDirect = await DB(DATABASE_SOURCES_TABLE)
        .where("id", sourceId)
        .first();
      console.log("Direct database_sources lookup:", dbSourceDirect);

      // Debug: Let's also try to get all records to see what's there
      const allDbSources = await DB(DATABASE_SOURCES_TABLE)
        .select("*")
        .limit(5);
      console.log("All database sources (first 5):", allDbSources);

      // Debug: Check what's in sources table
      if (dbSourceDirect) {
        const sourceDirect = await DB(SOURCES_TABLE)
          .where("id", dbSourceDirect.source_id)
          .first();
        console.log("Direct sources lookup:", sourceDirect);
      }

      const databaseSource = await DB(SOURCES_TABLE)
        .join(
          DATABASE_SOURCES_TABLE,
          `${SOURCES_TABLE}.id`,
          `${DATABASE_SOURCES_TABLE}.source_id`
        )
        .select([
          `${SOURCES_TABLE}.id as source_id`,
          `${SOURCES_TABLE}.name`,
          `${SOURCES_TABLE}.description`,
          `${SOURCES_TABLE}.status`,
          `${SOURCES_TABLE}.is_embedded`,
          `${SOURCES_TABLE}.created_at`,
          `${SOURCES_TABLE}.updated_at`,
          `${DATABASE_SOURCES_TABLE}.id`,
          `${DATABASE_SOURCES_TABLE}.db_host`,
          `${DATABASE_SOURCES_TABLE}.db_port`,
          `${DATABASE_SOURCES_TABLE}.db_user`,
          `${DATABASE_SOURCES_TABLE}.db_name`,
          `${DATABASE_SOURCES_TABLE}.schema_name`,
          `${DATABASE_SOURCES_TABLE}.connection_tested`,
          `${DATABASE_SOURCES_TABLE}.last_connection_test`,
          `${DATABASE_SOURCES_TABLE}.last_connection_error`,
        ])
        .where(`${DATABASE_SOURCES_TABLE}.id`, sourceId)
        .where(`${SOURCES_TABLE}.is_deleted`, false)
        .first();

      console.log("Found database source:", databaseSource);

      if (!databaseSource) {
        throw new HttpException(404, "Database source not found");
      }

      return {
        ...databaseSource,
        connection_tested: databaseSource.connection_tested || false,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Failed to retrieve database source: ${error.message}`
      );
    }
  }

  public async createDatabaseSource(
    sourceData: DatabaseSourceCreateInput,
    userId: number
  ): Promise<EnhancedDatabaseSource> {
    try {
      console.log("Starting database source creation with data:", {
        agent_id: sourceData.agent_id,
        name: sourceData.name,
        test_connection: sourceData.test_connection,
      });

      return await DB.transaction(async (trx) => {
        // Test connection first if requested
        let connectionTested = false;
        let lastConnectionError: string | null = null;

        if (sourceData.test_connection) {
          const config: DatabaseConfig = {
            host: sourceData.db_host,
            port: sourceData.db_port,
            user: sourceData.db_user,
            password: sourceData.db_password,
            database: sourceData.db_name,
            schema: sourceData.schema_name,
            connectionString: sourceData.connection_string,
          };

          const testResult =
            await databaseConnectionService.testConnectionWithRetry(config);
          connectionTested = testResult.success;

          if (!testResult.success) {
            lastConnectionError = testResult.error || "Connection test failed";
            throw new HttpException(
              400,
              `Database connection failed: ${lastConnectionError}`
            );
          }
        }

        // Create the base source entry
        console.log("Creating base source entry...");
        const [sourceResult] = await trx(SOURCES_TABLE)
          .insert({
            agent_id: sourceData.agent_id,
            source_type: "database",
            name: sourceData.name,
            description: sourceData.description,
            status: "pending",
            is_embedded: false,
            created_by: userId,
            updated_by: userId,
          })
          .returning("*");

        console.log("Created base source:", sourceResult);

        // For now, store password as plain text (TODO: implement encryption)
        console.log("Creating database source entry...");
        const [databaseSourceResult] = await trx(DATABASE_SOURCES_TABLE)
          .insert({
            source_id: sourceResult.id,
            db_host: sourceData.db_host,
            db_port: sourceData.db_port,
            db_user: sourceData.db_user,
            encrypted_password: "temp", // Required field - using temp value
            password_salt: "temp", // Required field - using temp value
            password_iv: "temp", // Required field - using temp value
            db_password: sourceData.db_password, // Using legacy field for now
            db_name: sourceData.db_name,
            connection_string: sourceData.connection_string, // Using legacy field
            schema_name: sourceData.schema_name,
            connection_tested: connectionTested,
            last_connection_test: connectionTested ? new Date() : null,
            last_connection_error: lastConnectionError,
          })
          .returning("*");

        console.log("Created database source result:", databaseSourceResult);
        console.log("Database source ID for lookup:", databaseSourceResult.id);

        // Return a simple response without additional queries to avoid transaction issues
        return {
          id: databaseSourceResult.id,
          source_id: sourceResult.id,
          name: sourceResult.name,
          description: sourceResult.description,
          db_host: databaseSourceResult.db_host,
          db_port: databaseSourceResult.db_port,
          db_user: databaseSourceResult.db_user,
          db_name: databaseSourceResult.db_name,
          schema_name: databaseSourceResult.schema_name,
          connection_tested: databaseSourceResult.connection_tested || false,
          last_connection_test: databaseSourceResult.last_connection_test,
          last_connection_error: databaseSourceResult.last_connection_error,
          status: sourceResult.status,
          is_embedded: sourceResult.is_embedded,
          created_at: sourceResult.created_at,
          updated_at: sourceResult.updated_at,
        };
      });
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Failed to create database source: ${error.message}`
      );
    }
  }

  public async updateDatabaseSource(
    sourceId: number,
    sourceData: DatabaseSourceUpdateInput,
    userId: number
  ): Promise<EnhancedDatabaseSource> {
    try {
      return await DB.transaction(async (trx) => {
        // Get existing database source
        const existingDbSource = await trx(DATABASE_SOURCES_TABLE)
          .where("id", sourceId)
          .first();

        if (!existingDbSource) {
          throw new HttpException(404, "Database source not found");
        }

        // Test connection if requested and connection details are provided
        let connectionTested = existingDbSource.connection_tested;
        let lastConnectionTest = existingDbSource.last_connection_test;
        let lastConnectionError = existingDbSource.last_connection_error;

        if (
          sourceData.test_connection &&
          (sourceData.db_host ||
            sourceData.db_port ||
            sourceData.db_user ||
            sourceData.db_password ||
            sourceData.db_name ||
            sourceData.connection_string)
        ) {
          const config: DatabaseConfig = {
            host: sourceData.db_host || existingDbSource.db_host,
            port: sourceData.db_port || existingDbSource.db_port,
            user: sourceData.db_user || existingDbSource.db_user,
            password: sourceData.db_password || existingDbSource.db_password, // Use legacy field
            database: sourceData.db_name || existingDbSource.db_name,
            schema: sourceData.schema_name || existingDbSource.schema_name,
            connectionString:
              sourceData.connection_string ||
              existingDbSource.connection_string,
          };

          const testResult =
            await databaseConnectionService.testConnectionWithRetry(config);
          connectionTested = testResult.success;
          lastConnectionTest = new Date();
          lastConnectionError = testResult.success
            ? null
            : testResult.error || "Connection test failed";

          if (!testResult.success) {
            throw new HttpException(
              400,
              `Database connection failed: ${lastConnectionError}`
            );
          }
        }

        // Update base source if name or description provided
        if (sourceData.name || sourceData.description) {
          await trx(SOURCES_TABLE)
            .where("id", existingDbSource.source_id)
            .update({
              ...(sourceData.name && { name: sourceData.name }),
              ...(sourceData.description !== undefined && {
                description: sourceData.description,
              }),
              updated_by: userId,
            });
        }

        // Prepare database source updates
        const updateData: any = {
          ...(sourceData.db_host && { db_host: sourceData.db_host }),
          ...(sourceData.db_port && { db_port: sourceData.db_port }),
          ...(sourceData.db_user && { db_user: sourceData.db_user }),
          ...(sourceData.db_name && { db_name: sourceData.db_name }),
          ...(sourceData.schema_name !== undefined && {
            schema_name: sourceData.schema_name,
          }),
          connection_tested: connectionTested,
          last_connection_test: lastConnectionTest,
          last_connection_error: lastConnectionError,
        };

        // Handle password (TODO: encrypt)
        if (sourceData.db_password) {
          updateData.db_password = sourceData.db_password;
        }

        // Handle connection string
        if (sourceData.connection_string !== undefined) {
          updateData.connection_string = sourceData.connection_string;
        }

        await trx(DATABASE_SOURCES_TABLE)
          .where("id", sourceId)
          .update(updateData);

        // Get the updated record from within the transaction
        const updatedDbSource = await trx(DATABASE_SOURCES_TABLE)
          .where("id", sourceId)
          .first();

        const updatedSource = await trx(SOURCES_TABLE)
          .where("id", existingDbSource.source_id)
          .first();

        return {
          id: updatedDbSource.id,
          source_id: updatedDbSource.source_id,
          name: updatedSource.name,
          description: updatedSource.description,
          db_host: updatedDbSource.db_host,
          db_port: updatedDbSource.db_port,
          db_user: updatedDbSource.db_user,
          db_name: updatedDbSource.db_name,
          schema_name: updatedDbSource.schema_name,
          connection_tested: updatedDbSource.connection_tested || false,
          last_connection_test: updatedDbSource.last_connection_test,
          last_connection_error: updatedDbSource.last_connection_error,
          status: updatedSource.status,
          is_embedded: updatedSource.is_embedded,
          created_at: updatedSource.created_at,
          updated_at: updatedSource.updated_at,
        };
      });
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Failed to update database source: ${error.message}`
      );
    }
  }
}

export default DatabaseSourceService;
