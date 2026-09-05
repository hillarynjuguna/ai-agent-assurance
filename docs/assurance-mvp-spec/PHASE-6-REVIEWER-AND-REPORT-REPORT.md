# Phase 6: Human Assurance Decision Layer + Report Pipeline Report

> **Execution Date:** 2026-09-05  
> **Repository:** [ai-agent-assurance](https://github.com/hillarynjuguna/ai-agent-assurance)  
> **Status:** PASSED (165/165 tests passing across 57 suites, 0 failures)  
> **Milestone:** Final Phase of Current MVP Roadmap Complete  

---

## 1. Executive Summary

Phase 6 completes the vertical slice of the AI Agent Assurance MVP:
$$\text{Intake} \longrightarrow \text{Snapshot} \longrightarrow \text{Authority Map} \longrightarrow \text{Rules/LLM} \longrightarrow \text{Reviewer Decision} \longrightarrow \text{Evidence Upgrade} \longrightarrow \text{Canonical State} \longrightarrow \text{Attested Report}$$

Phase 6 transforms machine-generated candidate findings, evidence states, deterministic rules, and LLM extractions into an **auditable, evidence-qualified, human-authorized assurance process** that produces a reproducible assurance report without destroying the provenance of how that state was reached.

### Core Architecture Principle
> **"Assessment state must be append-only in meaning, even if representations are mutable."**  
> An assurance system must never silently overwrite or erase an earlier epistemic state. When a human reviewer modifies or downgrades a finding, the system produces a new **effective state**, but preserves the **deterministic baseline** immutably.

---

## 2. Test & Verification Baseline

| Metric | Previous (Phase 5) | Phase 6 Final | Status |
|---|---|---|---|
| **Total Tests** | 141 | **165** (+24 new tests) | ✅ PASS (0 failures) |
| **Test Suites** | 50 | **57** (+7 new suites) | ✅ PASS |
| **Adapter Typecheck** | Clean (`tsc --noEmit`) | Clean (`tsc --noEmit`) | ✅ PASS (0 errors) |
| **Diagnostic App Build** | Clean (`next build`) | Clean (`next build` in 2.0s) | ✅ PASS (0 errors) |

---

## 3. Settled Architectural Decisions (Phase 6 Methodology Audit)

### Decision 1: Deterministic Overrides Preserve Baseline Severity
- **Rule:** Never overwrite `baselineSeverity`.
- **Finding Model:** Every finding explicitly tracks:
  - `baselineSeverity`: Immutable conclusion of the deterministic engine (e.g. `critical`).
  - `disposition`: Reviewer disposition (`confirmed`, `downgraded`, `upgraded`, `rejected`, `accepted_with_exception`, `unresolved`).
  - `overrideReason`: Explicit textual justification for the human adjustment.
  - `decisionId`: Pointer to the append-only `ReviewDecision` row.
  - `effectiveSeverity`: The currently recognized severity (e.g. `medium`).
- **Audit Value:** An override is not an erasure; it is an auditable assurance event. Both the machine baseline and the human disposition are visible in reports.

### Decision 2: Server-Side Reviewer Session Boundary (No Fake Auth)
- **Rule:** Client input cannot supply identity or role.
- **Implementation:** `getServerReviewerSession()` resolves reviewer identity (`reviewerId`, `reviewerName`, `role`) server-side from environment variables (`DEV_REVIEWER_ID`, `DEV_REVIEWER_ROLE`) with safe fallback to `internal_validator`.
- **Extensibility:** The reviewer workflow programs against an abstract `ReviewerSession` interface, allowing plug-and-play replacement with production authentication and session tokens later without modifying domain logic.

### Decision 3: Canonical Assessment JSON is Authoritative; Markdown is a Projection
- **Rule:** Markdown is never the canonical assessment object.
- **Implementation:**
  1. `compileCanonicalAssessment()` compiles all snapshots, authority maps, findings, evidence, and decisions into a structured `CanonicalAssessment` object.
  2. `canonicalizeJson()` performs property-order-invariant serialization (recursively sorted keys).
  3. `attestAssessment()` computes a SHA-256 cryptographic hash of the canonical JSON (`CANONICAL-ASSESSMENT-SHA256`).
  4. `renderAssessmentMarkdown()` projects that canonical object into a human-readable Markdown report.
- **Reproducibility:** Identical assessment states yield byte-identical canonical JSON, identical attestation hashes, and identical markdown projections.

### Decision 4: Epistemic Definitions of Evidence Levels (Resolving Bootstrap Question 5)
- **E2 (Observed):** Evidence derived from actual runtime state, telemetry, live behavior, or operational records demonstrating that the condition exists in practice. (Independent of who collected it; source and collection method are recorded separately).
- **E3 (Validated):** A defined, reproducible validation procedure whose outcome can be reconstructed. Requires a structured `ValidationTestRecord` containing `testId`, `objective`, `preconditions`, `steps`, `expectedResult`, `observedResult`, `environment`, `testerIdentity`, and `outcome`.
- **E4 (Adversarially Tested):** An authorized test explicitly designed to bypass or subvert controls. Requires an `AdversarialTestRecord` including `authorizationScope`, `attackClass`, and `payloadMethod`.
- **Invariant Enforcement:** Upgrading a finding to E2+ without qualifying reviewer/test evidence is blocked. Upgrading to E3 without a reproducible test record is blocked. Upgrading to E4 without authorization details is blocked.

### Decision 5: The Five Trust Layers
Every finding in the Canonical Assessment and final report presents five distinct epistemic layers:
1. **Layer 1 (Self-Assessment Context):** Where the client positioned themselves (Track D quadrant and scores).
2. **Layer 2 (Client Claim):** What the client asserted in documentation or policy.
3. **Layer 3 (Claimed Evidence Level):** What evidence level the client claimed (E0-E4).
4. **Layer 4 (Recognized Evidence Level):** What evidence level the engine structurally recognized (capped at E1 for unverified claims).
5. **Layer 5 (Reviewer Attestation):** The human decision, reasoning, and upgraded evidence level.

---

## 4. Synthetic Corpus Vertical Slice Verification

### SYN-04: The Primary Vertical Slice (Autonomous Financial Transactions)
- **Deterministic Baseline:** Evaluates `Rule 1` on `edge-agent-payment-api` (`irreversible=true`, `requires_human_approval=false`). Generates a `critical` finding capped at `E1_documented`.
- **Reviewer Intervention:** Human validator executes a controlled sandbox validation test (`TEST-SYN04-VELOCITY-01`) demonstrating that a downstream payment gateway enforces an independent $50 daily velocity limit.
- **Evidence Upgrade:** Submits qualifying `E3_validated` test record with reproducible test steps.
- **Reviewer Override:** Dispatches `ReviewDecision` with disposition `downgraded`, `baselineSeverity: 'critical'`, `effectiveSeverity: 'medium'`, and detailed reasoning.
- **State Transition Result:**
  - `finding.baselineSeverity` remains `critical`.
  - `finding.effectiveSeverity` becomes `medium`.
  - `finding.evidenceLevel` upgrades from `E1_documented` to `E3_validated`.
  - `finding.disposition` becomes `downgraded`.
- **Compilation & Attestation:** Compiled into `CanonicalAssessment` with `overriddenCount: 1`, `evidenceUpgradesCount: 1`. Hashed into a deterministic SHA-256 attestation.

### SYN-05: Database Access Scope Contradiction Resolution
- **Corpus Scenario:** Architecture docs claim read-only database access; intake config contains a production connection string with `db_owner` permissions.
- **Reviewer Action:** Reviewer inspects live RDS IAM policies, verifies the connection string is active, and dispatches a `ContradictionDecision` with `disposition: 'resolved_in_favor_of_source_b'`.
- **Audit Trail:** Contradiction transitions from `unresolved` to `resolved_in_favor_of_source_b` with auditable reviewer reasoning.

### SYN-10: Illusory Human Approval Gate Exposure
- **Corpus Scenario:** Documentation sets `requires_human_approval=true`, but intake workflow describes an auto-acknowledge notification with 0ms timeout.
- **Reviewer Action:** Reviewer executes controlled validation test (`TEST-SYN10-AUTOACK`) proving the action executes automatically without user click.
- **Reviewer Decision:** Reviewer dispatches `ReviewDecision` upgrading evidence to `E3_validated` and confirming the `critical` severity, recording that the control is technically present but functionally meaningless.

---

## 5. Adversarial Reviewer Testing

| Adversarial Attack Vector | Attack Method | System Defense | Result |
|---|---|---|---|
| **Unsubstantiated E3 Upgrade** | Reviewer attempts to upgrade finding to E3 without providing test steps or outcome | `applyReviewDecision` asserts presence of complete `ValidationTestRecord` | 🛑 REJECTED: `E3_validated requires a reproducible ValidationTestRecord` |
| **Client-Sourced E2 Elevation** | Reviewer attempts to upgrade finding to E2 using client self-claim as evidence | Trigger invariant check blocks `source === 'client'` for E2+ upgrades | 🛑 REJECTED: `cannot be set to E2_observed with client-only evidence` |
| **Baseline Tampering** | External caller attempts to mutate `baselineSeverity` | `applyReviewDecision` clones finding and updates only `effectiveSeverity` | 🛡️ PROTECTED: Baseline remains immutable |
| **Attestation Tampering** | Attacker tampers with finding count or severity in canonical JSON | `attestAssessment` computes SHA-256 over canonicalized key-sorted JSON | 🛡️ PROTECTED: Hash mismatch immediately detects tampering |

---

## 6. Acceptance Criteria Verification Checklist

- [x] **AC-1:** Finding starts at E1 → reviewer submits qualifying evidence → finding upgrades to E2 (`tests/decision-engine.test.ts`).
- [x] **AC-2:** Finding at E1 → reviewer attempts E3 without reproducible test record → rejected (`tests/decision-engine.test.ts`).
- [x] **AC-3:** Client-submitted evidence alone cannot elevate a finding to E2+ (`tests/decision-engine.test.ts`).
- [x] **AC-4:** Report shows all Five Trust Layers for each finding (`tests/compiler.test.ts`, `tests/markdown-projection.test.ts`).
- [x] **AC-5:** Report includes Track D diagnostic context section with provenance disclaimer (`tests/markdown-projection.test.ts`).
- [x] **AC-6:** Report is reproducible and deterministic from the same canonical assessment data (`tests/markdown-projection.test.ts`).
- [x] **AC-7:** Deterministic baseline severity is permanently preserved and visible when reviewer overrides (`tests/decision-engine.test.ts`, `tests/vertical-slice-phase6.test.ts`).
- [x] **AC-8:** Reviewer disposition is explicitly recorded (`downgraded`, `upgraded`, `confirmed`, `rejected`) (`tests/decision-engine.test.ts`).
- [x] **AC-9:** Every reviewer decision requires non-empty recorded reasoning (`tests/decision-engine.test.ts`).
- [x] **AC-10:** Reviewer identity is resolved server-side from session boundary and never trusted from client input (`tests/session.test.ts`).
- [x] **AC-11:** Contradictions are first-class domain objects with explicit resolution states (`tests/decision-engine.test.ts`).
- [x] **AC-12:** Canonical Assessment JSON is the authoritative assessment object (`tests/compiler.test.ts`).
- [x] **AC-13:** Attestation generates a cryptographic SHA-256 hash over canonicalized JSON (`tests/compiler.test.ts`).
- [x] **AC-14:** SYN-04 runs through the full vertical slice (rules → E3 evidence → override → canonical JSON → attested report) (`tests/vertical-slice-phase6.test.ts`).
- [x] **AC-15:** SYN-05 contradiction is resolved by reviewer decision with audit trail (`tests/vertical-slice-phase6.test.ts`).
- [x] **AC-16:** SYN-10 illusory approval is unmasked and confirmed Critical with E3 test (`tests/vertical-slice-phase6.test.ts`).
- [x] **AC-17:** Evidence records capture source, collector, method, and timestamp independently of evidence level (`tests/reviewer-types.test.ts`).
- [x] **AC-18:** E3 evidence requires structured `ValidationTestRecord` (`tests/reviewer-types.test.ts`, `tests/decision-engine.test.ts`).
- [x] **AC-19:** E4 evidence requires structured `AdversarialTestRecord` with authorization scope (`tests/reviewer-types.test.ts`, `tests/decision-engine.test.ts`).
- [x] **AC-20:** Reviewer decisions form an append-only audit trail (`tests/decision-engine.test.ts`).
- [x] **AC-21:** Full regression suite passes: 165/165 tests passing across 57 suites with clean typecheck and build (`npm test`, `npm run build`).

## 7. Provenance Reconstruction & Data Model Integrity

Starting from any final finding, the reference chain traces backwards through persisted identifiers:
$$\text{Final Finding} \xrightarrow{} \text{Review Decision} \xrightarrow{} \text{Evidence Record} \xrightarrow{} \text{Authority Map Edge} \xrightarrow{} \text{System Snapshot} \xrightarrow{} \text{Source Hash / Raw Input}$$

1. **Finding → Decision:** `finding.decisionId` references `reviewDecision.id` in `reviewDecisions[]`.
2. **Decision → Evidence:** `reviewDecision.evidenceId` references `epistemicEvidence.id` in `evidenceLedger[]`.
3. **Evidence → Authority Map Element:** `finding.authorityMapEdgeId` links directly to `authorityMap.edges[].id`.
4. **Authority Map Element → System Snapshot:** `authorityMap.derivedAt` and `authorityMap.sourceArtifactHash` match `systemSnapshot.configHash`.
5. **System Snapshot → Original Raw Input:** `systemSnapshot.configHash` matches `selfAssessmentContext.sourceArtifactHash` and SHA-256 of raw intake JSON.

> **Epistemic Finding:** No provenance gaps were identified within the tested Phase 6 data model and synthetic scenarios.

---

## 8. Conclusion & Roadmap Completion

Phase 6 completes the entire MVP scope defined in `ROADMAP.md`. The repository now contains a complete, verified, evidence-aware assurance engine that bridges self-assessment intake, versioned snapshot identity, deterministic authority graph rules, bounded LLM interpretation, human reviewer oversight, and cryptographic attestation into a single provenance-preserving architecture.

