CREATE TABLE "wqi_standards" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"sn" numeric(10, 3) NOT NULL,
	"vo" numeric(10, 3) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp,
	CONSTRAINT "wqi_standards_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "calculation_status" text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "calculation_upload_id" integer;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "calculation_error" text;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "calculation_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "calculated_indices" jsonb;--> statement-breakpoint
CREATE INDEX "wqi_standards_symbol_idx" ON "wqi_standards" USING btree ("symbol","is_deleted");--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_calculation_upload_id_uploads_id_fk" FOREIGN KEY ("calculation_upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_sources_calculation_status_idx" ON "data_sources" USING btree ("calculation_status");