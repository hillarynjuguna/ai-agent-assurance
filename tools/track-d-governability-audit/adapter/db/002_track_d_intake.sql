BEGIN;

-- Track D intake support
-- Per Settled Decision 1: self_assessment_context stores the complete Track D
-- Diligence Positioning Matrix output as JSONB. This is diagnostic context,
-- not evidence. It attaches to the Assessment, never to a Finding.
-- It must never feed into, adjust, or be averaged with any Finding's
-- severity, confidence, or evidence_level.

ALTER TABLE assessments 
  ADD COLUMN self_assessment_context JSONB,
  ADD COLUMN source_artifact_hash TEXT,
  ADD COLUMN import_source TEXT CHECK (import_source IN ('manual', 'track_d', 'api'));

-- Index for idempotency checks: find assessments by source artifact hash
CREATE INDEX idx_assessments_source_hash ON assessments(source_artifact_hash) 
  WHERE source_artifact_hash IS NOT NULL;

COMMIT;
