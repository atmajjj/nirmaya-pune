ALTER TABLE "invitation" RENAME COLUMN "invitation_id" TO "id";--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "first_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "last_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "invite_token" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "uploads" ALTER COLUMN "filename" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "uploads" ALTER COLUMN "original_filename" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "uploads" ALTER COLUMN "mime_type" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_number" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "deleted_by" integer;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_invite_token_idx" ON "invitation" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "invitation_email_is_deleted_idx" ON "invitation" USING btree ("email","is_deleted");--> statement-breakpoint
CREATE INDEX "invitation_status_is_deleted_idx" ON "invitation" USING btree ("status","is_deleted");--> statement-breakpoint
CREATE INDEX "invitation_expires_at_idx" ON "invitation" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "invitation_invited_by_idx" ON "invitation" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "users_email_is_deleted_idx" ON "users" USING btree ("email","is_deleted");--> statement-breakpoint
CREATE INDEX "users_role_is_deleted_idx" ON "users" USING btree ("role","is_deleted");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");