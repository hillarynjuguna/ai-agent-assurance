# Phase 16: LLM Boundary, and Section 19: Development Invariants

## What the LLM is permitted to do

Extract architecture from documentation (architecture-extraction.schema.json). Interpret free-text documentation. Propose candidate findings (finding-draft.schema.json). Propose framework mappings, constrained to codes that already exist in the seeded `framework_references` table, never invented. Summarize evidence for a reviewer's benefit. Draft recommendation and report prose from already-committed Finding/Evidence records.

## What the LLM is never permitted to do, and how each is actually blocked, not just instructed

| Prohibited action | Enforcement mechanism |
|---|---|
| Declare a control validated | `finding-draft.schema.json` has no field for this, only `evidence_level` capped at E1 |
| Fabricate evidence | Evidence rows require `content_hash` and `storage_ref` pointing to a real uploaded/logged artifact, an LLM output alone cannot populate these |
| Upgrade evidence level | The API layer's evidence-upgrade path requires an authenticated `reviewer` or `test_harness` identity, checked server-side, never the request body |
| Approve its own finding | `review_decisions.reviewer_id` references the `reviewers` table, an LLM has no row there, it cannot author a ReviewDecision |
| Suppress a high-severity finding | Deterministic rules and the finding-draft schema always create the row, there is no LLM-accessible path that skips finding creation for a rule that fired |
| Claim runtime testing occurred | `evidence_type` values available to LLM-authored evidence submissions are restricted to `document`/`config_extract`/`client_statement` at the API layer, `test_result` is only writable via the test-harness or reviewer path |
| Claim adversarial testing occurred | Same mechanism, E4 is unreachable without a `test_harness` or `reviewer` submitted_by_type |

## Development invariants, consolidated

1. **Evidence integrity**: no finding reaches E2+ without linked qualifying evidence (SQL trigger, 001_init_schema.sql).
2. **Review integrity**: a reviewer cannot record a decision without the finding's evidence being fetched first, enforced by the review endpoint requiring an `evidence_snapshot_hash` parameter matching what's currently attached, so a stale review (against evidence that changed since the reviewer loaded the page) is rejected, not silently accepted. *(This specific mechanism is a new addition made while writing this document, flagged as a DESIGN DECISION, not previously specified in either prior document.)*
3. **Independence**: the LLM cannot mark its own finding validated, no code path exists for it (table above).
4. **Traceability**: every finding references an authority-map node or edge, CHECK constraint.
5. **Severity preservation**: no composite score exists anywhere in the schema or report layer.
6. **Scope integrity**: `finding_status` and `evidence_level` are separate fields, "not assessed" is representable as a finding simply not existing for a given authority-map element and framework reference, "passed" would require an explicit accepted-risk or remediated status with evidence, the two are never conflated.
7. **Testing integrity**: `evidence_type = test_result` is restricted to reviewer/test_harness submitters (table above).
8. **Auditability**: `review_decisions` is append-only, no UPDATE/DELETE grant at the application database role.
9. **Idempotency** *(added here, not previously specified)*: re-running diagnostics on an unchanged Authority Map must not create duplicate open findings for the same element and framework reference, specified in the API contract's `runDiagnostics` operation.

## Not yet enforced, flagged honestly rather than silently assumed solved

Row-level, session-scoped authorization (so the database itself, not just the API layer, refuses a write from the wrong actor) is out of scope for v0.1. The API layer is the enforcement boundary for "who is calling," the database enforces "what evidence exists." This is a real gap if the API layer has a bug, not a theoretical one, and is the first thing to harden before any real client data touches this system, called out explicitly rather than left implicit.
