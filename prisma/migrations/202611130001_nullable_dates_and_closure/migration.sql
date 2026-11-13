-- AlterTable
ALTER TABLE "ParticipationWindow" ADD COLUMN "closedOn" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SourceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "date" TEXT,
    "synthetic" BOOLEAN NOT NULL,
    CONSTRAINT "SourceDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SourceDocument" ("date", "id", "projectId", "synthetic", "title", "type", "url") SELECT "date", "id", "projectId", "synthetic", "title", "type", "url" FROM "SourceDocument";
DROP TABLE "SourceDocument";
ALTER TABLE "new_SourceDocument" RENAME TO "SourceDocument";
CREATE INDEX "SourceDocument_projectId_idx" ON "SourceDocument"("projectId");
CREATE TABLE "new_DecisionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "amendment" TEXT NOT NULL,
    "uncertainty" TEXT NOT NULL,
    "date" TEXT,
    "reviewState" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    CONSTRAINT "DecisionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DecisionItem" ("amendment", "authority", "conditions", "date", "explanation", "id", "notes", "projectId", "reviewState", "status", "title", "uncertainty") SELECT "amendment", "authority", "conditions", "date", "explanation", "id", "notes", "projectId", "reviewState", "status", "title", "uncertainty" FROM "DecisionItem";
DROP TABLE "DecisionItem";
ALTER TABLE "new_DecisionItem" RENAME TO "DecisionItem";
CREATE INDEX "DecisionItem_projectId_status_idx" ON "DecisionItem"("projectId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

