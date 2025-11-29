import knex, { Knex } from "knex";
import { logger } from "./logger";

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  schema?: string;
  connectionString?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  serverVersion?: string;
  error?: string;
}

export interface DatabaseSchemaInfo {
  tables: Array<{
    name: string;
    schema: string;
    rowCount?: number;
    size?: string;
  }>;
  schemas: string[];
}

export class DatabaseConnectionService {
  private connections: Map<string, Knex> = new Map();
  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_CONNECTIONS = 2; // Keep it low for external DBs
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  /**
   * Create a unique connection key for a database configuration
   */
  private createConnectionKey(config: DatabaseConfig): string {
    return `${config.host}:${config.port}:${config.database}:${config.user}`;
  }

  /**
   * Create a Knex configuration object from DatabaseConfig
   */
  private createKnexConfig(config: DatabaseConfig): Knex.Config {
    const knexConfig: Knex.Config = {
      client: "pg",
      connection: config.connectionString || {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: false, // We'll make this configurable later
        connectionTimeoutMillis: this.CONNECTION_TIMEOUT,
        query_timeout: this.CONNECTION_TIMEOUT,
      },
      pool: {
        min: 0,
        max: this.MAX_CONNECTIONS,
        createTimeoutMillis: this.CONNECTION_TIMEOUT,
        acquireTimeoutMillis: this.CONNECTION_TIMEOUT,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
      },
      acquireConnectionTimeout: this.CONNECTION_TIMEOUT,
      searchPath: config.schema ? [config.schema] : ["public"],
    };

    return knexConfig;
  }

  /**
   * Get or create a connection to the database
   */
  public async getConnection(config: DatabaseConfig): Promise<Knex> {
    const connectionKey = this.createConnectionKey(config);

    if (this.connections.has(connectionKey)) {
      const existingConnection = this.connections.get(connectionKey)!;

      // Test if connection is still alive
      try {
        await existingConnection.raw("SELECT 1");
        return existingConnection;
      } catch (error) {
        logger.warn(
          `🔄 Existing connection failed, creating new one: ${error}`
        );
        await this.closeConnection(connectionKey);
      }
    }

    // Create new connection
    const knexConfig = this.createKnexConfig(config);
    const connection = knex(knexConfig);

    // Test connection before storing
    await this.testConnectionRaw(connection);

    this.connections.set(connectionKey, connection);
    logger.info(`✅ New database connection established: ${connectionKey}`);

    return connection;
  }

