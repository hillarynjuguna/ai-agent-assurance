# Phase 6 Implementation Report

**Project:** AI Agent Assurance MVP
**Phase:** 6 — Human Assurance Decision Layer, Attestation, and Reproducible Reporting
**Author:** Manus AI
**Date:** 26 August 2026
**Repository:** `hillarynjuguna/ai-agent-assurance`
**Working tree:** `/home/ubuntu/ai-agent-assurance-review/repo`
**Delivery status:** Implemented in the isolated checkout; not pushed to GitHub.

## Executive summary

Phase 6 is implemented as a bounded, local-first reviewer workflow that connects the existing Track D intake and Phase 5 deterministic/LLM-assistance layers to a human decision and reporting loop. The implementation adds a proposed-to-committed Authority Map boundary, assessment-level architecture-extraction proposals, diagnostics execution against a committed map, a reviewer queue, append-only reviewer decision records, structured evidence capture and upgrade rules, contradiction lifecycle actions, report-ready gating, attestations, deterministic Markdown report artifacts, and a usable reviewer console at `/assurance`.

The implementation deliberately preserves the repository’s core trust model. **Client claims remain claims. Deterministic findings remain authoritative over LLM proposals. LLM outputs remain quarantined until a reviewer acts. Evidence upgrades require qualifying provenance. Contradictions are retained until a reviewer records a reasoned state. Reports remain snapshot-bound and include explicit limitations.**

The implementation is complete for the bounded Phase 6 MVP, with important production limitations called out below. In particular, the current application persistence seam remains file/memory based, reviewer authentication is represented by an environment-configured or development-fallback identity, report artifacts are Markdown rather than signed documents, and the canonical SQL migration is tested but not yet the runtime persistence backend for the Next.js app.

## Scope delivered

| Phase 6 capability | Delivered implementation | Verification |
|---|---|---|
| Assessment-level intake | `POST /api/assessments/{assessmentId}/intake` stores content hash and validated architecture-extraction proposal without mutating the committed map. | Route integration test verifies proposal status, map immutability, and duplicate-content idempotency. |
| Authority Map review | `GET/POST /api/assessments/{assessmentId}/authority-map` exposes proposed state and records a reviewer commitment decision. | Service and browser smoke tests verify proposed-to-committed transition. |
| Diagnostics run | `POST /api/assessments/{assessmentId}/diagnostics/run` requires a committed map and runs deterministic rules plus mock/live LLM assistance. | Service, route, and browser tests verify pre-commit rejection, `human_review` status, LLM proposal labeling, and snapshot binding. |
| Reviewer queue | `GET /api/reviewer/queue` lists assessments with material open findings or unresolved contradictions. | Route is compiled and exercised by the reviewer page; queue filtering is covered by service state behavior. |
| Finding review | `POST /api/findings/{findingId}/review` records accept/reject/modify/request-more-evidence/downgrade/upgrade actions with reasoning and stale-evidence protection. | Service and route tests verify concurrency tokens and append-only decision history. |
| Evidence lifecycle | `POST /api/findings/{findingId}/evidence` attaches reviewer evidence; a token-gated internal route accepts test-harness evidence; supersession is additive. | E2 and E4 paths are tested, including unauthorized E4 rejection and E4 upgrade. |
| Contradictions | `POST /api/assessments/{assessmentId}/contradictions/{contradictionId}` records unresolved, resolved, or accepted-as-unknown states. | Service test verifies contradictions remain unresolved until a reasoned reviewer action. |
| Status and gating | `GET/POST /api/assessments/{assessmentId}/status` exposes transitions and blocks L2/L3 `report_ready` when material findings lack dispositions. | PGlite migration test and service tests verify the gate; L1 skip-by-design is tested through the API path. |
| Attestation | `POST /api/assessments/{assessmentId}/attestation` binds a human decision to an exact report version and hash. | Service and browser smoke tests verify success and non-cryptographic semantics. |
| Reproducible report | `POST/GET /api/assessments/{assessmentId}/report` generates and fetches a deterministic Markdown artifact with hashes and provenance. | Service test compares repeated report hash and Markdown content. |
| Reviewer UI | `/assurance` provides assessment loading, queue refresh, map commit, diagnostics, finding review, evidence entry, contradiction controls, report preview, and attestation controls. | Local browser smoke test completed through intake, map commit, diagnostics, review, evidence, report, and attestation. |

