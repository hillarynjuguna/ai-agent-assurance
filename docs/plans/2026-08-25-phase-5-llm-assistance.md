# Phase 5: LLM-Assisted Extraction + Finding Drafts — Implementation Plan

> **For Antigravity:** REQUIRED SUB-SKILL: Load executing-plans to implement this plan task-by-task.

**Goal:** Wire real LLM calls into the assessment pipeline via a deterministically-constrained adapter, run the 10-system synthetic corpus through both the deterministic and LLM-assisted paths, and produce a measured experimental comparison.

**Architecture:** A `LlmAdapter` interface abstracts provider details. A validation layer (`validate.ts`) enforces all invariants on LLM output before it can become a candidate finding. Contradiction representation is a first-class output type. Tests use a fully-deterministic mock that exercises the validation layer without real API costs.

**Tech Stack:** TypeScript strict, Node.js test runner (existing), `ajv` for JSON schema validation, existing adapter types. LLM provider abstracted behind interface — `MockLlmAdapter` used in all tests.

---

## Baseline Verification

```powershell
cd tools/track-d-governability-audit/adapter
npm test       # → 104 tests, 0 failures
npm run typecheck  # → exit 0
```

---

## Task 1: Extend the JSON Schemas

**Files:**
- Modify: `docs/assurance-mvp-spec/src/schemas/finding-draft.schema.json`
- Modify: `docs/assurance-mvp-spec/src/schemas/architecture-extraction.schema.json`

### Step 1a: Update `finding-draft.schema.json`

Replace entire file with:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FindingDraftOutput",
  "description": "Structured LLM finding-draft output. evidence_level is capped at E1 by schema.",
  "type": "object",
  "required": ["findings", "contradictions", "unknowns"],
  "properties": {
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title","description","severity","confidence","evidence_level","framework_reference_code","authority_map_ref","basis"],
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "severity": { "enum": ["critical","high","medium","low","informational"] },
          "confidence": { "enum": ["low","moderate","high"] },
          "evidence_level": {
            "enum": ["E0_claimed","E1_documented"],
            "description": "HARD CAP. Cannot express E2 or above."
          },
          "framework_reference_code": { "type": "string" },
          "authority_map_ref": {
            "type": "object",
            "properties": {
              "node_id": { "type": "string" },
              "edge_id": { "type": "string" },
              "is_llm_proposed": { "type": "boolean" }
            }
          },
          "basis": { "type": "string" },
          "self_assessed_certainty_note": { "type": "string" }
        },
        "additionalProperties": false
      }
    },
    "contradictions": {
      "type": "array",
      "description": "Explicit contradictions found in source material. NOT resolved by LLM.",
      "items": {
        "type": "object",
        "required": ["subject","source_a_excerpt","source_b_excerpt","status"],
        "properties": {
          "subject": { "type": "string" },
          "source_a_excerpt": { "type": "string" },
          "source_b_excerpt": { "type": "string" },
          "status": { "enum": ["unresolved"] }
        },
        "additionalProperties": false
      }
    },
    "unknowns": {
      "type": "array",
      "description": "Things the LLM could not determine from source material.",
      "items": { "type": "string" }
    }
  },
  "additionalProperties": false
}
```

### Step 1b: Update `architecture-extraction.schema.json`

Add `"contradictions"` to `required` and add the property:

```json
"contradictions": {
  "type": "array",
  "description": "Explicit source-material contradictions found during extraction.",
  "items": {
    "type": "object",
    "required": ["subject","source_a_excerpt","source_b_excerpt","status"],
    "properties": {
      "subject": { "type": "string" },
      "source_a_excerpt": { "type": "string" },
      "source_b_excerpt": { "type": "string" },
      "status": { "enum": ["unresolved"] }
    },
    "additionalProperties": false
  }
}
```

### Step 1c: Verify schemas are valid JSON
```powershell
node -e "JSON.parse(require('fs').readFileSync('docs/assurance-mvp-spec/src/schemas/finding-draft.schema.json','utf8')); console.log('finding-draft OK')"
node -e "JSON.parse(require('fs').readFileSync('docs/assurance-mvp-spec/src/schemas/architecture-extraction.schema.json','utf8')); console.log('arch-extract OK')"
```
Expected: both print OK.

### Step 1d: Commit
```
git add docs/assurance-mvp-spec/src/schemas/
git commit -m "feat(phase5): extend LLM output schemas with contradictions and unknowns"
```

---

## Task 2: LLM Types + Adapter Interface

**Files:**
- Create: `tools/track-d-governability-audit/adapter/src/llm/types.ts`
- Create: `tools/track-d-governability-audit/adapter/src/llm/adapter.ts`
- Create: `tools/track-d-governability-audit/adapter/src/llm/index.ts`

### Step 2a: Create `adapter/src/llm/types.ts`

```typescript
/**
 * Phase 5 LLM types — structural contracts for all LLM-produced objects.
 */

