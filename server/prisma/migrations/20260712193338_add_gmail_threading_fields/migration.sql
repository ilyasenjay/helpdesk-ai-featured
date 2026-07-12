-- AlterTable
ALTER TABLE "ticket" ADD COLUMN "gmailThreadId" TEXT;
ALTER TABLE "ticket" ADD COLUMN "lastGmailMessageIdHeader" TEXT;

-- AlterTable
ALTER TABLE "message" ADD COLUMN "gmailMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ticket_gmailThreadId_key" ON "ticket"("gmailThreadId");
CREATE UNIQUE INDEX "message_gmailMessageId_key" ON "message"("gmailMessageId");
