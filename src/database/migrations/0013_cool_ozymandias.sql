ALTER TABLE "water_quality_calculations" ADD COLUMN "sno" integer;--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD COLUMN "district" varchar(100);--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD COLUMN "location" varchar(255);--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD COLUMN "year" integer;--> statement-breakpoint
ALTER TABLE "water_quality_calculations" DROP COLUMN "cdeg";--> statement-breakpoint
ALTER TABLE "water_quality_calculations" DROP COLUMN "cdeg_classification";--> statement-breakpoint
ALTER TABLE "water_quality_calculations" DROP COLUMN "hei";--> statement-breakpoint
ALTER TABLE "water_quality_calculations" DROP COLUMN "hei_classification";--> statement-breakpoint
ALTER TABLE "water_quality_calculations" DROP COLUMN "pig";--> statement-breakpoint
ALTER TABLE "water_quality_calculations" DROP COLUMN "pig_classification";