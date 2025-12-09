CREATE TABLE "metal_standards" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"si" numeric(10, 3) NOT NULL,
	"ii" numeric(10, 3) NOT NULL,
	"mac" numeric(10, 3) NOT NULL,
	"unit" varchar(20) DEFAULT 'ppb' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" integer,
	"deleted_at" timestamp,
	CONSTRAINT "metal_standards_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "wqi_standards" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"sn" numeric(10, 3) NOT NULL,
	"vo" numeric(10, 3) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
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
DROP TABLE "formulas" CASCADE;--> statement-breakpoint
CREATE INDEX "metal_standards_symbol_idx" ON "metal_standards" USING btree ("symbol","is_deleted");--> statement-breakpoint
CREATE INDEX "metal_standards_is_active_idx" ON "metal_standards" USING btree ("is_active","is_deleted");--> statement-breakpoint
CREATE INDEX "wqi_standards_symbol_idx" ON "wqi_standards" USING btree ("symbol","is_deleted");--> statement-breakpoint
CREATE INDEX "wqi_standards_is_active_idx" ON "wqi_standards" USING btree ("is_active","is_deleted");