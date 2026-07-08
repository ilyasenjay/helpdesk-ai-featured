-- Rename domain model tables to lowercase to match the @@map convention used by auth tables
ALTER TABLE "Ticket" RENAME TO "ticket";
ALTER TABLE "Message" RENAME TO "message";
ALTER TABLE "KnowledgeBase" RENAME TO "knowledge_base";
