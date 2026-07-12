-- AlterTable
ALTER TABLE "ticket" ADD COLUMN "gmailMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ticket_gmailMessageId_key" ON "ticket"("gmailMessageId");
