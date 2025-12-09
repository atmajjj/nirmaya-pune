CREATE TABLE "policymaker_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"calculation_id" integer NOT NULL,
	"alert_type" varchar(20) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"station_id" varchar(255) NOT NULL,
	"state" varchar(100),
	"district" varchar(100),
	"location" varchar(255),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"hpi_value" numeric(10, 4),
	"hpi_classification" varchar(50),
	"mi_value" numeric(10, 4),
	"mi_classification" varchar(50),
	"wqi_value" numeric(10, 4),
	"wqi_classification" varchar(50),
	"risk_level" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"recommendations" text,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"resolution_notes" text,
	"resolved_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "policymaker_alerts" ADD CONSTRAINT "policymaker_alerts_calculation_id_water_quality_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."water_quality_calculations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policymaker_alerts" ADD CONSTRAINT "policymaker_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policymaker_alerts" ADD CONSTRAINT "policymaker_alerts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pa_status_idx" ON "policymaker_alerts" USING btree ("status","is_deleted");--> statement-breakpoint
CREATE INDEX "pa_severity_idx" ON "policymaker_alerts" USING btree ("severity","is_deleted");--> statement-breakpoint
CREATE INDEX "pa_state_district_idx" ON "policymaker_alerts" USING btree ("state","district");--> statement-breakpoint
CREATE INDEX "pa_risk_level_idx" ON "policymaker_alerts" USING btree ("risk_level","is_deleted");--> statement-breakpoint
CREATE INDEX "pa_calculation_idx" ON "policymaker_alerts" USING btree ("calculation_id");--> statement-breakpoint
CREATE INDEX "pa_created_at_idx" ON "policymaker_alerts" USING btree ("created_at");