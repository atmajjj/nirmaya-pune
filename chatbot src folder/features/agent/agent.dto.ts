import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsIn,
  Min,
  Max,
  MinLength,
} from "class-validator";

export class CreateAgentDto {
  @IsString()
  @MinLength(1, { message: "Agent name is required" })
  name: string;

  @IsString()
  provider: string;

  @IsString()
  @MinLength(1, { message: "API key is required" })
  api_key: string; // This will be encrypted before storage

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: "System prompt cannot be empty if provided" })
  system_prompt?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  is_active?: number;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "Agent name cannot be empty" })
  name?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: "API key cannot be empty" })
  api_key?: string; // This will be encrypted before storage

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: "System prompt cannot be empty if provided" })
  system_prompt?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  is_active?: number;
}

export class AgentParamsDto {
  @IsString()
  id: string;
}
