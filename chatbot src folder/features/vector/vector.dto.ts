import "reflect-metadata";
import { IsString, IsOptional, IsArray, IsNotEmpty } from "class-validator";

export class FetchVectorsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];

  @IsOptional()
  @IsString()
  namespace?: string;
}

export class DeleteVectorsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];

  @IsOptional()
  @IsString()
  namespace?: string;

  @IsOptional()
  filter?: Record<string, any>;
}

// Removed: ListVectorIdsDto

export class BatchUpsertRecordDto {
  @IsString()
  @IsNotEmpty()
  _id: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class BatchUpsertDto {
  @IsArray()
  @IsNotEmpty()
  records: BatchUpsertRecordDto[];
}
