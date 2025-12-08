ALTER TABLE "water_quality_calculations" ADD COLUMN "cdeg" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD COLUMN "cdeg_classification" varchar(50);--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD COLUMN "hei" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD COLUMN "hei_classification" varchar(50);--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD COLUMN "pig" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD COLUMN "pig_classification" varchar(50);