-- Rename Role enum values to lowercase
ALTER TYPE "Role" RENAME VALUE 'ADMIN' TO 'admin';
ALTER TYPE "Role" RENAME VALUE 'AGENT' TO 'agent';

-- Add role column to user table (with default agent)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'agent';