  /**
   * Test database connection with detailed information
   */
  public async testConnection(
    config: DatabaseConfig
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    let connection: Knex | null = null;

    try {
      const knexConfig = this.createKnexConfig(config);
      connection = knex(knexConfig);

      // Test basic connectivity
      await this.testConnectionRaw(connection);

      // Get server version
      const versionResult = await connection.raw("SELECT version()");
      const serverVersion = versionResult.rows[0]?.version || "Unknown";

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: "Connection successful",
        responseTime,
        serverVersion,
      };
    } catch (error: any) {
      logger.error(`❌ Database connection test failed:`, error);

      return {
        success: false,
        message: "Connection failed",
        responseTime: Date.now() - startTime,
        error: this.getConnectionErrorMessage(error),
      };
    } finally {
      if (connection) {
        await connection.destroy();
      }
    }
  }

  /**
   * Test connection with retry mechanism
   */
  public async testConnectionWithRetry(
    config: DatabaseConfig
  ): Promise<ConnectionTestResult> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        logger.info(`🔄 Connection attempt ${attempt}/${this.RETRY_ATTEMPTS}`);
        const result = await this.testConnection(config);

        if (result.success) {
          return result;
        }

        lastError = result.error;
      } catch (error) {
        lastError = error;
        logger.warn(`⚠️ Connection attempt ${attempt} failed:`, error);
      }

      if (attempt < this.RETRY_ATTEMPTS) {
        await this.delay(this.RETRY_DELAY * attempt); // Exponential backoff
      }
    }

    return {
      success: false,
      message: `Connection failed after ${this.RETRY_ATTEMPTS} attempts`,
      error: lastError,
    };
  }

  /**
   * Execute a raw SQL query with safety checks
   */
  public async executeQuery(config: DatabaseConfig, sql: string): Promise<any> {
    // Validate SQL for read-only operations
    this.validateReadOnlyQuery(sql);

    const connection = await this.getConnection(config);

    try {
      logger.info(`🔍 Executing query: ${sql.substring(0, 100)}...`);
      const result = await connection.raw(sql);

      logger.info(
        `✅ Query executed successfully, rows: ${result.rows?.length || 0}`
      );
      return result;
    } catch (error: any) {
      logger.error(`❌ Query execution failed:`, error);
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Get database schema information
   */
  public async getDatabaseSchema(
    config: DatabaseConfig
  ): Promise<DatabaseSchemaInfo> {
    const connection = await this.getConnection(config);

    try {
      // Get all schemas
      const schemasResult = await connection.raw(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name
      `);

      const schemas = schemasResult.rows.map((row: any) => row.schema_name);

      // Get all tables with basic info
      const tablesResult = await connection.raw(`
        SELECT 
          t.table_schema,
          t.table_name,
          pg_size_pretty(pg_total_relation_size(c.oid)) as size,
          c.reltuples::bigint as estimated_rows
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        WHERE t.table_type = 'BASE TABLE'
          AND t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY t.table_schema, t.table_name
      `);

      const tables = tablesResult.rows.map((row: any) => ({
        name: row.table_name,
        schema: row.table_schema,
        rowCount: row.estimated_rows,
        size: row.size,
      }));

      return { schemas, tables };
    } catch (error: any) {
      logger.error(`❌ Schema introspection failed:`, error);
      throw new Error(`Schema introspection failed: ${error.message}`);
    }
  }

  /**
   * Get detailed table information
   */
  public async getTableInfo(
    config: DatabaseConfig,
    schema: string,
    tableName: string
  ): Promise<any> {
    const connection = await this.getConnection(config);

    try {
      // Get column information
      const columnsResult = await connection.raw(
        `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position
      `,
        [schema, tableName]
      );

      // Get foreign key information
      const foreignKeysResult = await connection.raw(
        `
        SELECT
          kcu.column_name,
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = ?
          AND tc.table_name = ?
      `,
        [schema, tableName]
      );

      return {
        columns: columnsResult.rows,
        foreignKeys: foreignKeysResult.rows,
      };
    } catch (error: any) {
      logger.error(`❌ Table introspection failed:`, error);
      throw new Error(`Table introspection failed: ${error.message}`);
    }
  }

  /**
   * Close a specific connection
   */
  public async closeConnection(connectionKey: string): Promise<void> {
    const connection = this.connections.get(connectionKey);
    if (connection) {
      await connection.destroy();
      this.connections.delete(connectionKey);
      logger.info(`🔒 Connection closed: ${connectionKey}`);
    }
  }

  /**
   * Close all connections
   */
  public async closeAllConnections(): Promise<void> {
    const promises = Array.from(this.connections.entries()).map(
      async ([key, connection]) => {
        await connection.destroy();
        logger.info(`🔒 Connection closed: ${key}`);
      }
    );

    await Promise.all(promises);
    this.connections.clear();
    logger.info("🔒 All database connections closed");
  }

  /**
   * Private helper methods
   */
  private async testConnectionRaw(connection: Knex): Promise<void> {
    await connection.raw("SELECT 1");
  }

  private validateReadOnlyQuery(sql: string): void {
    const normalizedSql = sql.toLowerCase().trim();

    // List of forbidden operations
    const forbiddenKeywords = [
      "insert",
      "update",
      "delete",
      "drop",
      "create",
      "alter",
      "truncate",
      "grant",
      "revoke",
      "commit",
      "rollback",
    ];

    for (const keyword of forbiddenKeywords) {
      if (normalizedSql.includes(keyword)) {
        throw new Error(
          `Forbidden SQL operation detected: ${keyword.toUpperCase()}`
        );
      }
    }

    // Must start with SELECT (allowing comments and whitespace)
    const sqlStart = normalizedSql
      .replace(/^\/\*.*?\*\/\s*/, "")
      .replace(/^--.*?\n\s*/, "");
    if (!sqlStart.startsWith("select")) {
      throw new Error("Only SELECT queries are allowed");
    }
  }

  private getConnectionErrorMessage(error: any): string {
    if (error.code === "ECONNREFUSED") {
      return "Connection refused. Please check if the database server is running and accessible.";
    }
    if (error.code === "ENOTFOUND") {
      return "Host not found. Please check the database host address.";
    }
    if (error.code === "28P01") {
      return "Authentication failed. Please check username and password.";
    }
    if (error.code === "3D000") {
      return "Database does not exist. Please check the database name.";
    }
    if (error.code === "ETIMEDOUT") {
      return "Connection timeout. Please check network connectivity and firewall settings.";
    }

    return error.message || "Unknown connection error";
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const databaseConnectionService = new DatabaseConnectionService();

// Graceful shutdown handler
process.on("SIGINT", async () => {
  logger.info("🛑 Shutting down database connections...");
  await databaseConnectionService.closeAllConnections();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("🛑 Shutting down database connections...");
  await databaseConnectionService.closeAllConnections();
  process.exit(0);
});
