CREATE TABLE "formulas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"version" varchar(50),
	"parameters" jsonb NOT NULL,
	"classification" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "formulas_type_is_deleted_idx" ON "formulas" USING btree ("type","is_deleted");--> statement-breakpoint
CREATE INDEX "formulas_is_default_type_idx" ON "formulas" USING btree ("is_default","type","is_deleted");--> statement-breakpoint
CREATE INDEX "formulas_name_is_deleted_idx" ON "formulas" USING btree ("name","is_deleted");--> statement-breakpoint
CREATE INDEX "formulas_is_active_idx" ON "formulas" USING btree ("is_active","is_deleted");