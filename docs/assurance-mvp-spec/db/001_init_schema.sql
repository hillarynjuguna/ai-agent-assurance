-- Phase D: Canonical v0.1 domain model, PostgreSQL
-- Eleven tables. Ten from the reconciled System Specification schema, plus
-- ReviewDecision (justified in 00-DEVELOPMENT-READINESS-AUDIT.md, section A).
-- Every table's purpose, lifecycle, and ownership is documented inline.

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE authority_node_type AS ENUM (
    'agent', 'model', 'memory', 'tool', 'api', 'data_source', 'external_agent', 'identity'
);

CREATE TYPE authority_edge_type AS ENUM (
    'reads', 'writes', 'calls', 'delegates_to', 'authenticates_as'
);

-- Extended per the follow-up prompt's Section 5 evaluation of the authority
-- model. Reversibility, blast radius, and data classification were judged
-- necessary (they change what "critical" means for the same edge type);
-- environment and trust_boundary were judged necessary because the same
-- edge can be low-risk in a sandbox and critical in production. Owner and
-- logging were judged NOT necessary as separate typed fields, they fold
-- into the metadata jsonb without losing meaningful analysis power.
CREATE TYPE data_classification AS ENUM ('public', 'internal', 'confidential', 'restricted');
CREATE TYPE reversibility AS ENUM ('reversible', 'partially_reversible', 'irreversible');
CREATE TYPE trust_boundary AS ENUM ('internal', 'partner', 'external', 'unknown');

CREATE TYPE framework_enum AS ENUM ('ACSC_ISM', 'OWASP_ASI', 'CIR', 'ISO_42001', 'ISO_23894', 'NIST_AI_RMF', 'MITRE_ATLAS');
CREATE TYPE assurance_layer AS ENUM ('security_posture', 'agentic_behaviour', 'governance_assurance');

CREATE TYPE assessment_level AS ENUM ('L1_diagnostic', 'L2_validated', 'L3_partnered');
CREATE TYPE assessment_status AS ENUM ('intake', 'mapping', 'diagnostics', 'human_review', 'report_ready', 'delivered');

CREATE TYPE finding_severity AS ENUM ('critical', 'high', 'medium', 'low', 'informational');
CREATE TYPE finding_confidence AS ENUM ('low', 'moderate', 'high');
CREATE TYPE finding_status AS ENUM ('open', 'acknowledged', 'remediated', 'accepted_risk');

-- The evidence ledger. Ordered intentionally: the trigger below relies on
-- this ordering to compare levels.
CREATE TYPE evidence_level AS ENUM ('E0_claimed', 'E1_documented', 'E2_observed', 'E3_validated', 'E4_adversarially_tested');
CREATE TYPE evidence_type AS ENUM ('document', 'log_excerpt', 'test_result', 'screenshot', 'config_extract', 'client_statement');

CREATE TYPE reviewer_role AS ENUM ('operator', 'human_validator', 'specialist_partner', 'internal_validator');
CREATE TYPE review_decision_type AS ENUM ('accept', 'reject', 'modify', 'request_more_evidence', 'downgrade_confidence', 'upgrade_evidence');

-- ============================================================
-- CORE ENTITIES
-- ============================================================

-- Client: who the assessment is for. Owned by the operator, created at intake.
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    industry TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System: the agent under review. A client may have more than one.
CREATE TABLE systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    model_provider TEXT,
    model_name TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviewer: a generic, interchangeable role per the follow-up prompt's
-- Section 10. Evan is a possible row here, not a schema assumption.
CREATE TABLE reviewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role reviewer_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment: one engagement. Lifecycle governed by assessment_status.
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    level assessment_level NOT NULL,
    status assessment_status NOT NULL DEFAULT 'intake',
    assigned_reviewer_id UUID REFERENCES reviewers(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT reviewer_required_above_l1 CHECK (
        level = 'L1_diagnostic' OR assigned_reviewer_id IS NOT NULL OR status IN ('intake', 'mapping', 'diagnostics')
    )
);

-- Authority Map: the technical object, not just a report diagram.
CREATE TABLE authority_map_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    node_type authority_node_type NOT NULL,
    name TEXT NOT NULL,
    identity TEXT,                          -- which identity this node acts as, if any
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE authority_map_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES authority_map_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES authority_map_nodes(id) ON DELETE CASCADE,
    edge_type authority_edge_type NOT NULL,
    permission_scope TEXT NOT NULL,
    requires_human_approval BOOLEAN NOT NULL DEFAULT false,
    -- Fields added after evaluating the follow-up prompt's Section 5 list.
    -- See the enum comments above for what was deliberately left out and why.
    data_classification data_classification,
    action_reversibility reversibility,
    trust_boundary trust_boundary NOT NULL DEFAULT 'unknown',
    observable BOOLEAN NOT NULL DEFAULT false,   -- is this edge's activity actually logged anywhere the client can show us
    credential_ref TEXT,                          -- free text description of the credential/auth mechanism, not the secret itself
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Framework reference: static lookup, seeded once, not per-assessment.
CREATE TABLE framework_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework framework_enum NOT NULL,
    reference_code TEXT NOT NULL,      -- e.g. 'ASI03', 'CIR-EvidenceTraceability'
    title TEXT NOT NULL,
    layer assurance_layer NOT NULL,
    UNIQUE (framework, reference_code)
);