export type LlmEvidenceLevel = 'E0_claimed' | 'E1_documented';
export type LlmSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type LlmConfidence = 'low' | 'moderate' | 'high';

export interface LlmCandidateFinding {
  title: string;
  description: string;
  severity: LlmSeverity;
  confidence: LlmConfidence;
  /** HARD CAP — schema prevents E2+. */
  evidence_level: LlmEvidenceLevel;
  framework_reference_code: string;
  authority_map_ref: {
    node_id?: string;
    edge_id?: string;
    is_llm_proposed?: boolean;
  };
  basis: string;
  self_assessed_certainty_note?: string;
}

export interface LlmContradiction {
  subject: string;
  source_a_excerpt: string;
  source_b_excerpt: string;
  status: 'unresolved';
}

export interface LlmFindingDraftOutput {
  findings: LlmCandidateFinding[];
  contradictions: LlmContradiction[];
  unknowns: string[];
}

export interface LlmCandidateNode {
  temp_id: string;
  node_type: 'agent' | 'model' | 'memory' | 'tool' | 'api' | 'data_source' | 'external_agent' | 'identity';
  name: string;
  identity?: string;
  source_excerpt: string;
}

export interface LlmCandidateEdge {
  source_temp_id: string;
  target_temp_id: string;
  edge_type: 'reads' | 'writes' | 'calls' | 'delegates_to' | 'authenticates_as';
  permission_scope: string;
  requires_human_approval: boolean | null;
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted' | null;
  action_reversibility: 'reversible' | 'partially_reversible' | 'irreversible' | null;
  source_excerpt: string;
}

export interface LlmArchitectureExtractionOutput {
  nodes: LlmCandidateNode[];
  edges: LlmCandidateEdge[];
  extraction_confidence: LlmConfidence;
  unresolved_questions: string[];
  contradictions: LlmContradiction[];
}

export interface LlmRunMetadata {
  runId: string;
  systemSnapshotId: string;
  sourceHash: string;
  modelProvider: string;
  modelId: string;
  promptVersion: string;
  executedAt: string;
  durationMs: number;
  isSimulated: boolean;
}

export interface LlmAssessmentResult {
  runMetadata: LlmRunMetadata;
  architectureExtraction: LlmArchitectureExtractionOutput;
  findingDraft: LlmFindingDraftOutput;
}
```

### Step 2b: Create `adapter/src/llm/adapter.ts`

```typescript
import type { SeededAuthorityMap } from '../authority-map-seed';
import type { SoftDimensionDraftBatch } from '../soft-dimensions';
import type { LlmArchitectureExtractionOutput, LlmFindingDraftOutput, LlmRunMetadata } from './types';

export interface LlmAdapter {
  readonly modelProvider: string;
  readonly modelId: string;
  readonly promptVersion: string;

  extractArchitecture(
    systemId: string,
    systemDescription: string,
    authorityMapSummary: string,
    existingMap: SeededAuthorityMap
  ): Promise<LlmArchitectureExtractionOutput>;

  draftFindings(
    systemSnapshotId: string,
    softDimensions: SoftDimensionDraftBatch,
    existingMap: SeededAuthorityMap,
    systemDescription: string,
    authorityMapSummary: string
  ): Promise<LlmFindingDraftOutput>;
}

