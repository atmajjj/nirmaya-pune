DROP TABLE "wqi_standards" CASCADE;--> statement-breakpoint
ALTER TABLE "water_quality_calculations" DROP COLUMN "wqi";--> statement-breakpoint
ALTER TABLE "water_quality_calculations" DROP COLUMN "wqi_classification";--> statement-breakpoint
ALTER TABLE "water_quality_calculations" DROP COLUMN "wqi_params_analyzed";