import "reflect-metadata";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDate,
  IsUrl,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateSourceDto {
  @IsNumber()
  agent_id: number;

  @IsString()
  source_type: "file" | "text" | "website" | "database" | "qa";

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSourceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: "pending" | "processing" | "completed" | "failed";

  @IsOptional()
  is_embedded?: boolean;
}

export class FileSourceDto {
  @IsNumber()
  id: number;

  @IsNumber()
  source_id: number;

  @IsString()
  file_url: string;

  @IsString()
  @IsOptional()
  mime_type?: string;

  @IsNumber()
  file_size: number;

  @IsString()
  @IsOptional()
  text_content?: string;
}

export class UpdateFileSourceDto {
  @IsString()
  @IsOptional()
  file_url?: string;

  @IsString()
  @IsOptional()
  mime_type?: string;

  @IsNumber()
  @IsOptional()
  file_size?: number;

  @IsString()
  @IsOptional()
  text_content?: string;
}

export class CreateMultipleFilesSourceDto {
  @IsNumber()
  agent_id: number;

  @IsArray()
  @IsString({ each: true })
  names: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  descriptions?: string[];
}

export class TextSourceDto {
  @IsNumber()
  id: number;

  @IsNumber()
  source_id: number;

  @IsString()
  content: string;
}

export class CreateTextSourceDto {
  @IsNumber()
  agent_id: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  content: string;
}

export class UpdateTextSourceDto {
  @IsString()
  @IsOptional()
  content?: string;
}

export class WebsiteSourceDto {
  @IsNumber()
  id: number;

  @IsNumber()
  source_id: number;

  @IsUrl()
  url: string;

  @IsNumber()
  crawl_depth: number;
}

export class CreateWebsiteSourceDto {
  @IsNumber()
  agent_id: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  url: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  crawl_depth?: number;
}

export class UpdateWebsiteSourceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  url?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  crawl_depth?: number;
}

export class DatabaseSourceDto {
  @IsNumber()
  id: number;

  @IsNumber()
  source_id: number;

  @IsString()
  db_host: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  db_port: number;

  @IsString()
  db_user: string;

  @IsString()
  db_password: string;

  @IsString()
  db_name: string;

  @IsString()
  connection_string: string;

  @IsString()
  @IsOptional()
  schema_name?: string;
}

export class CreateDatabaseSourceDto {
  @IsNumber()
  agent_id: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  db_host: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  db_port: number;

  @IsString()
  db_user: string;

  @IsString()
  db_password: string;

  @IsString()
  db_name: string;

  @IsString()
  connection_string: string;

  @IsString()
  @IsOptional()
  schema_name?: string;
}

export class UpdateDatabaseSourceDto {
  @IsString()
  @IsOptional()
  db_host?: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  db_port?: number;

  @IsString()
  @IsOptional()
  db_user?: string;

  @IsString()
  @IsOptional()
  db_password?: string;

  @IsString()
  @IsOptional()
  db_name?: string;

  @IsString()
  @IsOptional()
  connection_string?: string;

  @IsString()
  @IsOptional()
  schema_name?: string;
}

class QAPair {
  @IsString()
  question: string;

  @IsString()
  answer: string;
}

export class QASourceDto {
  @IsNumber()
  id: number;

  @IsNumber()
  source_id: number;

  @IsString()
  question: string;

  @IsString()
  answer: string;
}

export class CreateQASourceDto {
  @IsNumber()
  agent_id: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QAPair)
  qa_pairs: QAPair[];
}

export class UpdateQASourceDto {
  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  @IsOptional()
  answer?: string;
}
