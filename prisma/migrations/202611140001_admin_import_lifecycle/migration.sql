ALTER TABLE "Project" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Project" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "DecisionEvent" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Not verified';
ALTER TABLE "DecisionEvent" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ReviewRecord" ADD COLUMN "snapshot" TEXT;
CREATE TABLE "DocumentImport" ("id" TEXT NOT NULL PRIMARY KEY, "filename" TEXT NOT NULL, "pages" TEXT NOT NULL, "extraction" TEXT, "model" TEXT, "requestId" TEXT, "usage" TEXT, "projectId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
