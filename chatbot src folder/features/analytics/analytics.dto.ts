import { IsOptional, IsString, IsInt, IsNumber, IsDateString } from "class-validator";

/**
 * Track Interaction DTO
 */
export class TrackInteractionDto {
  @IsString()
  interactionType: string;

  @IsOptional()
  @IsInt()
  targetId?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Track Feature Usage DTO
 */
export class TrackFeatureUsageDto {
  @IsString()
  featureName: string;

  @IsOptional()
  featureData?: Record<string, any>;
}

/**
 * Analytics Query DTOs for validation
 */
export class AnalyticsEngagementQueryDto {
  @IsOptional()
  @IsInt()
  days?: number;
}

export class AnalyticsBehaviorInsightsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  limit?: number;
}

export class AnalyticsRetentionQueryDto {
  @IsOptional()
  @IsDateString()
  cohortDate?: string;

  @IsOptional()
  @IsInt()
  days?: number;
}

export class AnalyticsActivityQueryDto {
  @IsOptional()
  @IsInt()
  days?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}