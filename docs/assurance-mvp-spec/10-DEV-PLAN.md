# Phase I: Development Plan

Sequence per the follow-up prompt's Section 12, domain model before UI. Each task tagged with whether it can start immediately.

| # | Task | Files/modules | Depends on | Acceptance criteria | Can start now? |
|---|---|---|---|---|---|
| 1 | Stand up Postgres, apply 001_init_schema.sql | db/ | Nothing | Schema applies cleanly, trigger test (attempt illegal E2 write, confirm rejection) passes | Yes |
| 2 | Domain types package | src/domain/types.ts | Task 1 | Types compile, `canSetEvidenceLevel` unit tests pass for allow/deny cases | Yes |
| 3 | Seed FrameworkReference table: ACSC ISM controls + OWASP ASI01-10 | db/, a seed script | Task 1 | Every ASI01-10 code present; ACSC ISM codes are the content-authoring gap flagged in the readiness audit, needs the specific guideline numbers identified first | Partially, ASI seed can start now, ISM seed needs one round of content research first |
| 4 | Architecture Extraction LLM call + schema validation | src/schemas/architecture-extraction.schema.json, an API handler | Task 2 | Given SYN-04's intake text, produces valid output matching the schema, rejects malformed output rather than coercing it | Yes |
| 5 | Deterministic rule engine, first 3 rules | a rules module (05-ASSESSMENT-ENGINE.md) | Tasks 2, 3 | The three example rules each produce correct output against a hand-built Authority Map fixture | Yes |
| 6 | Finding Draft LLM call + schema validation | src/schemas/finding-draft.schema.json, an API handler | Tasks 2, 4 | Cannot produce a finding with evidence_level above E1, verified by a test that tries to prompt-inject the model into claiming E2 and confirms the schema still caps it | Yes |
| 7 | Evidence Engine, insert/query/supersede | API layer over the evidence table | Task 1 | Matches the state machine in 05-ASSESSMENT-ENGINE.md, including the superseded_by staleness path | Yes |
| 8 | Reviewer workflow API (ReviewDecision creation) | API layer over review_decisions | Task 7 | Every decision requires non-empty reasoning; append-only enforced (no UPDATE/DELETE grant) | Yes |
| 9 | Authority Map builder, writes extraction output to real tables | ties Tasks 4 and 2 together | Tasks 4, 2 | SYN-04's extraction output round-trips into real AuthorityMapNode/Edge rows correctly | Yes |
| 10 | Vertical slice, SYN-04 end to end | integrates 1-9 | Tasks 1-9 | Every checkbox in 09-VERTICAL-SLICE.md | After 1-9 |
| 11 | Remaining nine synthetic systems through the pipeline | fixtures/08-synthetic-corpus.json | Task 10 | corpus_level_pass_criteria in the fixture file all pass, especially SYN-05/09/10 | After 10 |
| 12 | Report Compiler | a rendering module | Task 11 | Renders SYN-04 and at least one multi-finding system (SYN-07) correctly, critical findings never diluted | After 10 |
| 13 | n8n glue: intake notify, reviewer queue notify, delivery | src/workflows/12-n8n-workflow.json | Task 12 | Notifications fire correctly in a staging run, this is explicitly NOT where invariants live (02-ARCHITECTURE.md) | After 12, can be built in parallel with 11 |
| 14 | ACSC ISM specific control mapping content | content authoring, feeds Task 3 | None, can run in parallel with everything above | A named list of specific ISM guideline references mapped to the three example rules and to SYN-04/09/10 | Yes, parallel track from day 1 |

## Days 1-3 (revised per the readiness audit's timeline reconciliation)

Tasks 1, 2, 3 (ASI half), 14 (start), in parallel, not sequentially.

## Days 4-7

Tasks 4, 5, 6, 7, 3 (ISM half, once Task 14 has produced real content).

## Days 8-14

Tasks 8, 9, then Task 10 (vertical slice) targeted by day 14, one week earlier than the original System Specification's Days 22-30 target for "automated diagnostic pipeline end to end", achievable because the schema and rule-model uncertainty that justified the slower original estimate is resolved in this document.

## Days 15-21

Task 11, all ten synthetic systems, this is the real test of the methodology, not a formality.

## Days 22-30

Tasks 12, 13, plus fixing whatever Task 11 revealed.