## Architecture decisions

### State separation

Phase 6 state is stored as an extension of the existing `StoredAssuranceAssessment` record. The extension is intentionally separated from the original Track D result so existing intake behavior remains compatible. It contains the proposed/committed Authority Map state, intake submissions, snapshot-bound findings, evidence records, reviewer decisions, contradictions, diagnostics runs, reports, and attestations.

This is a local MVP state model rather than a replacement for the canonical PostgreSQL model. The new SQL migration in `docs/assurance-mvp-spec/db/003_phase6_decision_layer.sql` establishes the relational shape and is applied in a real PGlite test. The Next.js runtime continues to use the existing assurance store seam, which currently supports file and memory modes.

### Reviewer identity

The repository does not yet have production authentication. The Phase 6 routes therefore use `ASSURANCE_REVIEWER_ID` and `ASSURANCE_REVIEWER_ROLE` when configured, otherwise the named `reviewer-dev-internal-validator` development fallback. The role is never accepted from request bodies. E4 evidence uses a separate internal route requiring `ASSURANCE_TEST_HARNESS_TOKEN` and the `x-assurance-test-harness-token` header; the server sets `submittedByType` to `test_harness`.

This makes the provenance boundary explicit without pretending that the MVP has production-grade identity, authorization, tenancy, or non-repudiation.

### Authority Map commitment boundary

The initial Track D-derived map is marked `proposed`. The reviewer must submit non-empty reasoning to commit it. The commit creates an append-only `authority_map` reviewer decision containing the snapshot ID, evidence snapshot hash, map element references, reviewer identity, role, authentication mode, and commitment time. Diagnostics are rejected until the map is committed.

Assessment-level intake accepts raw content and runs the existing architecture-extraction adapter, but only stores the validated accepted extraction as a `proposed` submission. It does not merge nodes or edges into the committed map. This preserves the traceability rule that extracted architecture requires operator review before commitment.

### Diagnostics and LLM boundary

Diagnostics re-validates the stored Track D source, derives the deterministic rule path, prepares soft-dimension input, and invokes either the deterministic mock adapter or the configured OpenAI-compatible adapter. Accepted LLM finding drafts are stored as `origin: llm_proposal`. A candidate reference not found in the committed map remains represented as a proposed Authority Map reference instead of being silently promoted to an official node or edge. Rejected candidates, unknowns, deterministic conflicts, and contradictions remain available inside the stored diagnostics run.

The deterministic rule engine is not overwritten by LLM output. The Phase 5 orchestration result is persisted as a run record, while reviewer action is required to change finding disposition or recognized evidence state.

## Evidence and trust-layer semantics

The reviewer-facing evidence model distinguishes **evidence type**, **artifact content hash**, **storage reference**, **snapshot binding**, **support level**, **submitter type**, **submitter identity**, **metadata**, and **supersession**. Request bodies cannot select the server-controlled submitter type for reviewer or test-harness routes.

The E2, E3, and E4 paths require structured metadata. E2 requires observation context and timestamp. E3 requires a named test, procedure, expected result, actual result, result value, and execution time. E4 requires adversarial scenario, controlled conditions, authorization, result, and execution time; E4 evidence can only be upgraded through the token-gated test-harness actor.

Reviewer decisions carry the previous and new finding state, including severity, confidence, evidence level, status, and disposition. Every decision includes non-empty reasoning, a snapshot ID, Authority Map references, an evidence snapshot hash, and evidence references where applicable. A stale hash is rejected with a conflict response rather than allowing a reviewer to act on an out-of-date evidence view.

| Trust layer | Phase 6 representation |
|---|---|
| Self-assessment context | The existing Track D context is rendered with its provenance disclaimer. |
| Client claim | Existing Track D/client evidence claims remain separate from reviewer evidence. |
| Claimed evidence level | Track D claims and stored `supportsLevel` remain visible. |
| Recognized evidence level | Finding `evidenceLevel` is changed only through the reviewed evidence path. |
| Reviewer accountability | Append-only reviewer decisions, reviewer identity, reasoning, and attestation are rendered. |

## Report behavior

The report compiler creates a `phase6-v1` Markdown artifact. It includes assessment and snapshot identity, source artifact hash, source-state fingerprint, assessment level and status, report-readiness state, executive summary, Authority Map and provenance, all findings and trust-layer fields, contradictions and unresolved state, evidence ledger, reviewer decision history, reassessment triggers and limitations, Track D self-assessment context, and attestation records.

