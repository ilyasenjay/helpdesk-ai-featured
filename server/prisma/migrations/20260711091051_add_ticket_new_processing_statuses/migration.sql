-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketStatus" ADD VALUE 'new';
ALTER TYPE "TicketStatus" ADD VALUE 'processing';

-- AlterTable
ALTER TABLE "knowledge_base" RENAME CONSTRAINT "KnowledgeBase_pkey" TO "knowledge_base_pkey";

-- AlterTable
ALTER TABLE "message" RENAME CONSTRAINT "Message_pkey" TO "message_pkey";

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "resolvedByAi" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "status" SET DEFAULT 'new';

-- RenameForeignKey
ALTER TABLE "message" RENAME CONSTRAINT "Message_userId_fkey" TO "message_userId_fkey";
