-- Changing ticket.id from text/cuid to serial integer requires clearing incompatible data
TRUNCATE TABLE "message" CASCADE;
TRUNCATE TABLE "ticket" CASCADE;

-- Drop FK before altering the referenced column
ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "Message_ticketId_fkey";

-- Rebuild ticket PK as auto-increment integer
-- DROP COLUMN CASCADE removes the PK constraint regardless of its name
ALTER TABLE "ticket" DROP COLUMN "id" CASCADE;
ALTER TABLE "ticket" ADD COLUMN "id" SERIAL PRIMARY KEY;

-- Add required senderName (table is empty after TRUNCATE so no backfill needed)
ALTER TABLE "ticket" ADD COLUMN "senderName" TEXT NOT NULL;

-- Change message FK column from text to integer
ALTER TABLE "message" DROP COLUMN "ticketId";
ALTER TABLE "message" ADD COLUMN "ticketId" INTEGER NOT NULL;

-- Restore FK constraint
ALTER TABLE "message" ADD CONSTRAINT "message_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