-- Finding: the core work product. Severity and confidence are independent
-- fields, never combined into a composite score (Section 8 of the prompt).
CREATE TABLE findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    framework_reference_id UUID REFERENCES framework_references(id),
    authority_map_node_id UUID REFERENCES authority_map_nodes(id),
    authority_map_edge_id UUID REFERENCES authority_map_edges(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity finding_severity NOT NULL,
    confidence finding_confidence NOT NULL,
    evidence_level evidence_level NOT NULL DEFAULT 'E0_claimed',
    status finding_status NOT NULL DEFAULT 'open',
    drafted_by TEXT NOT NULL,          -- 'llm' or a reviewer/operator id, kept as text so the LLM's drafts are visibly attributed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT finding_traces_to_authority_map CHECK (
        authority_map_node_id IS NOT NULL OR authority_map_edge_id IS NOT NULL
    )   -- Traceability invariant from Section 19 of the follow-up prompt:
        -- every finding must trace to at least one authority-map element.
);

-- Evidence: hashed, versioned, linked. The audit trail's foundation.
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    evidence_type evidence_type NOT NULL,
    content_hash TEXT NOT NULL,        -- sha256 of the underlying artifact
    storage_ref TEXT NOT NULL,         -- pointer into object storage, never the artifact itself
    supports_level evidence_level NOT NULL,  -- what level THIS piece of evidence, alone, qualifies for
    submitted_by_type TEXT NOT NULL CHECK (submitted_by_type IN ('client', 'operator', 'reviewer', 'test_harness')),
    submitted_by_id UUID,              -- nullable: client submissions aren't a reviewer row
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    superseded_by UUID REFERENCES evidence(id)  -- staleness handling: old evidence is superseded, never deleted
);

CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    priority finding_severity NOT NULL,
    owner TEXT NOT NULL CHECK (owner IN ('client_action', 'operator_action')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Review decisions: append-only audit log. This is the eleventh table,
-- added because "reviewed = true" does not satisfy the auditability
-- invariant. Every reviewer action, not just the final verdict, is a row.
CREATE TABLE review_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES reviewers(id),
    decision review_decision_type NOT NULL,
    reasoning TEXT NOT NULL,           -- required: a decision without recorded reasoning is not auditable
    evidence_id UUID REFERENCES evidence(id),  -- if this decision produced new evidence
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No UPDATE or DELETE grants on this table at the application role level.
-- Corrections are new rows, never edits, per the auditability invariant.

-- ============================================================
-- INVARIANT ENFORCEMENT
-- ============================================================

-- Evidence integrity invariant: a finding cannot be set to E2 or above
-- without at least one linked, non-superseded Evidence row that itself
-- supports that level or higher, AND (for E2+) that evidence must not be
-- of submitted_by_type 'client' alone, per the "LLM/client cannot
-- self-validate" rule.
CREATE OR REPLACE FUNCTION enforce_evidence_integrity() RETURNS TRIGGER AS $$
DECLARE
    qualifying_count INT;
    level_rank CONSTANT evidence_level[] := ARRAY['E0_claimed','E1_documented','E2_observed','E3_validated','E4_adversarially_tested'];
BEGIN
    IF NEW.evidence_level IN ('E2_observed', 'E3_validated', 'E4_adversarially_tested') THEN
        SELECT count(*) INTO qualifying_count
        FROM evidence e
        WHERE e.finding_id = NEW.id
          AND e.superseded_by IS NULL
          AND e.submitted_by_type IN ('reviewer', 'test_harness')  -- client/operator documentation alone cannot qualify
          AND array_position(level_rank, e.supports_level) >= array_position(level_rank, NEW.evidence_level);

        IF qualifying_count = 0 THEN
            RAISE EXCEPTION 'Finding % cannot be set to % without qualifying reviewer or test_harness evidence at that level or higher', NEW.id, NEW.evidence_level;
        END IF;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the same invariant to both creation and escalation. An elevated finding
-- cannot be inserted first and justified later; the normal workflow creates the
-- finding at E0/E1, attaches evidence, then performs an audited UPDATE.
DROP TRIGGER IF EXISTS trg_evidence_integrity ON findings;
DROP TRIGGER IF EXISTS trg_evidence_integrity_insert ON findings;
DROP TRIGGER IF EXISTS trg_evidence_integrity_update ON findings;

CREATE TRIGGER trg_evidence_integrity_insert
    BEFORE INSERT ON findings
    FOR EACH ROW
    EXECUTE FUNCTION enforce_evidence_integrity();

CREATE TRIGGER trg_evidence_integrity_update
    BEFORE UPDATE OF evidence_level ON findings
    FOR EACH ROW
    WHEN (NEW.evidence_level IS DISTINCT FROM OLD.evidence_level)
    EXECUTE FUNCTION enforce_evidence_integrity();

-- Note, honestly flagged rather than silently assumed: this trigger checks
-- WHAT evidence exists, not WHO is currently acting. Enforcing that only an
-- authenticated reviewer's own API call can insert a submitted_by_type =
-- 'reviewer' evidence row is an application-layer responsibility (the API
-- must not trust a client-supplied submitted_by_type field), not something
-- raw SQL can guarantee without session-scoped row-level security, which is
-- deliberately out of scope for v0.1. See 10-DEV-PLAN.md.

-- Severity preservation invariant: nothing in this schema computes a
-- composite score. There is intentionally no column, view, or trigger
-- anywhere in this file that averages severity or confidence. A critical
-- finding is a row with severity = 'critical', full stop, and the report
-- layer must display it as such regardless of how many other findings exist.

CREATE INDEX idx_findings_assessment ON findings(assessment_id);
CREATE INDEX idx_evidence_finding ON evidence(finding_id);
CREATE INDEX idx_authority_edges_system ON authority_map_edges(system_id);
CREATE INDEX idx_review_decisions_finding ON review_decisions(finding_id);
