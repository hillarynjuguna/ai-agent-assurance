# Phase 6 Reviewer Workflow Implementation Plan

> **For Antigravity:** REQUIRED SUB-SKILL: Load executing-plans to implement this plan task-by-task.

**Goal:** Build the smallest vertical slice of the Phase 6 Reviewer Workflow demonstrating provenance-aware state transitions (finding → evidence → decision → canonical JSON → markdown → attestation).

**Architecture:** 
1. **Provenance-Aware Findings:** Findings will preserve `baseline_severity` (immutable) while deriving an `effective_severity` via a `disposition` applied by append-only `ReviewDecision`s.
2. **Mock Session Boundary:** A `getServerSession()` abstraction will resolve a development reviewer identity server-side, ensuring we never trust client-supplied reviewer IDs.
3. **Epistemic Evidence Definitions:** E2 denotes actual observation (independent of who collected it). E3/E4 require structured reproducibility and authorization data.
4. **Canonical State & Attestation:** The system will produce a Canonical Assessment JSON object, hash it to produce an Attestation, and project it deterministically into a 5-layer Markdown report.

**Tech Stack:** TypeScript, Node.js, Jest.

---

### Task 1: Update Domain Types for Provenance and Epistemic Evidence

**Files:**
- Modify: `tools/track-d-governability-audit/adapter/src/assurance-types.ts`
- Modify: `tools/track-d-governability-audit/adapter/src/findings.ts`
- Create: `tools/track-d-governability-audit/adapter/src/reviewer/types.ts`

**Step 1: Write the failing tests**
Create `tools/track-d-governability-audit/adapter/tests/reviewer-types.test.ts` to assert that `AssessmentFinding` requires both `baselineSeverity` and `effectiveSeverity`, and that `ReviewDecision` requires a `disposition`.

**Step 2: Run test to verify it fails**
Run: `npx jest tests/reviewer-types.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
Modify `assurance-types.ts` to include `EvidenceSource`, `EvidenceCollector`, `CollectionMethod` types. Add E3/E4 specific fields (test ID, preconditions, authorization scope, etc.) to the base Evidence interface.
Modify `findings.ts` to change `severity` to `baselineSeverity` and `effectiveSeverity`, and add `disposition` (confirmed, downgraded, upgraded, rejected, accepted_with_exception, unresolved).
Create `reviewer/types.ts` defining `ReviewDecision`, `ReviewerSession`, `CanonicalAssessment`, and `Attestation`.

**Step 4: Run test to verify it passes**
Run: `npx jest tests/reviewer-types.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add tools/track-d-governability-audit/adapter/src/assurance-types.ts tools/track-d-governability-audit/adapter/src/findings.ts tools/track-d-governability-audit/adapter/src/reviewer/types.ts tools/track-d-governability-audit/adapter/tests/reviewer-types.test.ts
git commit -m "feat(assurance): introduce provenance-aware finding and epistemic evidence types"
```

---

### Task 2: Implement Mock Session Boundary

**Files:**
- Create: `tools/track-d-governability-audit/adapter/src/reviewer/session.ts`
- Create: `tools/track-d-governability-audit/adapter/tests/session.test.ts`

**Step 1: Write the failing test**
Create `session.test.ts` testing `getServerReviewerSession()`. It should return a fixed dev identity from environment/config and not take client input.

**Step 2: Run test to verify it fails**
Run: `npx jest tests/session.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
Implement `getServerReviewerSession()` in `session.ts`. It reads from `process.env.DEV_REVIEWER_ID` and `process.env.DEV_REVIEWER_ROLE`, falling back to a default mock identity. Returns a `ReviewerSession` object.

**Step 4: Run test to verify it passes**
Run: `npx jest tests/session.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add tools/track-d-governability-audit/adapter/src/reviewer/session.ts tools/track-d-governability-audit/adapter/tests/session.test.ts
git commit -m "feat(reviewer): implement server-side mock session boundary"
```

---

### Task 3: Implement Decision State Machine

**Files:**
- Create: `tools/track-d-governability-audit/adapter/src/reviewer/engine.ts`
- Create: `tools/track-d-governability-audit/adapter/tests/decision-engine.test.ts`

**Step 1: Write the failing test**
Create `decision-engine.test.ts`. Create a deterministic finding (Critical). Apply a `ReviewDecision` (downgrade to Medium). Assert that the original finding object now has `effectiveSeverity: 'medium'`, `disposition: 'downgraded'`, but `baselineSeverity` remains `critical`.

