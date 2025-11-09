CREATE TABLE "invitation" (
	"invitation_id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"invite_token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_role" text,
	"password" text,
	"invited_by" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "invitation_email_unique" UNIQUE("email")
);
