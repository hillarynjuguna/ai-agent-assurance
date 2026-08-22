# Phase E: Assessment Engine

## Formal rule model, four categories

**Deterministic rules** (software establishes reliably, no LLM involved):

```
IF edge.edge_type = 'calls'
AND edge.action_reversibility = 'irreversible'
AND edge.requires_human_approval = false
THEN generate_candidate_finding(
    framework_refs = ['ASI01', 'ACSC-ISM-AccessControl'],
    initial_severity = 'critical',
    initial_confidence = 'moderate',   -- moderate, not high: a rule fired, a human hasn't looked yet
    evidence_level = 'E1_documented'
)

IF edge.edge_type = 'delegates_to'
AND target_node.node_type = 'external_agent'
AND edge.trust_boundary IN ('external', 'unknown')
THEN generate_candidate_finding(
    framework_refs = ['ASI07', 'ASI09'],
    initial_severity = 'high',
    initial_confidence = 'moderate',
    evidence_level = 'E1_documented'
)

IF node.node_type = 'identity'
AND count(edges WHERE source_node_id = node.id) > 1
AND NOT all_edges_share_same(permission_scope)
THEN generate_candidate_finding(   -- shared/overloaded identity, ASI03's core pattern
    framework_refs = ['ASI03', 'ACSC-ISM-Identity'],
    initial_severity = 'high',
    initial_confidence = 'high',   -- this one IS reliably detectable from structure alone
    evidence_level = 'E1_documented'
)
```

These three are implementable in plain code against the Authority Map tables, no LLM call needed, and are the first ones to build (10-DEV-PLAN.md).

**LLM-assisted reasoning**: interpreting free-text documentation to extract nodes/edges (architecture-extraction schema) and drafting the description/basis text for a finding a deterministic rule already flagged, or proposing additional candidate findings the deterministic rules did not catch (finding-draft schema). The LLM never originates a severity above what a deterministic rule or a reviewer sets without a documented basis, and it never sets evidence_level above E1, enforced by the schema itself, not by a prompt instruction.

**Human judgment**: everything routed through the Reviewer workflow (Phase F), accepting, rejecting, modifying severity/confidence, or upgrading evidence.

**Actual testing**: anything that produces an E3/E4 evidence row, a reviewer or a test harness actually executing a check against the real or sandboxed system, not reading about it.

## Relationship to CIR's existing evidence vocabulary

CIR already has evidence-source, evidence-completeness, and verification-status enums used in its own extraction step, more granular in places than E0-E4, but not the same scale and not durable. Per the source audit's explicit recommendation, E0-E4 is kept as Assurance's own canonical scale rather than adopting CIR's enums directly, but a mapping table (CIR evidence-source value to nearest E0-E4 level) should exist wherever Assurance consumes CIR's extraction output through the adapter layer, so the two systems don't silently disagree about what a given piece of evidence means. This mapping is a Days 1-7 content task alongside the ACSC ISM mapping (10-DEV-PLAN.md), not yet written.

## Evidence state machine

Levels, in order: E0 Claimed -> E1 Documented -> E2 Observed -> E3 Validated -> E4 Adversarially Tested.

- **Who can assign each level:** E0/E1, anyone (client submission, LLM draft, operator note). E2/E3/E4, only a `reviewer` or `test_harness` submitted_by_type, enforced by the SQL trigger in 001_init_schema.sql and mirrored in `canSetEvidenceLevel` in types.ts.
- **Upgrades:** always additive, a new Evidence row is inserted, the Finding's evidence_level only advances once a qualifying row exists.
- **Downgrades:** permitted, and important: if evidence is later found stale or wrong, a new Evidence row with a lower `supports_level` doesn't automatically downgrade the Finding (that would let bad evidence silently erase a good one), instead a Reviewer must record an explicit `downgrade_confidence` or equivalent ReviewDecision, so the downgrade itself is audited, not silent.
- **Staleness:** handled by `superseded_by`, old evidence is never deleted, only pointed past. A finding whose only qualifying evidence has been superseded loses its qualification on the next trigger evaluation, it does not stay falsely elevated.
- **Versioning and hashing:** `content_hash` (sha256) plus `storage_ref` on every Evidence row, per the audit-ledger design from the decision brief.
- **Report display:** every finding shows its evidence_level next to it explicitly, e.g. "Potential Critical Exposure, Low Confidence, Evidence E1", never folded into prose that implies more certainty than the level supports.

## Finding lifecycle

`open` (default on creation) -> `acknowledged` (client has seen it) -> `remediated` or `accepted_risk` (client's disposition, recorded, not assumed). Status is independent of severity and evidence_level, a `critical` finding can be `accepted_risk`, that combination is exactly the kind of thing the report must surface prominently, not hide.

## The traceability and independence invariants, restated as code-level rules

- A Finding row cannot be inserted without `authority_map_node_id` or `authority_map_edge_id` set, enforced by a CHECK constraint (001_init_schema.sql).
- The LLM's finding-draft schema has no field it could use to mark its own finding reviewed or validated, that field does not exist in its output contract.
- `submitted_by_type` on Evidence must be set server-side from the authenticated caller's session, never accepted from request body, this is an API-layer rule (11-api-contract.yaml), the schema alone cannot stop a naive implementation from trusting client input, it is called out here so it isn't missed.
