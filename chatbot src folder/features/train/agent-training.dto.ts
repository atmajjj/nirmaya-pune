import { IsBoolean, IsOptional } from "class-validator";

export class TrainAgentDto {
  @IsBoolean()
  @IsOptional()
  forceRetrain?: boolean;

  @IsBoolean()
  @IsOptional()
  cleanupExisting?: boolean;
}
