-- Record when completion was confirmed without inventing the event's exact date.
ALTER TABLE "DecisionEvent" ADD COLUMN "completionConfirmedOn" TEXT;
