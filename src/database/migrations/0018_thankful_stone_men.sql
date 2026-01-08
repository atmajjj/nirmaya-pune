ALTER TABLE "water_quality_calculations" ADD COLUMN "wqi" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD COLUMN "wqi_classification" varchar(50);--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD COLUMN "params_analyzed" text;