BEGIN;

-- Phase 4: Versioned System Identity & Canonical Assessed Object
-- Per Invariant 7: An assessment is bound to a specific versioned system snapshot,
-- not an abstract system in perpetuity.

CREATE TABLE IF NOT EXISTS system_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    source_version TEXT,
    config_hash TEXT NOT NULL,
    snapshot_identity TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_system_config UNIQUE (system_id, config_hash)
);

CREATE INDEX IF NOT EXISTS idx_system_snapshots_config_hash ON system_snapshots(config_hash);
CREATE INDEX IF NOT EXISTS idx_system_snapshots_system_id ON system_snapshots(system_id);

-- Bind assessment to a specific system snapshot
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS system_snapshot_id UUID REFERENCES system_snapshots(id);

CREATE INDEX IF NOT EXISTS idx_assessments_snapshot_id ON assessments(system_snapshot_id);

COMMIT;
