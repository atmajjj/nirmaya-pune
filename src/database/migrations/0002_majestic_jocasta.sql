ALTER TABLE "invitation" RENAME COLUMN "password" TO "temp_password_encrypted";--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "password_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "verify_attempts" integer DEFAULT 0 NOT NULL;