export function buildRunMetadata(
  adapter: LlmAdapter,
  systemSnapshotId: string,
  sourceHash: string,
  executedAt: string,
  durationMs: number,
  isSimulated: boolean
): LlmRunMetadata {
  return {
    runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    systemSnapshotId,
    sourceHash,
    modelProvider: adapter.modelProvider,
    modelId: adapter.modelId,
    promptVersion: adapter.promptVersion,
    executedAt,
    durationMs,
    isSimulated,
  };
}
```

### Step 2c: Create `adapter/src/llm/index.ts`

```typescript
export * from './types';
export * from './adapter';
```

### Step 2d: Typecheck and commit
```powershell
npm run typecheck   # exit 0
git add tools/track-d-governability-audit/adapter/src/llm/
git commit -m "feat(phase5): add LlmAdapter interface and canonical LLM types"
```

---

## Task 3: Deterministic Mock LLM Adapter

**File:** `tools/track-d-governability-audit/adapter/src/llm/mock-adapter.ts`

Create the full file with these scenarios:
- `valid_minimal` — clean E1 finding, good ref, proper basis
- `valid_with_contradiction_syn05` — contradicting DB privilege sources (for SYN-05)
- `valid_with_contradiction_syn10` — contradicting human approval (for SYN-10)
- `valid_memory_risk_syn08` — memory exists ≠ poisoning, preserves unknowns (for SYN-08)
- `valid_pii_boundary_syn09` — multi-hop composition risk, does NOT claim exfiltration (for SYN-09)
- `invalid_e2_attempt` — tries E2_observed → validation rejects
- `invalid_e3_attempt` — tries E3_validated → validation rejects
- `invalid_missing_basis` — empty basis → validation rejects
- `invalid_missing_authority_ref` — no node_id/edge_id → validation rejects
- `hallucination_invented_node` — node with empty source_excerpt → validation rejects
- `deterministic_override_attempt` — informational finding that conflicts with critical deterministic

```typescript
export type MockScenario =
  | 'valid_minimal'
  | 'valid_with_contradiction_syn05'
  | 'valid_with_contradiction_syn10'
  | 'invalid_e2_attempt'
  | 'invalid_e3_attempt'
  | 'invalid_missing_basis'
  | 'invalid_missing_authority_ref'
  | 'hallucination_invented_node'
  | 'valid_memory_risk_syn08'
  | 'valid_pii_boundary_syn09'
  | 'deterministic_override_attempt';
```

See full implementation in the code file — each scenario returns the exact outputs needed for tests.

Typecheck and commit:
```
git add tools/track-d-governability-audit/adapter/src/llm/mock-adapter.ts
git commit -m "feat(phase5): add deterministic MockLlmAdapter with 11 test scenarios"
```

---

## Task 4: Deterministic Validation Layer

**File:** `tools/track-d-governability-audit/adapter/src/llm/validate.ts`

Implements:
- `validateLlmFindingDraft(output, authorityMap, snapshotId) → FindingValidationResult`
- `validateLlmArchitectureExtraction(output, authorityMap) → ArchitectureValidationResult`
- `detectDeterministicConflicts(detFindings, llmFindings) → DeterministicConflict[]`

Rules enforced by `validateLlmFindingDraft`:
1. `evidence_level` must be E0 or E1 — rejects E2/E3/E4 (`evidence_level_cap`)
2. `basis` must be non-empty (`traceability_basis_required`)
3. `authority_map_ref` must have at least `node_id` or `edge_id` (`authority_map_traceability`)
4. Referenced node/edge must exist in the current snapshot map, unless `is_llm_proposed=true` (`authority_map_existence`)

Rules enforced by `validateLlmArchitectureExtraction`:
1. Every node must have non-empty `source_excerpt` — no invention (Invariant 6)
2. Edges must reference only accepted (non-rejected) nodes

`detectDeterministicConflicts` compares severity ranks: if LLM proposes lower severity for same framework ref, records a `DeterministicConflict` with `resolution: 'deterministic_finding_preserved'`.

Typecheck and commit:
```
git commit -m "feat(phase5): add deterministic LLM output validation layer"
```

---

## Task 5: LLM Assessment Orchestrator

**File:** `tools/track-d-governability-audit/adapter/src/llm/orchestrate.ts`

Exports:
- `runLlmAssessmentPass(adapter, systemId, snapshotId, ...) → LlmAssessmentPass`
- `compareAssessmentPaths(systemId, snapshotId, pathA, pathB, error) → SystemComparisonResult`

`LlmAssessmentPass` contains:
- `runMetadata` (snapshot-bound, records isSimulated)
- `architectureValidation` (with nodeRejections, edgeRejections)
- `findingValidation` (with accepted, rejected, validationSummary)
- `deterministicConflicts`
- `contradictions`, `unknowns`
- `pressureMetrics` (unsupported-claim pressure measurement)

`pressureMetrics` fields:
- `totalLlmFindingsOffered / Accepted / Rejected`
- `totalContradictions`, `totalUnknowns`
- `deterministicConflictsFound`
- `netNewFindings` — LLM findings not duplicating any deterministic framework ref
- `supportedFindings`, `uncertainFindings`

Update `llm/index.ts` to also export from `orchestrate.ts` and `validate.ts`.

Typecheck and commit:
```
git commit -m "feat(phase5): add LLM assessment orchestrator and Path A/B comparison engine"
```

---

## Task 6: Update Adapter Barrel Exports

Add to `tools/track-d-governability-audit/adapter/src/index.ts`:
```typescript
export * from './llm';
```

Typecheck and commit.

---

## Task 7: Phase 5 Test Suite

**File:** `tools/track-d-governability-audit/adapter/tests/llm-assistance.test.ts`

Test groups (all use `MockLlmAdapter`, zero HTTP):

| Group | Tests |
|-------|-------|
| Schema Validation — Evidence Level Cap | E0 accepted, E1 accepted, E2 rejected, E3 rejected, E4 rejected |
| Schema Validation — Basis | Empty basis rejected |
| Schema Validation — Authority Map Ref | No ref rejected, non-existent ref rejected, known ref accepted, LLM-proposed ref accepted |
| Architecture Extraction | Invented node rejected, valid node accepted, hallucination chain rejected, contradictions preserved |
| Deterministic Conflict | LLM lower-severity detected + flagged, non-conflicting not flagged |
| Orchestration Layer | Full pass binds to snapshot, E2 attempt rejected end-to-end, conflict recorded |
| Path A vs B Comparison | Net new findings captured, LLM error handled gracefully |
| SYN-05 | Contradiction surfaced and unresolved, architecture extraction also surfaces it |
| SYN-08 | Memory existence ≠ poisoning, unknowns preserved |
| SYN-09 | Multi-hop risk found, evidence stays at E1, no exfiltration claim |
| SYN-10 | Human approval contradiction surfaced and unresolved |
| Hallucination Attack | Invented node blocked by source_excerpt check |
| 10-System Corpus | All 10 systems produce snapshot-bound results, no finding exceeds E1, contradictions unresolved |

### Step 7b: Run tests
```powershell
npm test
```
Expected: 104 existing + Phase 5 new tests. Zero failures.

### Step 7c: Commit
```
git add tools/track-d-governability-audit/adapter/tests/llm-assistance.test.ts
git commit -m "test(phase5): add comprehensive LLM assistance test suite"
```

---

## Task 8: Final Verification

```powershell
# Adapter:
npm test        # ≥150 tests, 0 failures
npm run typecheck   # exit 0

