import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
  Max,
  Matches,
  Length,
  IsBoolean,
} from "class-validator";
import { Transform } from "class-transformer";

/**
 * Enhanced database source DTOs with comprehensive validation
 */

export class DatabaseConnectionDto {
  @IsString()
  @Length(1, 255, { message: "Host must be between 1 and 255 characters" })
  @Matches(/^[a-zA-Z0-9\-\.]+$/, {
    message: "Host contains invalid characters",
  })
  db_host: string;

  @IsNumber({}, { message: "Port must be a valid number" })
  @Min(1, { message: "Port must be at least 1" })
  @Max(65535, { message: "Port must be at most 65535" })
  @Transform(({ value }) => parseInt(value))
  db_port: number;

  @IsString()
  @Length(1, 63, { message: "Username must be between 1 and 63 characters" })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores",
  })
  db_user: string;

  @IsString()
  @Length(1, 255, { message: "Password is required" })
  db_password: string;

  @IsString()
  @Length(1, 63, {
    message: "Database name must be between 1 and 63 characters",
  })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "Database name can only contain letters, numbers, and underscores",
  })
  db_name: string;

  @IsString()
  @IsOptional()
  @Length(1, 63, { message: "Schema name must be between 1 and 63 characters" })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "Schema name can only contain letters, numbers, and underscores",
  })
  schema_name?: string;
}

export class DatabaseConnectionStringDto {
  @IsString()
  @IsOptional()
  @Matches(/^postgresql:\/\/[^:]+:[^@]+@[^:\/]+:[0-9]+\/[^?]+(\?.*)?$/, {
    message: "Connection string must be a valid PostgreSQL URL format",
  })
  connection_string?: string;
}

export class CreateDatabaseSourceDto {
  @IsNumber({}, { message: "Agent ID must be a valid number" })
  @Min(1, { message: "Agent ID must be at least 1" })
  agent_id: number;

  @IsString()
  @Length(1, 255, { message: "Name must be between 1 and 255 characters" })
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000, { message: "Description must be at most 1000 characters" })
  description?: string;

  @IsString()
  @Length(1, 255, { message: "Host must be between 1 and 255 characters" })
  @Matches(/^[a-zA-Z0-9\-\.]+$/, {
    message: "Host contains invalid characters",
  })
  db_host: string;

  @IsNumber({}, { message: "Port must be a valid number" })
  @Min(1, { message: "Port must be at least 1" })
  @Max(65535, { message: "Port must be at most 65535" })
  @Transform(({ value }) => parseInt(value))
  db_port: number;

  @IsString()
  @Length(1, 63, { message: "Username must be between 1 and 63 characters" })
  @Matches(/^[a-zA-Z0-9_.@-]+$/, {
    message:
      "Username can only contain letters, numbers, dots, underscores, @ symbols, and hyphens",
  })
  db_user: string;

  @IsString()
  @Length(1, 255, { message: "Password is required" })
  db_password: string;

  @IsString()
  @Length(1, 63, {
    message: "Database name must be between 1 and 63 characters",
  })
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message:
      "Database name can only contain letters, numbers, dots, and underscores",
  })
  db_name: string;

  @IsString()
  @IsOptional()
  @Matches(/^postgresql:\/\/[^:]+:[^@]+@[^:\/]+:[0-9]+\/[^?]+(\?.*)?$/, {
    message: "Connection string must be a valid PostgreSQL URL format",
  })
  connection_string?: string;

  @IsString()
  @IsOptional()
  @Length(1, 63, { message: "Schema name must be between 1 and 63 characters" })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "Schema name can only contain letters, numbers, and underscores",
  })
  schema_name?: string;

  @IsBoolean()
  @IsOptional()
  test_connection?: boolean; // Whether to test connection during creation
}

export class UpdateDatabaseSourceDto {
  @IsString()
  @IsOptional()
  @Length(1, 255, { message: "Name must be between 1 and 255 characters" })
  name?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000, { message: "Description must be at most 1000 characters" })
  description?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255, { message: "Host must be between 1 and 255 characters" })
  @Matches(/^[a-zA-Z0-9\-\.]+$/, {
    message: "Host contains invalid characters",
  })
  db_host?: string;

  @IsNumber({}, { message: "Port must be a valid number" })
  @IsOptional()
  @Min(1, { message: "Port must be at least 1" })
  @Max(65535, { message: "Port must be at most 65535" })
  @Transform(({ value }) => parseInt(value))
  db_port?: number;

  @IsString()
  @IsOptional()
  @Length(1, 63, { message: "Username must be between 1 and 63 characters" })
  @Matches(/^[a-zA-Z0-9_.@-]+$/, {
    message:
      "Username can only contain letters, numbers, dots, underscores, @ symbols, and hyphens",
  })
  db_user?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255, { message: "Password cannot be empty if provided" })
  db_password?: string;

  @IsString()
  @IsOptional()
  @Length(1, 63, {
    message: "Database name must be between 1 and 63 characters",
  })
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message:
      "Database name can only contain letters, numbers, dots, and underscores",
  })
  db_name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^postgresql:\/\/[^:]+:[^@]+@[^:\/]+:[0-9]+\/[^?]+(\?.*)?$/, {
    message: "Connection string must be a valid PostgreSQL URL format",
  })
  connection_string?: string;

  @IsString()
  @IsOptional()
  @Length(1, 63, { message: "Schema name must be between 1 and 63 characters" })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "Schema name can only contain letters, numbers, and underscores",
  })
  schema_name?: string;

  @IsBoolean()
  @IsOptional()
  test_connection?: boolean; // Whether to test connection during update
}

export class TestDatabaseConnectionDto {
  @IsString()
  @Length(1, 255, { message: "Host must be between 1 and 255 characters" })
  @Matches(/^[a-zA-Z0-9\-\.]+$/, {
    message: "Host contains invalid characters",
  })
  db_host: string;

  @IsNumber({}, { message: "Port must be a valid number" })
  @Min(1, { message: "Port must be at least 1" })
  @Max(65535, { message: "Port must be at most 65535" })
  @Transform(({ value }) => parseInt(value))
  db_port: number;

  @IsString()
  @Length(1, 63, { message: "Username must be between 1 and 63 characters" })
  @Matches(/^[a-zA-Z0-9_.@-]+$/, {
    message:
      "Username can only contain letters, numbers, dots, underscores, @ symbols, and hyphens",
  })
  db_user: string;

  @IsString()
  @Length(1, 255, { message: "Password is required" })
  db_password: string;

  @IsString()
  @Length(1, 63, {
    message: "Database name must be between 1 and 63 characters",
  })
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message:
      "Database name can only contain letters, numbers, dots, and underscores",
  })
  db_name: string;

  @IsString()
  @IsOptional()
  @Length(1, 63, { message: "Schema name must be between 1 and 63 characters" })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "Schema name can only contain letters, numbers, and underscores",
  })
  schema_name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^postgresql:\/\/[^:]+:[^@]+@[^:\/]+:[0-9]+\/[^?]+(\?.*)?$/, {
    message: "Connection string must be a valid PostgreSQL URL format",
  })
  connection_string?: string;
}
