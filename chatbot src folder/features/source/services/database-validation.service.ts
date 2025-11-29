import { logger } from "../../../utils/logger";
import HttpException from "../../../exceptions/HttpException";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class DatabaseValidationService {
  /**
   * Validate PostgreSQL connection string format
   */
  public validateConnectionString(connectionString: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Basic format validation
      const postgresUrlRegex =
        /^postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)(\?.*)?$/;
      const match = connectionString.match(postgresUrlRegex);

      if (!match) {
        result.isValid = false;
        result.errors.push(
          "Invalid PostgreSQL connection string format. Expected: postgresql://username:password@host:port/database"
        );
        return result;
      }

      const [, username, password, host, portStr, database, queryParams] =
        match;

      // Validate components
      if (!username || username.length === 0) {
        result.errors.push("Username cannot be empty in connection string");
      }

      if (!password || password.length === 0) {
        result.errors.push("Password cannot be empty in connection string");
      }

      if (!host || host.length === 0) {
        result.errors.push("Host cannot be empty in connection string");
      }

      const port = parseInt(portStr);
      if (isNaN(port) || port < 1 || port > 65535) {
        result.errors.push("Port must be a valid number between 1 and 65535");
      }

      if (!database || database.length === 0) {
        result.errors.push(
          "Database name cannot be empty in connection string"
        );
      }

      // Check for common security issues
      if (
        password === "password" ||
        password === "123456" ||
        password === "admin"
      ) {
        result.warnings.push(
          "Using a common password is not recommended for security"
        );
      }

      if (host === "localhost" || host === "127.0.0.1") {
        result.warnings.push(
          "Using localhost may not work in all deployment environments"
        );
      }

      // Check for SSL parameters
      if (queryParams) {
        const params = new URLSearchParams(queryParams.substring(1));
        if (!params.has("sslmode") && !params.has("ssl")) {
          result.warnings.push(
            "Consider using SSL connection for production databases"
          );
        }
      } else {
        result.warnings.push(
          "Consider using SSL connection for production databases"
        );
      }

      result.isValid = result.errors.length === 0;
      return result;
    } catch (error: any) {
      logger.error("❌ Connection string validation error:", error);
      return {
        isValid: false,
        errors: [`Failed to validate connection string: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Validate database configuration object
   */
  public validateDatabaseConfig(config: {
    db_host: string;
    db_port: number;
    db_user: string;
    db_password: string;
    db_name: string;
    schema_name?: string;
  }): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Host validation
    if (!config.db_host || config.db_host.trim().length === 0) {
      result.errors.push("Database host is required");
    } else if (config.db_host.length > 255) {
      result.errors.push("Database host must be 255 characters or less");
    } else if (!/^[a-zA-Z0-9\-\.]+$/.test(config.db_host)) {
      result.errors.push("Database host contains invalid characters");
    }

    // Port validation
    if (!config.db_port || isNaN(config.db_port)) {
      result.errors.push("Database port must be a valid number");
    } else if (config.db_port < 1 || config.db_port > 65535) {
      result.errors.push("Database port must be between 1 and 65535");
    } else if (config.db_port !== 5432) {
      result.warnings.push(
        `Non-standard PostgreSQL port (${config.db_port}). Standard port is 5432`
      );
    }

    // Username validation
    if (!config.db_user || config.db_user.trim().length === 0) {
      result.errors.push("Database username is required");
    } else if (config.db_user.length > 63) {
      result.errors.push("Database username must be 63 characters or less");
    } else if (!/^[a-zA-Z0-9_.@-]+$/.test(config.db_user)) {
      result.errors.push(
        "Database username can only contain letters, numbers, dots, underscores, @ symbols, and hyphens"
      );
    } else if (config.db_user === "postgres" || config.db_user === "root") {
      result.warnings.push(
        "Using superuser accounts is not recommended for application connections"
      );
    }

    // Password validation
    if (!config.db_password || config.db_password.length === 0) {
      result.errors.push("Database password is required");
    } else if (config.db_password.length < 8) {
      result.warnings.push(
        "Database password should be at least 8 characters long"
      );
    } else if (
      ["password", "123456", "admin", "postgres"].includes(
        config.db_password.toLowerCase()
      )
    ) {
      result.warnings.push(
        "Using a common password is not recommended for security"
      );
    }

    // Database name validation
    if (!config.db_name || config.db_name.trim().length === 0) {
      result.errors.push("Database name is required");
    } else if (config.db_name.length > 63) {
      result.errors.push("Database name must be 63 characters or less");
    } else if (!/^[a-zA-Z0-9_.]+$/.test(config.db_name)) {
      result.errors.push(
        "Database name can only contain letters, numbers, dots, and underscores"
      );
    } else if (!isNaN(parseInt(config.db_name.charAt(0)))) {
      result.errors.push("Database name cannot start with a number");
    }

    // Schema validation (if provided)
    if (config.schema_name) {
      if (config.schema_name.length > 63) {
        result.errors.push("Schema name must be 63 characters or less");
      } else if (!/^[a-zA-Z0-9_]+$/.test(config.schema_name)) {
        result.errors.push(
          "Schema name can only contain letters, numbers, and underscores"
        );
      } else if (!isNaN(parseInt(config.schema_name.charAt(0)))) {
        result.errors.push("Schema name cannot start with a number");
      } else if (
        config.schema_name === "information_schema" ||
        config.schema_name === "pg_catalog"
      ) {
        result.errors.push("Cannot use system schema names");
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate SQL query for read-only operations
   */
  public validateReadOnlyQuery(sql: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!sql || sql.trim().length === 0) {
      result.errors.push("SQL query cannot be empty");
      result.isValid = false;
      return result;
    }

    const normalizedSql = sql.toLowerCase().trim();

    // Remove comments and normalize whitespace
    const cleanSql = normalizedSql
      .replace(/\/\*[\s\S]*?\*\//g, " ") // Remove /* */ comments
      .replace(/--.*$/gm, " ") // Remove -- comments
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    // Check for forbidden operations
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
      "begin",
      "transaction",
      "savepoint",
      "release",
      "lock",
      "unlock",
      "copy",
      "import",
      "export",
      "call",
      "exec",
      "execute",
      "pragma",
    ];

    const foundForbidden = forbiddenKeywords.filter((keyword) =>
      new RegExp(`\\b${keyword}\\b`, "i").test(cleanSql)
    );

    if (foundForbidden.length > 0) {
      result.errors.push(
        `Forbidden SQL operations detected: ${foundForbidden
          .join(", ")
          .toUpperCase()}`
      );
    }

    // Must start with SELECT (allowing CTE with WITH)
    if (!cleanSql.startsWith("select") && !cleanSql.startsWith("with")) {
      result.errors.push(
        "Only SELECT queries (and CTEs with WITH) are allowed"
      );
    }

    // Check for potentially dangerous functions
    const dangerousFunctions = [
      "pg_read_file",
      "pg_ls_dir",
      "pg_stat_file",
      "dblink",
      "postgres_fdw",
      "file_fdw",
    ];

    const foundDangerous = dangerousFunctions.filter((func) =>
      cleanSql.includes(func.toLowerCase())
    );

    if (foundDangerous.length > 0) {
      result.errors.push(
        `Potentially dangerous functions detected: ${foundDangerous.join(", ")}`
      );
    }

    // Warn about performance concerns
    if (cleanSql.includes("*") && !cleanSql.includes("limit")) {
      result.warnings.push(
        "SELECT * without LIMIT may return large result sets"
      );
    }

    if (
      cleanSql.includes("cross join") ||
      (cleanSql.includes(",") && cleanSql.includes("from"))
    ) {
      result.warnings.push(
        "Cartesian joins may result in very large result sets"
      );
    }

    // Check query length
    if (sql.length > 10000) {
      result.errors.push("Query is too long (maximum 10,000 characters)");
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Generate a connection string from individual components
   */
  public buildConnectionString(config: {
    db_host: string;
    db_port: number;
    db_user: string;
    db_password: string;
    db_name: string;
    ssl?: boolean;
    schema?: string;
  }): string {
    let connectionString = `postgresql://${encodeURIComponent(
      config.db_user
    )}:${encodeURIComponent(config.db_password)}@${config.db_host}:${
      config.db_port
    }/${config.db_name}`;

    const params = new URLSearchParams();

    if (config.ssl) {
      params.append("sslmode", "require");
    }

    if (config.schema) {
      params.append("search_path", config.schema);
    }

    const paramString = params.toString();
    if (paramString) {
      connectionString += `?${paramString}`;
    }

    return connectionString;
  }

  /**
   * Parse connection string into components
   */
  public parseConnectionString(connectionString: string): {
    db_host: string;
    db_port: number;
    db_user: string;
    db_password: string;
    db_name: string;
    ssl?: boolean;
    schema?: string;
  } | null {
    try {
      const postgresUrlRegex =
        /^postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)(\?.*)?$/;
      const match = connectionString.match(postgresUrlRegex);

      if (!match) {
        return null;
      }

      const [, username, password, host, portStr, database, queryParams] =
        match;

      const result = {
        db_host: host,
        db_port: parseInt(portStr),
        db_user: decodeURIComponent(username),
        db_password: decodeURIComponent(password),
        db_name: database,
      } as any;

      if (queryParams) {
        const params = new URLSearchParams(queryParams.substring(1));

        if (params.has("sslmode") && params.get("sslmode") === "require") {
          result.ssl = true;
        }

        if (params.has("search_path")) {
          result.schema = params.get("search_path");
        }
      }

      return result;
    } catch (error) {
      logger.error("❌ Failed to parse connection string:", error);
      return null;
    }
  }
}

export const databaseValidationService = new DatabaseValidationService();
