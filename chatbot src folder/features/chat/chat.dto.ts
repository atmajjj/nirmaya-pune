import "reflect-metadata";
import {
  IsArray,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  IsNumber,
  IsIn,
  IsBoolean,
} from "class-validator";

export class LegacyChatDto {
  @IsArray()
  @ArrayNotEmpty()
  messages: any[];

  @IsOptional()
  @IsString()
  model?: string;
}

export class AgentChatDto {
  @IsArray()
  @ArrayNotEmpty()
  messages: any[];

  @IsOptional()
  @IsString()
  sessionId?: string; // Optional: continue in existing session or create new one

  @IsOptional()
  @IsString()
  @IsIn(['auto', 'file', 'text', 'website', 'database', 'qa'])
  sourceSelection?: 'auto' | 'file' | 'text' | 'website' | 'database' | 'qa'; // Optional: filter context by source type

  @IsOptional()
  @IsString()
  @IsIn(['simple_hybrid', 'pinecone_hybrid', 'semantic_only'])
  searchStrategy?: 'simple_hybrid' | 'pinecone_hybrid' | 'semantic_only'; // Optional: search strategy selection

  @IsOptional()
  @IsBoolean()
  enableReranking?: boolean; // Optional: enable reranking for hybrid search

  @IsOptional()
  @IsString()
  rerankModel?: string; // Optional: specific reranking model
}

export class CreateSessionDto {
  @IsNumber()
  agentId: number;
}

export class ChatSessionParamsDto {
  @IsString()
  sessionId: string;
}
