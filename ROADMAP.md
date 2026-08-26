# AI Agent Assurance — Development Roadmap

> **Status:** Adapter-complete. System-incomplete.
> **Repo:** [hillarynjuguna/ai-agent-assurance](https://github.com/hillarynjuguna/ai-agent-assurance)
> **Bootstrap:** `AGENT_BOOTSTRAP.md` — any AI agent starts there.

---

## What Exists Today

```
Track D v6.1 HTML ──→ exportJSON() ──→ Adapter (validate → hash → translate)
                                           │
                                           ├── 38/38 tests passing
                                           ├── Deterministic rules 1-4 (pure functions, no Authority Map yet)
                                           ├── Soft dimension prompt prep (no LLM connected)
                                           ├── Report context generator (no report pipeline yet)
                                           └── "Send to Assurance" button (no endpoint yet)
```

**What works:** Intake translation, evidence gating, floor conditions, content hashing, idempotency.
**What doesn't:** No running server, no database, no Authority Map, no LLM calls, no reviewer workflow, no reports.

---

## Constitutional Invariants

These are non-negotiable. Every phase must preserve all of them. If a proposed change violates one, it's a **BLOCKER**.

| # | Invariant | Enforcement |
|---|-----------|-------------|
| 1 | **Claim ≠ Evidence.** A claim can exist without being recognized as evidence. | `evidence.supports_level` vs `findings.evidence_level` are separate fields |
| 2 | **Self-assessment ≠ Verification.** Self-assessment context cannot elevate a finding. | `self_assessment_context` is JSONB context, never joins into finding queries |
| 3 | **Missing ≠ Safe.** Absence of evidence cannot become an implicit pass. | Dimensions without evidence produce `E0_claimed`, not "no finding" |
| 4 | **LLM ≠ Authority.** LLM outputs can propose; deterministic policy and authorized humans decide. | `drafted_by = 'llm'` findings require human `accept/reject` before becoming official |
| 5 | **Evidence level requires qualifying provenance.** E2+ requires reviewer or test_harness. | SQL trigger `enforce_evidence_integrity` on `findings` table |
| 6 | **Authority must be observed or explicitly stated.** No inventing nodes/edges from missing info. | Adapter only seeds from actually exported data |
| 7 | **Assessment is version-bound.** Every conclusion attaches to a specific system snapshot. | *Not yet implemented — Phase 4* |
| 8 | **Findings remain traceable.** Every finding recoverable to its Authority Map element and evidence. | `finding.authority_map_element_id` + `evidence.finding_id` foreign keys |

---

## The Pipeline We're Building

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   CLAIM                                                                 │
│     │                                                                   │
│     ├── self-report (Track D export)                                    │
│     ├── artifact (policy doc, config, log)                              │
│     └── observation (runtime telemetry)                                 │
│           │                                                             │
│     INTERPRETATION                                                      │
│     ├── validate + hash (adapter)                                       │
│     ├── extract Authority Map (LLM-assisted)                            │
│     └── map to frameworks (dimension-map)                               │
│           │                                                             │
│     EVIDENCE STATE                                                      │
│     ├── E0_claimed (verbal / checkbox)                                  │
│     ├── E1_documented (policy / statement)                              │
│     ├── E2_observed (logs / internal tests) ── requires reviewer        │
│     ├── E3_validated (CI/CD / monitoring)   ── requires reviewer        │
│     └── E4_adversarially_tested (external)  ── requires test_harness    │
│           │                                                             │
│     ASSESSMENT                                                          │
│     ├── deterministic rules (graph pattern → finding)                   │
│     ├── LLM-drafted findings (soft dimensions → human review)           │
│     └── floor conditions (D3/D10/D2 → hard constraints)                 │
│           │                                                             │
│     VALIDATION                                                          │
│     ├── reviewer accept/reject/modify                                   │
│     ├── evidence upgrade (E1 → E2+)                                     │
│     └── attestation (accountable human sign-off)                        │
│           │                                                             │
│     REPORT                                                              │
│     ├── findings with evidence levels                                   │
│     ├── self-assessment context (labeled, disclaimed)                   │
│     ├── Authority Map visualization                                     │
│     └── reassessment triggers                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Wire the Intake API
**Goal:** A real HTTP endpoint that accepts Track D exports and returns structured results.
**Effort:** ~3 hours
**Dependencies:** None

### Build

| Task | File | Description |
|------|------|-------------|
| API route | `trust-readiness-diagnostic/src/app/api/diagnostics/intake/route.ts` | POST handler: validate → hash → translate → persist → respond |
| Local storage | `trust-readiness-diagnostic/src/lib/assurance/store.ts` | JSON file-based persistence (no Postgres yet) |
| Raw source preservation | Stored alongside assessment | Keep the raw JSON submission + hash + timestamp + schema version |

### Acceptance Criteria

```
POST weak-governance fixture  → 200, L1_diagnostic, floor conditions detected
POST strong-governance fixture → 200, L1_diagnostic, no floor conditions
POST invalid JSON              → 400, validation errors array
POST same fixture twice         → same content hash (idempotency)
Raw source preserved alongside assessment
```

### What This Proves
The adapter is not just a library — it's a functioning intake seam.

---

## Phase 2: Evidence Invariant Testing
**Goal:** Prove the E0-E4 evidence ladder cannot be bypassed.
**Effort:** ~2 hours
**Dependencies:** Phase 1 (need persisted assessments to test against)

### Build

| Task | Description |
|------|-------------|
| SQL invariant test suite | Run `001_init_schema.sql` against a real Postgres instance (Docker or local) |
| Evidence boundary tests | Attempt to break every evidence constraint |
| Adapter ↔ schema integration test | Feed adapter output into actual tables, verify triggers fire |

### Test Matrix

| Scenario | Expected |
|----------|----------|
| Client submits evidence at E1 | ✅ Accepted |
| Client submits evidence at E3 | ❌ Trigger rejects INSERT |
| Reviewer submits evidence at E2 | ✅ Accepted |
| Test harness submits E4 | ✅ Accepted |
| Finding evidence_level upgraded to E2 with only client evidence | ❌ Trigger rejects UPDATE |
| Finding evidence_level upgraded to E2 with reviewer evidence | ✅ Accepted |
| Forged `submitted_by_type='reviewer'` from API without auth | ❌ API rejects (auth layer) |

### What This Proves
Invariant 5 (evidence level requires qualifying provenance) is enforced at the database layer, not just in application code.

---

## Phase 3: Authority Map Seeding + Deterministic Rules
**Goal:** Track D dimensions produce Authority Map nodes/edges, and deterministic rules fire against them.
**Effort:** ~6 hours
**Dependencies:** Phase 1

> **Critical constraint (Invariant 6):** Only seed from actually exported data. Missing information becomes `unknown`, not inferred fact.

### Build

| Task | File | Description |
|------|------|-------------|
| Authority Map seeder | `adapter/src/authority-map-seed.ts` | Derive nodes + edges from Track D dimensions |
| Map persistence | `trust-readiness-diagnostic/src/lib/assurance/authority-map-store.ts` | Store seeded map alongside assessment |
| Rule execution pipeline | `adapter/src/rules/execute.ts` | Run all 4 rules against a seeded Authority Map |
| Finding generation | `adapter/src/findings.ts` | Convert rule outputs into persisted findings |

### Track D → Authority Map Mapping

| Track D | Authority Map Element | Condition |
|---------|----------------------|-----------|
| D1 (Reversibility) | `edge.action_reversibility` | Only if cap/evid > 0 (some information exists) |
| D3 (Human Override) | `edge.requires_human_approval` | Set to `false` if cap=0, `true` if cap≥2, `unknown` otherwise |
| D5 (Delegation) | `delegates_to` edges | Only if auditor notes describe specific delegation patterns |
| D8 (Model Provenance) | `node(type='model')` | Only if auditor notes name a specific model |
| D10 (Containment) | `edge.trust_boundary` | Set from auditor notes or default to `unknown` |

### Run One Synthetic Case First

Before running all 10 systems, run the weak-governance fixture end-to-end:

```
Track D export → POST /intake → assessment persisted → Authority Map seeded
    → Rule 1 fires (D3 cap=0, irreversible, no approval) → critical finding
    → Rule 4 fires (D10 cap=0, no containment) → high finding
    → Evidence at E1 max → finding evidence_level at E1
    → Response includes: assessment, findings, evidence claims, floor conditions
```

### Then Run All 10 Systems

Use `docs/assurance-mvp-spec/fixtures/08-synthetic-corpus.json`.

| System | Expected Behavior |
|--------|-------------------|
| Weak governance systems | Multiple critical/high findings, floor rules triggered |
| Strong governance systems | Informational findings only, no floor rules |
| Mixed systems | Findings proportional to actual gaps |
| Systems with N/A dimensions | N/A dimensions produce no findings, opacity penalty if >2 |

### What This Proves
The deterministic engine produces correct, traceable findings from real inputs — without any LLM involvement.

---

## Phase 4: Versioned System Identity + Canonical Assessed Object
**Goal:** Every assessment refers to a specific system snapshot, not an abstract "system."
**Effort:** ~4 hours
**Dependencies:** Phase 3 (the synthetic corpus will reveal what metadata matters)

> **This phase solves Open Question 1 from AGENT_BOOTSTRAP.md.**

### The Problem

The current `systems` table has a `description` text field. That's a placeholder. We need:

```
System X at version V, assessed at time T
  └── Authority Map snapshot (frozen at assessment time)
  └── Findings (anchored to this snapshot)
  └── Evidence (gathered during this assessment window)
```

### Build

| Task | Description |
|------|-------------|
| System snapshot schema | Add `system_snapshots` table: version, config_hash, assessed_at, authority_map_id |
| Assessment → snapshot FK | Every assessment references exactly one system snapshot |
| Diff detection | Given two snapshots, identify what changed (new nodes, removed edges, modified permissions) |
| Reassessment trigger (structured) | Turn narrative triggers into machine-evaluable conditions |

### Acceptance Criteria

```
Same system, two assessments → two distinct snapshots
System change detected → triggers reassessment flag
Assessment findings traceable to specific snapshot
Old assessment findings remain valid for their snapshot
```

### What This Proves
Invariant 7 (assessment is version-bound) is implemented, not just stated.

---

## Phase 5: LLM-Assisted Extraction + Finding Drafts
**Goal:** Soft dimensions (D4/D6/D7/D8/D9) produce LLM-drafted findings constrained by the evidence schema.
**Effort:** ~8 hours
**Dependencies:** Phase 3 (deterministic baseline must exist first)

> **Key principle: Make the deterministic engine earn its existence first.** We need to know what the non-LLM core produces before introducing model variability.

### Build

| Task | File | Description |
|------|------|-------------|
| LLM finding-draft caller | `adapter/src/llm-draft.ts` | Call LLM with structured prompts from `soft-dimensions.ts` |
| Schema constraint enforcement | Validate LLM output against `finding-draft.schema.json` |
| Authority Map extraction | `adapter/src/authority-map-extract.ts` | LLM extracts nodes/edges from auditor notes + artifacts |
| Deterministic validation layer | `adapter/src/llm-validate.ts` | Deterministic checks on LLM output before acceptance |

### Evidence Constraints for LLM Outputs

| LLM Action | Allowed | Not Allowed |
|------------|---------|-------------|
| Draft a finding | ✅ | |
| Propose severity | ✅ | |
| Set evidence_level to E0 or E1 | ✅ | |
| Set evidence_level to E2+ | | ❌ (Invariant 4) |
| Mark finding as reviewed | | ❌ (Invariant 4) |
| Override a deterministic rule | | ❌ (Invariant 4) |
| Extract Authority Map nodes/edges | ✅ | |
| Invent nodes from missing information | | ❌ (Invariant 6) |

### Experimental Comparison

Run the 10-system corpus through:
1. **Deterministic only** (Phase 3 baseline)
2. **Deterministic + LLM extraction** (Phase 5)
3. **Compare:** What did the LLM add? What did it get wrong? Where did it add value vs. uncertainty?

### What This Proves
LLM assistance is valuable *and* bounded. The system can demonstrate where AI helps and where it doesn't.

---

## Phase 6: Reviewer Workflow + Report Pipeline
**Status:** Complete for the bounded local MVP. See [`PHASE-6-IMPLEMENTATION-REPORT.md`](docs/assurance-mvp-spec/PHASE-6-IMPLEMENTATION-REPORT.md).
**Goal:** A human reviewer can accept/reject findings, upgrade evidence, and produce a final report.
**Effort:** ~10 hours
**Dependencies:** Phase 5

### Build

| Task | Description |
|------|-------------|
| Reviewer UI | Accept/reject/modify findings, upgrade evidence levels |
| Evidence upgrade path | Reviewer submits qualifying evidence → finding evidence_level upgrades |
| Attestation | Reviewer signs off on final assessment state |
| Report generation | Structured report with Track D context, findings, evidence, Authority Map |
| Report provenance | Report links back to: snapshot, assessment, findings, evidence, reviewer decisions |

### The Five Trust Layers in the Report

Every finding in the final report should show:

| Layer | Source | Example |
|-------|--------|---------|
| Self-assessment context | Track D composite | "Client positioned at 21% capability, 9% assurance (risk quadrant)" |
| Client claim | Evidence row | "Client states human approval is required before consequential actions" |
| Claimed evidence level | Evidence.supports_level | "Client claims E3 (automated verification)" |
| Recognized evidence level | Finding.evidence_level | "System recognizes E1 (documented policy only)" |
| Reviewer attestation | Reviewer decision | "Reviewer upgraded to E2 after observing runtime logs" |

### Acceptance Criteria

```
Finding starts at E1 → reviewer submits qualifying evidence → finding upgrades to E2
Finding at E1 → reviewer attempts E3 without test_harness evidence → rejected
Report shows all five trust layers for each finding
Report includes Track D context section with provenance disclaimer
Report is reproducible from the same assessment data
```

### What This Proves
The full vertical slice works: **intake → assessment → Authority Map → rules → findings → review → evidence upgrade → report.**

---

## Phase Summary

| Phase | What it builds | What it proves | Estimated effort |
|-------|---------------|----------------|-----------------|
| **1** | API route + persistence | Adapter is a functioning intake seam | ~3h |
| **2** | SQL invariant tests | Evidence ladder cannot be bypassed | ~2h |
| **3** | Authority Map + rules + 10 systems | Deterministic engine produces correct findings | ~6h |
| **4** | Versioned snapshots | Assessment is version-bound | ~4h |
| **5** | LLM extraction + drafts | AI adds bounded value | ~8h |
| **6** | Reviewer + reports | Full vertical slice works | ~10h |

**Total: ~33 hours of implementation across 6 phases.**

---

## What Comes After (Not in Scope)

These are real but intentionally deferred:

| Future Work | Why Deferred |
|------------|--------------|
| **Full provenance chain** (origin proof, not just content integrity) | Current hash is sufficient for MVP; full provenance is infrastructure |
| **Continuous assurance** (monitoring, drift detection, auto-reassessment) | Requires versioned snapshots (Phase 4) to be working first |
| **Multi-tenant / auth** | SaaS concern, not MVP |
| **Production deployment** | After the vertical slice proves the engine works |
| **Commercial positioning** | After the evidence plane demonstrates its value empirically |

---

## How to Execute This Roadmap

### For a human developer
Pick a phase. Read the acceptance criteria. Build it. Run the verification commands in `AGENT_BOOTSTRAP.md` before claiming completion.

### For an AI agent
1. Read `AGENT_BOOTSTRAP.md` in the repo root.
2. Run `npm test` in the adapter directory to verify existing work.
3. Execute the next incomplete phase.
4. Classify blockers using the issue classification discipline (BLOCKER / DESIGN DECISION / METHODOLOGY QUESTION / IMPLEMENTATION DETAIL / FUTURE QUESTION).
5. Run verification before claiming completion.

### Prompt for starting Phase 1
> *"Read AGENT_BOOTSTRAP.md. Run the existing adapter tests to verify they pass. Then execute Phase 1: wire the intake API route at `trust-readiness-diagnostic/src/app/api/diagnostics/intake/route.ts`. Use the adapter's `validateTrackDExport`, `hashTrackDExport`, and `translateTrackDToAssurance` functions. Persist results to local JSON files. Test with both fixtures. Preserve the raw JSON submission alongside the translated result."*