The report is generated from stored state and hashed with SHA-256. Repeated generation against unchanged substantive state returns the same report hash and Markdown content. Artifact IDs and generation timestamps are metadata and do not change the substantive fingerprint. The report explicitly states that it is not a composite score and does not claim that an untested control is effective.

For `L1_diagnostic`, the report-ready gate skips the material-finding review requirement by design. For `L2_validated` and higher, critical/high/medium findings without a disposition, or with `needs_more_evidence`, block report readiness. The implementation does not invent a claim of assurance from the absence of a finding.

Attestation requires an existing report artifact and an exact matching report version/hash. The stored record has `isCryptographicSignature: false`; the UI and report state this plainly. Attestation records reviewer identity, role, scope, report reference, snapshot, decision, and timestamp.

## Database migration

`003_phase6_decision_layer.sql` adds the canonical relational structures for:

| Database structure | Purpose |
|---|---|
| `phase6_authority_map_commits` | Immutable commitment metadata for proposed-to-committed Authority Map state. |
| `phase6_reviewer_decisions` | Append-only reviewer actions and previous/new state snapshots. |
| `phase6_contradiction_events` | Contradiction lifecycle history and resolution evidence references. |
| `phase6_attestations` | Report-hash-bound human attestations with non-cryptographic signature constraint. |
| `phase6_report_artifacts` | Snapshot-bound report versions, hashes, fingerprints, and Markdown content. |
| `evidence` extensions | Snapshot binding, metadata, and supersession references. |
| `assessments` trigger | L2/L3 report-ready gating while preserving L1 skip-by-design behavior. |

The migration is verified through PGlite using the real `001_init_schema.sql`, `002_track_d_intake.sql`, and `003_phase6_decision_layer.sql` sequence. The test verifies report-ready rejection before a material finding has a disposition and accepts the transition after a reviewer decision. It also rejects `is_cryptographic_signature = true` and accepts a report-hash-bound non-cryptographic attestation.

## Files delivered

| Path | Role |
|---|---|
| `docs/assurance-mvp-spec/db/003_phase6_decision_layer.sql` | Canonical Phase 6 PostgreSQL migration. |
| `trust-readiness-diagnostic/src/lib/assurance/phase6-types.ts` | Phase 6 state and domain types. |
| `trust-readiness-diagnostic/src/lib/assurance/phase6-service.ts` | Server-side workflow, invariants, reviewer actions, evidence, contradictions, and gates. |
| `trust-readiness-diagnostic/src/lib/assurance/report-service.ts` | Deterministic report compiler and artifact persistence. |
| `trust-readiness-diagnostic/src/lib/assurance/http.ts` | Shared JSON parsing and error responses. |
| `trust-readiness-diagnostic/src/app/api/assessments/[assessmentId]/intake/route.ts` | Assessment-level intake and architecture-extraction proposal route. |
| `trust-readiness-diagnostic/src/app/api/assessments/[assessmentId]/authority-map/route.ts` | Authority Map fetch and commitment route. |
| `trust-readiness-diagnostic/src/app/api/assessments/[assessmentId]/diagnostics/run/route.ts` | Diagnostics execution route. |
| `trust-readiness-diagnostic/src/app/api/assessments/[assessmentId]/findings/route.ts` | Snapshot-bound findings/evidence/decision inspection route. |
| `trust-readiness-diagnostic/src/app/api/assessments/[assessmentId]/status/route.ts` | Status inspection and transition route. |
| `trust-readiness-diagnostic/src/app/api/assessments/[assessmentId]/report/route.ts` | Report generation and fetch route. |
| `trust-readiness-diagnostic/src/app/api/assessments/[assessmentId]/attestation/route.ts` | Report-hash-bound attestation route. |
| `trust-readiness-diagnostic/src/app/api/assessments/[assessmentId]/contradictions/[contradictionId]/route.ts` | Contradiction resolution route. |
| `trust-readiness-diagnostic/src/app/api/findings/[findingId]/review/route.ts` | Reviewer decision route. |
| `trust-readiness-diagnostic/src/app/api/findings/[findingId]/evidence/route.ts` | Reviewer evidence attachment route. |
| `trust-readiness-diagnostic/src/app/api/findings/[findingId]/evidence/[evidenceId]/supersede/route.ts` | Additive evidence supersession route. |
| `trust-readiness-diagnostic/src/app/api/internal/test-harness/findings/[findingId]/evidence/route.ts` | Token-gated E4 evidence route. |
| `trust-readiness-diagnostic/src/app/api/reviewer/queue/route.ts` | Reviewer queue route. |
| `trust-readiness-diagnostic/src/app/assurance/page.tsx` | Minimum usable Phase 6 reviewer console. |
| `trust-readiness-diagnostic/tests/phase6-service.test.ts` | Service/invariant/reproducibility tests. |
| `trust-readiness-diagnostic/tests/phase6-api.test.ts` | Next.js route integration tests. |
| `tools/track-d-governability-audit/adapter/tests/phase6-migration.test.ts` | Real PGlite migration and database-boundary tests. |
| `phase6-ui-smoke-findings.md` | Local browser smoke-test record. |

