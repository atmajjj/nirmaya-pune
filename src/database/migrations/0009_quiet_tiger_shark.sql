CREATE TABLE "hmpi_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" integer NOT NULL,
	"report_title" varchar(255) NOT NULL,
	"report_type" text DEFAULT 'comprehensive' NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" bigint NOT NULL,
	"total_stations" integer NOT NULL,
	"avg_hpi" text,
	"avg_mi" text,
	"avg_wqi" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"generated_at" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "hmpi_reports" ADD CONSTRAINT "hmpi_reports_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmpi_reports" ADD CONSTRAINT "hmpi_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmpi_reports" ADD CONSTRAINT "hmpi_reports_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmpi_reports" ADD CONSTRAINT "hmpi_reports_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hmpi_reports_upload_id_idx" ON "hmpi_reports" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "hmpi_reports_status_idx" ON "hmpi_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hmpi_reports_created_by_idx" ON "hmpi_reports" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "hmpi_reports_created_at_idx" ON "hmpi_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "hmpi_reports_is_deleted_idx" ON "hmpi_reports" USING btree ("is_deleted");