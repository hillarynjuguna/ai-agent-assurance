# Phase 3: Authority Map Seeding, Deterministic Rules, and Synthetic Corpus Report

> **Execution Date:** 2026-08-24
> **Repository:** [ai-agent-assurance](https://github.com/hillarynjuguna/ai-agent-assurance)
> **Status:** PASSED (90/90 tests passing)

---

## 1. Baseline State

- **Phase 2 Baseline:** 64/64 tests passing across 19 suites.
- **Phase 3 Additions:** Added 26 new tests covering Authority Map seeding, source traceability, focused rule execution (Rules 1, 2, 3, 4/D10), unknown-state refusal, weak/strong fixture execution, and the full 10-system synthetic corpus experiment.
- **Current Total:** **90 tests passing across 28 suites (0 failures).**
- **TypeScript Typecheck:** `npm run typecheck` passed (exit code 0).
- **Next.js Production Build:** `npm run build` in `trust-readiness-diagnostic` passed (exit code 0).

---

## 2. Authority Map Mapping from Track D Export

The Phase 3 Authority Map Seeder (`tools/track-d-governability-audit/adapter/src/authority-map-seed.ts`) maps only explicitly exported facts and notes into Authority Map nodes and edges:

| Track D Dimension / Field | Authority Map Target | Derivation & Epistemic Rule |
|---|---|---|
| **Metadata** (`company`, `criticality`, `audience`) | `node(type='agent')` | Primary agent node representing the assessed autonomous agent. |
| **D1 Reversibility** (`cap`, `notes`) | `edge.action_reversibility` | `irreversible` if `cap=0` or notes indicate irreversible actions/orders/charges; `partially_reversible` if `cap=1`; `reversible` if `cap>=2`; `unknown` if N/A or unset. |
| **D3 Human Override** (`cap`, `notes`) | `edge.requires_human_approval` | `false` if `cap=0`; `true` if `cap>=2`; `unknown` (`undefined`) if `cap=1` or ambiguous. |
| **D5 Delegation** (`cap`, `notes`) | `edge(edge_type='delegates_to')` + `node(type='external_agent')` | Only created if D5 is assessed and indicates downstream delegation. `trust_boundary` derived from notes (`internal`, `partner`, `external`). |
| **D8 Model Provenance** (`cap`, `notes`) | `node(type='model')` + `edge(edge_type='reads')` | Only created if D8 auditor notes name a specific foundation model or safety card. |
| **D10 Containment** (`cap`, `notes`) | `edge.trust_boundary` + `node.metadata.containment` | Derived from notes if stated (`internal`, `partner`, `external`); defaults to `external` / `containment=false` if `cap=0`. |

Every seeded node and edge includes `provenance` metadata recording: `source: 'track_d_export'`, `dimension`, `field`, `value`, and `derivationRule`.

---

## 3. Deterministic Rules Execution Engine

The rules engine (`tools/track-d-governability-audit/adapter/src/rules/execute.ts`) operates purely against Authority Map graph structure without knowledge of Track D fields:

| Rule | Graph Condition Evaluated | Severity | Confidence | Evidence Level | Framework Refs |
|---|---|---|---|---|---|
| **Rule 1** | `edge.edgeType = 'calls'` AND `edge.actionReversibility = 'irreversible'` AND `edge.requiresHumanApproval = false` | Critical | Moderate | `E1_documented` | `ASI01` |
| **Rule 2** | `edge.edgeType = 'delegates_to'` AND `target_node.nodeType = 'external_agent'` AND `edge.trustBoundary IN ('external', 'unknown')` | High | Moderate | `E1_documented` | `ASI07`, `ASI09` |
| **Rule 3** | `node.nodeType = 'identity'` AND `connected_edges > 1` AND `permission_scopes_differ` | High | Moderate | `E1_documented` | `ASI03` |
| **Rule 4 (D10)** | `edge.trustBoundary = 'external'` AND `edge.actionReversibility = 'irreversible'` AND `no_containment` | High | Moderate | `E1_documented` | `ASI08`, `D10` |

---

## 4. Synthetic Corpus Experiment Results (`08-synthetic-corpus.json`)

All 10 systems from the synthetic corpus were evaluated through the Phase 3 graph extraction and deterministic rule engine:

| System ID | Name / Description | Authority Map Structure | Unknown Fields | Deterministic Rules Fired | Findings Produced | Evidence Level | Floor Conditions |
|---|---|---|---|---|---|---|---|
| **SYN-01** | Read-only internal knowledge agent | 2 nodes (`agent`, `wiki`), 1 edge (`reads`) | None | None (Rules correctly refrained) | 0 critical/high findings (Baseline read-only safe) | N/A | None |
| **SYN-02** | Customer-support CRM + draft email | 3 nodes (`agent`, `crm`, `email_tool`), 2 edges (`reads`, `calls`) | None | None (`requires_human_approval = true` blocked Rule 1) | 0 critical findings | N/A | None |
| **SYN-03** | Autonomous email sender | 2 nodes (`agent`, `send_email`), 1 edge (`calls`) | None | Rule 1 (ASI01) | 1 Critical finding (Irreversible unapproved email) | `E1_documented` | None |
| **SYN-04** | Financial transaction payment API | 2 nodes (`agent`, `payment_api`), 1 edge (`calls`) | None | Rule 1 (ASI01) | 1 Critical finding (Irreversible unapproved payment) | `E1_documented` | D3 (if in intake) |
| **SYN-05** | Excessive DB privileges | 2 nodes (`agent`, `db`), 1 edge (`reads`) | Config contradiction | None (Single read edge; requires LLM extraction for contradiction) | 0 from deterministic rules | N/A | None |
| **SYN-06** | Third-party MCP server delegation | 2 nodes (`agent`, `external_agent`), 1 edge (`delegates_to`) | None | Rule 2 (ASI07/09) | 1 High finding (External unaudited delegation) | `E1_documented` | None |
| **SYN-07** | Multi-agent coordinator system | 3 nodes (`agent`, `sub1`, `sub2`), 2 edges (`delegates_to`) | None | Rule 2 (ASI07/09) on both edges | 2 High findings (Unbounded sub-agent delegation) | `E1_documented` | None |
| **SYN-08** | Persistent long-term memory | 2 nodes (`agent`, `memory`), 1 edge (`writes`) | None | None (Single internal write; requires LLM for semantic poisoning) | 0 from deterministic rules | N/A | None |
| **SYN-09** | PII read + External search tool call | 3 nodes (`agent`, `pii`, `search_tool`), 2 edges (`reads`, `calls`) | None | None (Single edges individually safe; requires path-level composition) | 0 from deterministic rules | N/A | None |
| **SYN-10** | Meaningless auto-ack human approval | 2 nodes (`agent`, `tool`), 1 edge (`calls`) | Intake contradiction | Rule 1 (ASI01) when approval discovered as false | 1 Critical finding (Unapproved irreversible action) | `E1_documented` | D3 Floor Rule |

---

## 5. Unexpected Findings & Methodological Discoveries

1. **Deterministic Separation of Concerns (Synthetic Baseline Boundary):**
   - Systems like **SYN-01**, **SYN-03**, **SYN-04**, **SYN-06**, **SYN-07**, and **SYN-10** map cleanly to single-edge or single-node deterministic rules (Rules 1, 2, 4).
   - Systems like **SYN-05** (cross-document configuration contradiction), **SYN-08** (semantic memory poisoning), and **SYN-09** (multi-hop PII-to-external DLP composition) correctly produce *no* false deterministic rule firings. They demonstrate the exact boundary where LLM-assisted extraction and path-level reasoning (Phase 5) will be required.

2. **Conservative Handling of Unknown States:**
   - When `requiresHumanApproval` is ambiguous / unknown (`undefined`), Rule 1 strictly refuses to fire.
   - When `actionReversibility` is unknown, Rule 1 and Rule 4 strictly refuse to fire.
   - The engine does NOT convert missing data into assumed safety or assumed guilt.

3. **Traceability & Integrity Invariants (Invariants 1, 6, 8):**
   - Every generated `AssessmentFinding` is linked to an `authorityMapEdgeId` or `authorityMapNodeId`.
   - All findings are created at `evidence_level = 'E1_documented'` and `drafted_by = 'deterministic_rule_engine'`.
   - Zero findings at `E2`, `E3`, or `E4` were generated during automated diagnostic intake.

---

## 6. Classification of Defects & Discoveries

| Item | Classification | Analysis / Resolution |
|---|---|---|
| **D1 Reversibility Interpretation** | **METHODOLOGY QUESTION** | Track D's D1 measures governance classification maturity, whereas the Authority Map requires the physical reversibility of the agent's actions. Seeder inspects D1/D3 notes for irreversible action indicators (e.g. orders, charges) while keeping unknown states conservative. |
| **SYN-09 Multi-Hop Composition** | **FUTURE QUESTION** | SYN-09 requires path-level graph reasoning (`reads(PII)` -> `calls(external_tool)`). Deferred to Framework Mapper / LLM integration in Phase 5. |
| **Session Actor Authentication** | **IMPLEMENTATION DETAIL** | Maintained from Phase 2: API routes authenticate actor roles and assign `submitted_by_type` server-side. |

---

## 7. Phase Status

**PHASE 3 COMPLETE**
