-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "agendaItem" TEXT,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "date" TEXT,
    "synthetic" BOOLEAN NOT NULL,

    CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "verifiedAt" TEXT,
    "notes" TEXT NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionItem" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "DecisionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionEvent" (
    "status" TEXT NOT NULL DEFAULT 'Not verified',
    "position" INTEGER NOT NULL DEFAULT 0,
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "completionConfirmedOn" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "DecisionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicFeedbackTheme" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "amendment" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "evidenceId" TEXT,

    CONSTRAINT "PublicFeedbackTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipationWindow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "opensAt" TEXT,
    "deadline" TEXT,
    "closedOn" TEXT,
    "meetingAt" TEXT,
    "timeZone" TEXT NOT NULL,
    "url" TEXT,
    "verifiedAt" TEXT,
    "evidenceId" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ParticipationWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeographicScope" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "geometry" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "GeographicScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRecord" (
    "snapshot" TEXT,
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "projectId" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "DocumentImport" (
    "digest" TEXT,
    "fileData" BYTEA,
    "mediaType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Extracted',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT NOT NULL DEFAULT 'Legacy import',
    "costUsd" DOUBLE PRECISION,
    "originalProject" TEXT,
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "pages" TEXT NOT NULL,
    "rawResponse" TEXT,
    "extraction" TEXT,
    "model" TEXT,
    "requestId" TEXT,
    "usage" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSession" (
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldReview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "valueHash" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialRecord" (
    "id" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "agendaItem" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "record" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT,
    "confirmedBy" TEXT,

    CONSTRAINT "OfficialRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisBudget" (
    "day" TEXT NOT NULL,
    "reservedTokens" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalysisBudget_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "_DecisionItemToEvidence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DecisionItemToEvidence_AB_pkey" PRIMARY KEY ("A","B")
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
CREATE UNIQUE INDEX "DocumentImport_digest_key" ON "DocumentImport"("digest");

-- CreateIndex
CREATE UNIQUE INDEX "FieldReview_projectId_field_key" ON "FieldReview"("projectId", "field");

-- CreateIndex
CREATE INDEX "OfficialRecord_agendaItem_idx" ON "OfficialRecord"("agendaItem");

-- CreateIndex
CREATE INDEX "_DecisionItemToEvidence_B_index" ON "_DecisionItemToEvidence"("B");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionItem" ADD CONSTRAINT "DecisionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionEvent" ADD CONSTRAINT "DecisionEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionEvent" ADD CONSTRAINT "DecisionEvent_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionEvent" ADD CONSTRAINT "DecisionEvent_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicFeedbackTheme" ADD CONSTRAINT "PublicFeedbackTheme_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicFeedbackTheme" ADD CONSTRAINT "PublicFeedbackTheme_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicFeedbackTheme" ADD CONSTRAINT "PublicFeedbackTheme_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationWindow" ADD CONSTRAINT "ParticipationWindow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationWindow" ADD CONSTRAINT "ParticipationWindow_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationWindow" ADD CONSTRAINT "ParticipationWindow_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographicScope" ADD CONSTRAINT "GeographicScope_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographicScope" ADD CONSTRAINT "GeographicScope_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographicScope" ADD CONSTRAINT "GeographicScope_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRecord" ADD CONSTRAINT "ReviewRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldReview" ADD CONSTRAINT "FieldReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DecisionItemToEvidence" ADD CONSTRAINT "_DecisionItemToEvidence_A_fkey" FOREIGN KEY ("A") REFERENCES "DecisionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DecisionItemToEvidence" ADD CONSTRAINT "_DecisionItemToEvidence_B_fkey" FOREIGN KEY ("B") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
