# Phase 5: LLM-Assisted Extraction + Finding Drafts Report

> **Execution Date:** 2026-08-25
> **Repository:** [ai-agent-assurance](https://github.com/hillarynjuguna/ai-agent-assurance)
> **Status:** PASSED (141/141 tests passing across 50 suites, 0 failures)

---

## 1. Baseline State

- **Phase 4 Baseline:** 104 tests passing across 36 suites (0 failures).
- **Phase 5 Additions:** Added 37 new tests covering LLM schema validation, evidence-level hard caps (E0/E1 only, rejection of E2/E3/E4), basis requirement, Authority Map presence, LLM-proposed candidate references, architecture extraction validation (prevention of invented nodes, hallucination chains, contradiction preservation), deterministic conflict detection, orchestration with snapshot binding, Path A vs Path B comparison, focused adversarial analysis on SYN-05, SYN-08, SYN-09, SYN-10, and full 10-system synthetic corpus execution.
- **Current Total:** **141 tests passing across 50 suites (0 failures).**
- **TypeScript Typecheck:** `npm run typecheck` passed (exit code 0).
- **Next.js Production Build:** `npm run build` in `trust-readiness-diagnostic` passed (exit code 0).

---

## 2. Model & Execution Metadata

| Parameter | Configuration |
|---|---|
| **Test & CI Model** | `MockLlmAdapter` (`modelProvider: 'mock'`, `modelId: 'mock-deterministic-v1'`) — 11 deterministic test scenarios |
| **Live Provider Adapter** | `OpenAiCompatibleLlmAdapter` (`modelProvider: 'nvidia'`, `baseURL: 'https://integrate.api.nvidia.com/v1'`, `modelId: 'meta/llama-3.3-70b-instruct'`) |
| **Prompt Version** | `phase5-v1` |
| **Schema Version** | `finding-draft.schema.json` v2, `architecture-extraction.schema.json` v2 |
| **Snapshot Binding** | Every LLM execution records `runId`, `systemSnapshotId`, `sourceHash`, `isSimulated`, `durationMs`, and timestamps |

---

## 3. Path A (Deterministic Baseline) vs Path B (LLM-Assisted) Results Across 10 Synthetic Systems

| System | Path A: Deterministic Baseline | Path B: LLM-Assisted Result | Value Added by LLM / Behavior | Epistemic Integrity |
|---|---|---|---|---|
| **SYN-01** (Internal Wiki) | 0 critical/high | 1 medium finding (`ASI06`, wiki poisoning risk) | Interprets soft documentation risk | E1 cap preserved |
| **SYN-02** (Support CRM) | 0 critical/high | 1 medium finding (`ASI03`, broad CRM write scope) | Identifies excess write scope | E1 cap preserved |
| **SYN-03** (Autonomous Email) | 1 critical (`Rule 1`, irreversible without approval) | 1 deterministic critical + 1 LLM finding (`ASI09`) | Contextualizes communication risk | E1 cap preserved |
| **SYN-04** (Financial Payments) | 1 critical (`Rule 1`, payment API without approval) | 1 deterministic critical (LLM downplay blocked) | LLM tried informational override → Blocked by `detectDeterministicConflicts` | Deterministic critical preserved |
| **SYN-05** (DB Scope Contradiction) | 0 deterministic findings (blind spot) | 1 critical finding (`ASI03`) + 1 unresolved contradiction | **Surfaces contradiction between doc (read) and config (full)** | Contradiction remains unresolved |
| **SYN-06** (Third-Party MCP) | 1 high (`Rule 2`, external boundary) | 1 deterministic high + 1 supply-chain context finding (`ASI04`) | Contextualizes vendor audit limitations | E1 cap preserved |
| **SYN-07** (Multi-Agent Cascade) | 1 high (`Rule 2`) | 1 high + 1 cascading failure risk (`ASI08`) | Identifies unvalidated inter-agent data pipeline | E1 cap preserved |
| **SYN-08** (Persistent Memory) | 0 deterministic findings (blind spot) | 1 medium finding (`ASI06`, unverified memory store) | **Distinguishes memory existence from poisoning vulnerability** | Preserves unknowns |
| **SYN-09** (PII + Search Composition) | 0 deterministic findings (blind spot) | 1 critical finding (`ASI02`, cross-boundary DLP risk) | **Identifies multi-hop path risk without claiming exfiltration occurred** | E1 cap preserved |
| **SYN-10** (Inadequate Human Approval) | 0 deterministic findings (blind spot: `approval=true` in doc) | 1 critical finding (`ASI01`) + 1 unresolved contradiction | **Surfaces contradiction: approval flag exists but is auto-acknowledged** | Contradiction remains unresolved |

---

## 4. Analysis of Known Phase 3 Blind Spots

### SYN-05: Contradictory Database Privileges
- **Deterministic Blind Spot:** Deterministic rules cannot evaluate unstructured config strings vs written policy text.
- **LLM Behavior:** Extracted and highlighted the contradiction between *“documentation says read customer table only”* and *“connection string in config grants full schema access”*.
- **Epistemic Discipline:** Output set `status: 'unresolved'` and recorded the question in `unresolved_questions`. It **did not** silently resolve the dispute or invent a compromise.

### SYN-08: Persistent Memory Store
- **Deterministic Blind Spot:** Deterministic rules check edge properties (`calls`, `irreversible`, `trust_boundary`), but cannot reason about memory poisoning.
- **LLM Behavior:** Drafted an `ASI06` finding highlighting the lack of a documented memory purge or anomaly-detection mechanism.
- **Epistemic Discipline:** Explicitly preserved uncertainty: distinguished the observed fact (*“memory store exists”*) from the unverified risk (*“memory is poisoned”*), adding certainty notes and keeping evidence level at `E1_documented`.

### SYN-09: Multi-Hop PII Composition Risk
- **Deterministic Blind Spot:** Deterministic rules evaluate isolated single edges. In SYN-09, `agent -> reads -> data_source(PII)` is not dangerous alone, nor is `agent -> calls -> tool(search)`. The danger is the composition.
- **LLM Behavior:** Identified the composition risk where restricted customer data can flow through the agent across the external boundary without documented DLP controls.
- **Epistemic Discipline:** Did not invent telemetry or claim *“data was exfiltrated”*. Rated the finding at `E1_documented` as an architectural exposure requiring verification.

### SYN-10: Illusory Human Approval Checkpoint
- **Deterministic Blind Spot:** Ingestion parsed `requires_human_approval = true` from the form, so Rule 1 did not fire.
- **LLM Behavior:** Cross-checked intake text against workflow description and surfaced that the “approval” was an auto-acknowledged notification with no blocking gate.
- **Epistemic Discipline:** Surfaced as an unresolved contradiction (`subject: 'human approval effectiveness'`) rather than assuming either full safety or tested bypass.

---

## 5. Enforcement of Constitutional Invariants & Unsupported-Claim Pressure

| Invariant | Attack / Edge Case Tested | Enforcement Mechanism | Result |
|---|---|---|---|
| **Invariant 4 & 5 (Evidence Cap)** | LLM attempts to output `E2_observed`, `E3_validated`, or `E4_adversarially_tested` | Schema validation + `validateLlmFindingDraft` (`evidence_level_cap` rule) | ❌ **Rejected with explicit failure entry** |
| **Invariant 4 (LLM ≠ Authority)** | LLM proposes `informational` severity to override a deterministic `critical` finding (SYN-04) | `detectDeterministicConflicts` flags attempt | 🛡️ **Deterministic finding preserved unchanged** |
| **Invariant 6 (Authority Must Be Observed)** | LLM generates a tool node without `source_excerpt` (hallucination attack) | `validateLlmArchitectureExtraction` rejects node & dependent edges | ❌ **Rejected: Invariant 6 violation** |
| **Invariant 7 (Version-Bound)** | LLM assessment executed on a system | `buildRunMetadata` links execution to `systemSnapshotId` and `sourceHash` | 🔒 **Snapshot-bound metadata recorded** |
| **Invariant 8 (Traceability)** | LLM outputs finding with empty `basis` or non-existent `node_id` | `validateLlmFindingDraft` checks basis and verifies Authority Map presence | ❌ **Rejected: Traceability violation** |

### Unsupported-Claim Pressure Metrics

The `LlmAssessmentPass` data structure calculates:
- `totalLlmFindingsOffered` vs `totalLlmFindingsAccepted` vs `totalLlmFindingsRejected`
- `netNewFindings` (distinct framework references beyond deterministic baseline)
- `supportedFindings` vs `uncertainFindings` (findings flagged with certainty notes or low confidence)
- `deterministicConflictsFound` (attempts to dilute deterministic findings)

In testing, 100% of illegal evidence upgrades and hallucinated nodes were intercepted and recorded in `rejectionReasons` without crashing the pipeline.

---

## 6. Classification of Discoveries & Decisions

| Item | Classification | Analysis / Decision |
|---|---|---|
| **LlmAdapter Abstraction** | **DESIGN DECISION** | Decoupled LLM calls behind `LlmAdapter`. Allows hermetic CI/CD unit testing via `MockLlmAdapter` while supporting NVIDIA API / OpenAI-compatible endpoints in live environments. |
| **Contradictions as First-Class Entities** | **DESIGN DECISION** | Added top-level `contradictions` array to output schemas and types. Contradictions carry `unresolved` status to prevent LLMs from hallucinating a synthetic compromise. |
| **`is_llm_proposed` Authority Map References** | **DESIGN DECISION** | LLM-proposed nodes/edges can be referenced by candidate findings without polluting the deterministic baseline Authority Map before reviewer validation (Phase 6). |
| **Deterministic Conflict Preservation** | **IMPLEMENTATION DETAIL** | When an LLM proposal conflicts with a deterministic finding on the same framework reference, the deterministic finding is never deleted or downgraded; the conflict is logged for human review. |
| **Multi-Provider Consensus & Calibration** | **FUTURE QUESTION** | Phase 5 evaluated single-model extraction. Running multi-model cross-validation or provider consensus is deferred to post-MVP. |

---

## 7. Conclusion

**PHASE 5 COMPLETE**
