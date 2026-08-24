# Phase 4: Versioned System Identity & Canonical Assessed Object Report

> **Execution Date:** 2026-08-24
> **Repository:** [ai-agent-assurance](https://github.com/hillarynjuguna/ai-agent-assurance)
> **Status:** PASSED (104/104 tests passing)

---

## 1. Baseline State

- **Phase 3 Baseline:** 90 tests passing across 28 suites (0 failures).
- **Phase 4 Additions:** Added 14 new tests covering SystemSnapshot creation, unversioned source handling, deterministic hash reproducibility, Option A snapshot identity policy, Assessment/Finding traceability chain, Snapshot Diff detection (nodes, edges, approval, reversibility, boundaries, permissions), and Structured Reassessment Triggers.
- **Current Total:** **104 tests passing across 36 suites (0 failures).**
- **TypeScript Typecheck:** `npm run typecheck` passed (exit code 0).
- **Next.js Production Build:** `npm run build` in `trust-readiness-diagnostic` passed (exit code 0).

---

## 2. Canonical Assessed Object & System Snapshot Model

To enforce **Invariant 7: Assessment is version-bound**, Phase 4 introduces the `SystemSnapshot` canonical entity:

```typescript
export interface SystemSnapshot {
  id: string;                      // Deterministic: "snapshot-<systemId>-<shortHash>"
  systemId: string;                // Target system identifier
  sourceVersion: string | null;    // Source-provided version (e.g. "6.1.0" or client version), or null
  configHash: string;              // SHA-256 content hash of source configuration
  capturedAt: string;              // ISO timestamp of snapshot capture
  authorityMapId: string;          // Identifier of associated Authority Map
  authorityMap: SeededAuthorityMap;// Frozen Authority Map state
  metadata: Record<string, unknown>;
}
```

### Identity Policy Decision: Option A (State of System)
- **Policy Choice:** A `SystemSnapshot` represents the **exact, immutable state of the system** (`system_id` + `config_hash`), rather than an assessment instance record.
- **Behavior:**
  - If identical source configuration is assessed at different times (Assessment A and Assessment B), both assessments anchor to the **same underlying snapshot identity**.
  - Assessments remain distinct operational records, and findings are individually attributed to their specific assessment instance.
  - If the source configuration changes by even 1 byte, a **new, distinct snapshot** is minted with a new `configHash`.

---

## 3. Full Invariant Traceability Chain (Invariants 7 & 8)

The system now enforces an unbroken, deterministic traceability chain:

$$\text{Finding} \longrightarrow \text{Assessment} \longrightarrow \text{System Snapshot} \longrightarrow \text{Authority Map Element} \longrightarrow \text{Source Export / Content Hash}$$

1. **Finding Level:** Every finding stores `assessmentId`, `authorityMapNodeId` or `authorityMapEdgeId`, `frameworkRefs`, `severity`, `confidence`, and is capped at `E1_documented`.
2. **Assessment Level:** Every assessment record stores `system_id`, `system_snapshot_id`, `source_hash`, `floor_conditions`, and translated domain result.
3. **Snapshot Level:** Every snapshot stores the frozen `SeededAuthorityMap`, `configHash`, and `capturedAt`.
4. **Source Provenance:** Every Authority Map node and edge stores explicit provenance metadata (`source: 'track_d_export'`, `dimension`, `field`, `value`, `derivationRule`).

---

## 4. Snapshot Diff & Structured Reassessment Triggers

Phase 4 implements a lightweight, deterministic diff engine (`diffSystemSnapshots`) and rule-based reassessment trigger evaluator (`evaluateReassessmentTriggers`):

| Diff Change Detected | Trigger Condition Generated | Operational Meaning |
|---|---|---|
| Edge `actionReversibility` changed | `irreversibility_changed` | Action shifted between reversible, partially reversible, or irreversible. |
| Edge `requiresHumanApproval` changed | `human_approval_changed` | Human override checkpoint was introduced or removed. |
| Edge `trustBoundary` changed | `trust_boundary_changed` | Network/organization boundary shifted (e.g. internal -> external). |
| Edge `permissionScope` changed | `permission_changed` | Authorization scope expanded or contracted. |
| Node of type `api` or `tool` added | `tool_added`, `authority_changed` | New capability/endpoint exposed to the agent. |
| Node of type `external_agent` added | `external_boundary_changed`, `authority_changed` | Downstream delegation chain extended to third party. |
| Node of type `model` added/changed | `model_changed`, `authority_changed` | Underlying foundation model or safety card modified. |
| Structural node/edge added/removed | `authority_changed` | System architecture modified. |

---

## 5. Synthetic Corpus Demonstration & State Evolution

All 10 systems in `08-synthetic-corpus.json` were evaluated through the snapshot pipeline:
- **SYN-01 through SYN-10:** Each system generated a frozen `SystemSnapshot`, bound Authority Map, and traceable findings.
- **State Evolution Test (SYN-04):**
  - **State A (Unapproved Payment):** Snapshot A created (`hashA`). Rule 1 fires a **Critical** finding (`ASI01`).
  - **State B (Remediated with Human Approval):** Snapshot B created (`hashB`). Diff detects `requiresHumanApproval: false -> true`.
  - **Diff & Trigger:** Reassessment triggered with `human_approval_changed`.
  - **Assessment B Result:** **0 Critical findings**; finding successfully resolved in State B without altering historical State A findings.

---

## 6. Classification of Defects, Discoveries & Decisions

| Item | Classification | Analysis / Decision |
|---|---|---|
| **Snapshot Identity Policy (Option A)** | **DESIGN DECISION** | Adopted Option A: snapshot represents immutable system state (`system_id` + `config_hash`). Multiple assessments of identical state share the snapshot ID while maintaining distinct assessment and finding records. |
| **Separation of Source Version vs Snapshot ID** | **DESIGN DECISION** | `sourceVersion` preserves client-provided semantic version (or null), while `snapshotId` is deterministically generated (`snapshot-<systemId>-<shortHash>`). |
| **Volatile Timestamps Excluded from Content Hash** | **IMPLEMENTATION DETAIL** | `capturedAt` and `receivedAt` are separate metadata fields. `configHash` is strictly computed from raw submission JSON text, ensuring 100% hash reproducibility across machines. |
| **Continuous Monitoring Boundary** | **FUTURE QUESTION** | Reassessment triggers provide structured condition evaluation over diffs; continuous runtime listeners remain deferred until post-v0.1. |

---

## 7. Phase Status

**PHASE 4 COMPLETE**
