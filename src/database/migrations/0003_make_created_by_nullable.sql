-- Migration: Make created_by nullable for self-referential user creation
-- The first user (or any user registering) cannot reference themselves on initial insert
-- The register flow: INSERT user → UPDATE with created_by = user.id

ALTER TABLE "users" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "uploads" ALTER COLUMN "created_by" DROP NOT NULL;
