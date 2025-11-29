-- Drop the old vector_ids column and add new is_embedded boolean
ALTER TABLE "chatbot_documents" DROP COLUMN IF EXISTS "vector_ids";
ALTER TABLE "chatbot_documents" ADD COLUMN "is_embedded" boolean DEFAULT false NOT NULL;