**Step 2: Run test to verify it fails**
Run: `npx jest tests/decision-engine.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
Implement `applyReviewDecision(finding: AssessmentFinding, decision: ReviewDecision): AssessmentFinding` in `engine.ts`. This function clones the finding, updates the effective fields based on the decision, and attaches the `decisionId`.

**Step 4: Run test to verify it passes**
Run: `npx jest tests/decision-engine.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add tools/track-d-governability-audit/adapter/src/reviewer/engine.ts tools/track-d-governability-audit/adapter/tests/decision-engine.test.ts
git commit -m "feat(reviewer): implement decision engine for provenance-aware overrides"
```

---

### Task 4: Canonical JSON & Attestation

**Files:**
- Create: `tools/track-d-governability-audit/adapter/src/report/compiler.ts`
- Create: `tools/track-d-governability-audit/adapter/tests/compiler.test.ts`

**Step 1: Write the failing test**
Create `compiler.test.ts`. Test `compileCanonicalAssessment()` to ensure it outputs the full structured JSON. Test `attestAssessment()` to ensure it generates a SHA-256 hash of the deterministic JSON serialization.

**Step 2: Run test to verify it fails**
Run: `npx jest tests/compiler.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
Implement `compileCanonicalAssessment()` to aggregate Snapshot, Findings, Decisions, Evidence into a `CanonicalAssessment` interface.
Implement `attestAssessment(assessment: CanonicalAssessment)` which uses a stable stringify library (or sorted keys JSON.stringify) and `crypto.createHash('sha256')` to produce the attestation hash.

**Step 4: Run test to verify it passes**
Run: `npx jest tests/compiler.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add tools/track-d-governability-audit/adapter/src/report/compiler.ts tools/track-d-governability-audit/adapter/tests/compiler.test.ts
git commit -m "feat(report): implement canonical JSON assessment and hash attestation"
```

---

### Task 5: Deterministic Markdown Projection

**Files:**
- Create: `tools/track-d-governability-audit/adapter/src/report/markdown.ts`
- Create: `tools/track-d-governability-audit/adapter/tests/markdown-projection.test.ts`

**Step 1: Write the failing test**
Create `markdown-projection.test.ts` that passes a `CanonicalAssessment` with an overridden finding to `renderAssessmentMarkdown()`. Assert that the output explicitly contains "Deterministic baseline: critical", "Effective severity: medium", and the 5 trust layers.

**Step 2: Run test to verify it fails**
Run: `npx jest tests/markdown-projection.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
Implement `renderAssessmentMarkdown(assessment: CanonicalAssessment): string`. Iterate over findings and render the 5 trust layers as a table or blockquote sequence. Show the trail from Baseline -> Reviewer Decision -> Effective. Append the Attestation Hash at the bottom.

**Step 4: Run test to verify it passes**
Run: `npx jest tests/markdown-projection.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add tools/track-d-governability-audit/adapter/src/report/markdown.ts tools/track-d-governability-audit/adapter/tests/markdown-projection.test.ts
git commit -m "feat(report): project canonical JSON to 5-layer markdown report"
```

---

### Task 6: Vertical Slice Integration Test (SYN-04)

**Files:**
- Create: `tools/track-d-governability-audit/adapter/tests/vertical-slice-phase6.test.ts`

**Step 1: Write the failing test**
Create a full integration test:
1. Load SYN-04 (Financial transactions without human auth).
2. Deterministic rule fires (Critical, E1).
3. "Reviewer" fetches mock session.
4. "Reviewer" submits new E3 evidence (a tested compensatory control).
5. "Reviewer" submits `ReviewDecision` downgrading to Medium based on the E3 evidence.
6. Engine applies decision.
7. Compiler produces Canonical JSON.
8. Attestation hashes the JSON.
9. Markdown renderer projects the report.
Assert the hash exists and the markdown contains the full provenance chain.

**Step 2: Run test to verify it fails**
Run: `npx jest tests/vertical-slice-phase6.test.ts`
Expected: FAIL (or structural errors)

**Step 3: Write minimal implementation**
Assemble the imports and string them together in the test file. Fix any integration friction between the modules created in Tasks 1-5.

**Step 4: Run test to verify it passes**
Run: `npx jest tests/vertical-slice-phase6.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add tools/track-d-governability-audit/adapter/tests/vertical-slice-phase6.test.ts
git commit -m "test(integration): verify full phase 6 vertical slice transition"
```
