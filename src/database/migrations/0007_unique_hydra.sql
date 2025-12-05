CREATE TABLE "water_quality_calculations" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" integer NOT NULL,
	"station_id" varchar(255) NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"state" varchar(100),
	"city" varchar(100),
	"hpi" numeric(10, 4),
	"hpi_classification" varchar(50),
	"mi" numeric(10, 4),
	"mi_classification" varchar(50),
	"mi_class" varchar(15),
	"wqi" numeric(10, 4),
	"wqi_classification" varchar(50),
	"metals_analyzed" text,
	"wqi_params_analyzed" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD CONSTRAINT "water_quality_calculations_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_quality_calculations" ADD CONSTRAINT "water_quality_calculations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wqc_upload_id_is_deleted_idx" ON "water_quality_calculations" USING btree ("upload_id","is_deleted");--> statement-breakpoint
CREATE INDEX "wqc_station_id_idx" ON "water_quality_calculations" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "wqc_state_city_idx" ON "water_quality_calculations" USING btree ("state","city");--> statement-breakpoint
CREATE INDEX "wqc_created_at_idx" ON "water_quality_calculations" USING btree ("created_at");