## Verification matrix

| Check | Result | Evidence |
|---|---|---|
| Application tests | **PASS** — 7 tests, 7 passed, 0 failed. | `phase6-app-tests-5.log` |
| Application TypeScript | **PASS**. | `phase6-final-app-verification.log` |
| Application lint | **PASS** with no reported errors or warnings in final run. | `phase6-final-app-verification.log` |
| Next.js production build | **PASS** — Next.js 16.3.0 compiled and generated all pages/routes. | `phase6-final-app-verification.log` |
| Adapter tests | **PASS** — 159 tests, 52 suites, 0 failed. | `phase6-final-adapter-verification.log` |
| Adapter typecheck | **PASS**. | `phase6-final-adapter-verification.log` |
| PGlite migration sequence | **PASS** — 2 Phase 6 migration tests. | `phase6-final-adapter-verification.log` |
| Whitespace/diff check | **PASS** — `git diff --check`. | `phase6-final-scope-audit.log` and `phase6-build-final.log` |
| Browser page render | **PASS** — `/assurance` loaded locally with reviewer controls. | `phase6-ui-smoke-findings.md` |
| Browser workflow | **PASS** — intake, map commit, diagnostics, two finding reviews, E2 evidence, report, and attestation. | `phase6-ui-smoke-findings.md` |

## Browser smoke test

A local sample assessment was created through the existing Track D intake endpoint. The reviewer console loaded the assessment, displayed its proposed Authority Map and critical deterministic finding, accepted a map commitment, ran mock diagnostics, displayed a medium LLM proposal as `llm_proposal`, recorded reviewer decisions for both findings, attached an E2 observation, generated a `phase6-v1` report with a 64-character hash, changed the state to `report_ready`, and recorded a residual-risk attestation.

The smoke test was performed against assessment `3e62b66d-9099-4a54-92cb-c9a301a7dafa` and snapshot `snapshot-system-acme-procurement-ai-78e604e49f22b845`. The smoke-test assessment is local test data and is not a production customer record.

## Known limitations and deferred scope

Phase 6 is intentionally not Phase 7. The implementation does not add continuous monitoring, scheduled reassessment, drift detection, automated remediation, webhooks, marketplace integrations, registry publication, portability exports, or ecosystem adapters. It also does not add production SSO, multi-tenant isolation, role administration, key management, cryptographic signing, or durable object storage.

The current Next.js app uses its existing file/memory assurance store. The canonical SQL migration is present and tested, but the runtime service does not yet transact against PostgreSQL/TiDB. The `storageRef` field is a provenance reference, not an upload service. Evidence content is represented by a caller-supplied SHA-256 hash; the MVP does not independently fetch or hash the referenced artifact.

The reviewer queue is intentionally local and lacks production pagination, authorization, assignment, and race-safe database transactions. The report is a Markdown artifact returned by JSON rather than a signed PDF or externally verifiable package. The app’s development fallback reviewer identity is explicit but not acceptable for deployment as a real assurance service.

The assessment-level intake route stores architecture extraction proposals but does not merge accepted nodes and edges automatically. A future reviewer action may need to accept individual proposed map elements and create a new snapshot; that remains deferred to the next bounded phase rather than being smuggled into the current commit action.

## Final status

**Phase 6 implementation status: COMPLETE for the bounded local MVP.** The human assurance loop is now executable from intake through Authority Map commitment, diagnostics, reviewer decisions, evidence capture, contradiction handling, report generation, and human attestation. The repository is not yet production-ready because identity, durable runtime persistence, artifact storage, and signed deliverable controls remain explicitly open.
