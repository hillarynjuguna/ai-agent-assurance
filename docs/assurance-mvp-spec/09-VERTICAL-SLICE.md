# Phase H: First Working Vertical Slice

## Path

Upload agent documentation -> Extract architecture (LLM, schema-validated) -> Create Authority Map -> Identify candidate risks (deterministic rules + LLM-assisted) -> Map to OWASP ASI / ACSC ISM / CIR -> Create E0/E1 findings -> Attach evidence -> Human review (internal_validator for this slice) -> Generate auditable report.

## Chosen test case: SYN-04, agent capable of financial transactions

Chosen because it is the cleanest single-edge critical case, no compound reasoning required (unlike SYN-09), no adversarial contradiction required (unlike SYN-05/SYN-10), so a failure here means the basic pipeline is broken, not that a subtle methodology case wasn't handled. SYN-09 and SYN-10 are the Phase 2 slice, once this one passes.

## Acceptance criteria

- [ ] Given SYN-04's intake material, the Architecture Extraction step produces exactly one `api` node and one `calls` edge with `action_reversibility = irreversible` and `requires_human_approval = false`, matching `authority-map-extraction.schema.json`.
- [ ] Given that Authority Map, the deterministic rule in 05-ASSESSMENT-ENGINE.md fires and produces exactly one candidate Finding at `severity = critical`, `evidence_level = E1_documented`.
- [ ] The Finding is persisted with `authority_map_edge_id` set (traceability invariant), and the database rejects any attempt to insert it without that reference.
- [ ] The Finding is mapped to `ASI01` and/or `ASI02` in `framework_references`.
- [ ] An attempt to directly set this Finding's `evidence_level` to `E2_observed` via the API without a qualifying reviewer/test_harness Evidence row fails, both at the SQL trigger level and the API layer, this is the specific test of the evidence-integrity invariant.
- [ ] The Assessment cannot transition to `report_ready` while this Finding exists unreviewed (Level 2 assessment).
- [ ] An `internal_validator` Reviewer records a ReviewDecision (`accept`, with reasoning), the report generation step then includes the finding correctly labeled at whatever evidence_level it holds at that point, still E1 unless the reviewer also performed and logged an actual test.
- [ ] The generated report shows this finding standalone under "Critical Exposure Detected," not folded into any averaged status.

Passing this slice is the Days 22-30 milestone in 10-DEV-PLAN.md.
