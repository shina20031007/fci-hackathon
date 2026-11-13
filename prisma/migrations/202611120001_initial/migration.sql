-- CreateTable
CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "municipalityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "neighbourhood" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "summaryEvidenceId" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'Draft',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    "verifiedAt" TEXT,
    CONSTRAINT "Project_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "date" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL,
    CONSTRAINT "SourceDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "verifiedAt" TEXT,
    "notes" TEXT NOT NULL,
    CONSTRAINT "Evidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evidence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "amendment" TEXT NOT NULL,
    "uncertainty" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reviewState" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    CONSTRAINT "DecisionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    CONSTRAINT "DecisionEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DecisionEvent_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DecisionEvent_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    CONSTRAINT "DocumentVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentVersion_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublicFeedbackTheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "amendment" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "evidenceId" TEXT,
    CONSTRAINT "PublicFeedbackTheme_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublicFeedbackTheme_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PublicFeedbackTheme_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParticipationWindow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "opensAt" TEXT,
    "deadline" TEXT,
    "meetingAt" TEXT,
    "timeZone" TEXT NOT NULL,
    "url" TEXT,
    "verifiedAt" TEXT,
    "evidenceId" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ParticipationWindow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParticipationWindow_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParticipationWindow_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeographicScope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "geometry" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    CONSTRAINT "GeographicScope_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeographicScope_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeographicScope_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Publication" (
    "projectId" TEXT NOT NULL PRIMARY KEY,
    "snapshot" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Publication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DecisionItemToEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DecisionItemToEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "DecisionItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DecisionItemToEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "Evidence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_name_key" ON "Municipality"("name");

-- CreateIndex
CREATE INDEX "Project_municipalityId_category_status_idx" ON "Project"("municipalityId", "category", "status");

-- CreateIndex
CREATE INDEX "SourceDocument_projectId_idx" ON "SourceDocument"("projectId");

-- CreateIndex
CREATE INDEX "Evidence_projectId_state_idx" ON "Evidence"("projectId", "state");

-- CreateIndex
CREATE INDEX "DecisionItem_projectId_status_idx" ON "DecisionItem"("projectId", "status");

-- CreateIndex
CREATE INDEX "DecisionEvent_projectId_date_idx" ON "DecisionEvent"("projectId", "date");

-- CreateIndex
CREATE INDEX "DocumentVersion_projectId_date_idx" ON "DocumentVersion"("projectId", "date");

-- CreateIndex
CREATE INDEX "PublicFeedbackTheme_projectId_topic_idx" ON "PublicFeedbackTheme"("projectId", "topic");

-- CreateIndex
CREATE INDEX "ParticipationWindow_projectId_idx" ON "ParticipationWindow"("projectId");

-- CreateIndex
CREATE INDEX "GeographicScope_projectId_idx" ON "GeographicScope"("projectId");

-- CreateIndex
CREATE INDEX "ReviewRecord_projectId_createdAt_idx" ON "ReviewRecord"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_DecisionItemToEvidence_AB_unique" ON "_DecisionItemToEvidence"("A", "B");

-- CreateIndex
CREATE INDEX "_DecisionItemToEvidence_B_index" ON "_DecisionItemToEvidence"("B");

