CREATE TABLE "data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"file_type" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" bigint NOT NULL,
	"file_path" text NOT NULL,
	"file_url" text NOT NULL,
	"uploaded_by" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"description" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_sources_uploaded_by_is_deleted_idx" ON "data_sources" USING btree ("uploaded_by","is_deleted");--> statement-breakpoint
CREATE INDEX "data_sources_status_is_deleted_idx" ON "data_sources" USING btree ("status","is_deleted");--> statement-breakpoint
CREATE INDEX "data_sources_file_type_idx" ON "data_sources" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "data_sources_created_at_idx" ON "data_sources" USING btree ("created_at");