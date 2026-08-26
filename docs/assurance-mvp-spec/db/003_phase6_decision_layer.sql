-- Phase 6: Human Assurance Decision Layer, Attestation, and Reproducible Report
-- Apply after 001_init_schema.sql and 002_track_d_intake.sql.
-- The current MVP application also persists an equivalent JSON projection locally;
-- these tables define the canonical relational shape for the next durable store.

BEGIN;

ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS system_snapshot_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS phase6_authority_map_commits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    system_snapshot_id TEXT NOT NULL,
    proposed_map_hash TEXT NOT NULL,
    committed_map_hash TEXT NOT NULL,
    committed_map JSONB NOT NULL,
    reviewer_id UUID NOT NULL REFERENCES reviewers(id),
    reviewer_role reviewer_role NOT NULL,
    reasoning TEXT NOT NULL CHECK (length(trim(reasoning)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assessment_id, system_snapshot_id)
);

CREATE TABLE IF NOT EXISTS phase6_reviewer_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_version INTEGER NOT NULL CHECK (decision_version > 0),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    finding_id UUID REFERENCES findings(id) ON DELETE CASCADE,
    contradiction_id UUID,
    reviewer_id UUID NOT NULL REFERENCES reviewers(id),
    reviewer_role reviewer_role NOT NULL,
    decision review_decision_type NOT NULL,
    disposition TEXT CHECK (disposition IN ('confirmed', 'rejected', 'needs_more_evidence', 'accepted_risk', 'remediated')),
    previous_finding_state JSONB,
    new_finding_state JSONB,
    previous_contradiction_state TEXT,
    new_contradiction_state TEXT,
    evidence_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_snapshot_hash TEXT NOT NULL,
    reasoning TEXT NOT NULL CHECK (length(trim(reasoning)) > 0),
    system_snapshot_id TEXT NOT NULL,
    authority_map_element_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (finding_id IS NOT NULL OR contradiction_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_phase6_decision_version
  ON phase6_reviewer_decisions (assessment_id, decision_version);
CREATE INDEX IF NOT EXISTS idx_phase6_decisions_finding
  ON phase6_reviewer_decisions (finding_id);
CREATE INDEX IF NOT EXISTS idx_phase6_decisions_assessment
  ON phase6_reviewer_decisions (assessment_id);

CREATE TABLE IF NOT EXISTS phase6_contradiction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    finding_id UUID REFERENCES findings(id) ON DELETE CASCADE,
    contradiction_id UUID NOT NULL,
    previous_state TEXT NOT NULL,
    resulting_state TEXT NOT NULL,
    reviewer_id UUID NOT NULL REFERENCES reviewers(id),
    reasoning TEXT NOT NULL CHECK (length(trim(reasoning)) > 0),
    evidence_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    system_snapshot_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phase6_attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES reviewers(id),
    reviewer_role reviewer_role NOT NULL,
    system_snapshot_id TEXT NOT NULL,
    report_version TEXT NOT NULL,
    report_hash TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('attested', 'attested_with_residual_risk', 'not_attested')),
    scope TEXT NOT NULL CHECK (length(trim(scope)) > 0),
    is_cryptographic_signature BOOLEAN NOT NULL DEFAULT false CHECK (is_cryptographic_signature = false),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phase6_report_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    system_snapshot_id TEXT NOT NULL,
    report_version TEXT NOT NULL,
    substantive_hash TEXT NOT NULL,
    report_hash TEXT NOT NULL,
    source_state_fingerprint TEXT NOT NULL,
    markdown TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assessment_id, system_snapshot_id, report_version, substantive_hash)
);

-- The decision and attestation history are append-only. Corrections are new rows.
REVOKE UPDATE, DELETE ON phase6_reviewer_decisions FROM PUBLIC;
REVOKE UPDATE, DELETE ON phase6_contradiction_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON phase6_attestations FROM PUBLIC;

CREATE OR REPLACE FUNCTION enforce_phase6_report_ready_gate() RETURNS TRIGGER AS $$
DECLARE
    unreviewed_material_count INT;
BEGIN
    IF NEW.status = 'report_ready' AND NEW.level <> 'L1_diagnostic' THEN
        SELECT count(*) INTO unreviewed_material_count
        FROM findings f
        WHERE f.assessment_id = NEW.id
          AND f.severity IN ('critical', 'high', 'medium')
          AND NOT EXISTS (
              SELECT 1
              FROM phase6_reviewer_decisions d
              WHERE d.finding_id = f.id
                AND d.disposition IS NOT NULL
          );

        IF unreviewed_material_count > 0 THEN
            RAISE EXCEPTION 'Assessment % cannot become report_ready: % material finding(s) lack reviewer disposition', NEW.id, unreviewed_material_count;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_phase6_report_ready_gate ON assessments;
CREATE TRIGGER trg_phase6_report_ready_gate
    BEFORE UPDATE OF status ON assessments
    FOR EACH ROW
    WHEN (NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION enforce_phase6_report_ready_gate();

COMMIT;
