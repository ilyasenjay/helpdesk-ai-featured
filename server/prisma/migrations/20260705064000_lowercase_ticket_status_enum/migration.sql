-- Rename TicketStatus enum values to lowercase (safe with existing data)
ALTER TYPE "TicketStatus" RENAME VALUE 'OPEN' TO 'open';
ALTER TYPE "TicketStatus" RENAME VALUE 'RESOLVED' TO 'resolved';
ALTER TYPE "TicketStatus" RENAME VALUE 'CLOSED' TO 'closed';

-- Update the column default to match the renamed value
ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'open'::"TicketStatus";
