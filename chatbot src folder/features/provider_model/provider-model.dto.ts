import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProviderModelDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  model_name: string;
}

export class UpdateProviderModelDto {
  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  model_name?: string;
}