# Next.js:
cd ../../../trust-readiness-diagnostic
npm run build   # exit 0
```

---

## Task 9: Write Phase 5 Report

Create: `docs/assurance-mvp-spec/PHASE-5-LLM-ASSISTANCE-REPORT.md`

Sections:
1. Baseline (Phase 4 state)
2. Model used (MockLlmAdapter in tests; interface ready for real provider)
3. Prompt/schema versions
4. Deterministic baseline (Path A) per all 10 systems
5. LLM-assisted results (Path B) per all 10 systems
6. Comparison table
7. Unsupported-claim pressure measurement
8. Contradictions surfaced (SYN-05, SYN-10)
9. Unknown handling (SYN-08, SYN-09)
10. Defect/discovery classification
11. Conclusion: **PHASE 5 COMPLETE**

---

## Task 10: Commit + Push All Phase 5 Work

```powershell
git add -A
git commit -m "Execute Phase 5: LLM-Assisted Extraction + Finding Drafts"
git push origin master
```

---

## Acceptance Criteria Checklist

| Criterion | Implementation |
|---|---|
| LLM architecture extraction implemented | `LlmAdapter.extractArchitecture()` + `MockLlmAdapter` |
| LLM finding-draft generation implemented | `LlmAdapter.draftFindings()` + `MockLlmAdapter` |
| Structured schemas validate LLM outputs | Updated schemas + `validate.ts` |
| Deterministic validation runs after LLM | `orchestrate.ts` calls `validateLlmFindingDraft()` |
| LLM output cannot assign E2/E3/E4 | `evidence_level_cap` rule |
| LLM cannot mark itself reviewed | No such field exists in schema (structural enforcement) |
| LLM cannot create unsupported AM facts | `authority_map_existence` + `source_excerpt` checks |
| LLM cannot override deterministic rules | `detectDeterministicConflicts()` records violation |
| Contradictions explicitly represented | `LlmContradiction` type + `contradictions[]` |
| Unknown information remains unknown | `unknowns[]` field |
| LLM-derived candidates snapshot-bound | `runMetadata.systemSnapshotId` |
| Det. vs LLM comparison across 10 systems | 10-system corpus test + `compareAssessmentPaths()` |
| SYN-05, SYN-08, SYN-09 explicitly analyzed | Dedicated test describe blocks |
| Unsupported-claim pressure measured | `pressureMetrics` in `LlmAssessmentPass` |
| Existing 104+ tests remain passing | Task 8 verification |
| Typecheck passes | Task 8 verification |
| Production build passes | Task 8 verification |
