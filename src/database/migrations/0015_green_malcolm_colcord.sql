DROP INDEX "metal_standards_is_active_idx";--> statement-breakpoint
DROP INDEX "wqi_standards_is_active_idx";--> statement-breakpoint
ALTER TABLE "metal_standards" DROP COLUMN "unit";--> statement-breakpoint
ALTER TABLE "metal_standards" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "metal_standards" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "wqi_standards" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "wqi_standards" DROP COLUMN "is_active";