# Phase 2: Evidence Invariants Verification Report

> **Execution Date:** 2026-08-24
> **Repository:** [ai-agent-assurance](https://github.com/hillarynjuguna/ai-agent-assurance)
> **Status:** PASSED (64/64 tests passing)

---

## 1. Database Environment & Schema Details

- **Database Engine:** PostgreSQL 16 (executed in-process via `@electric-sql/pglite` and validated against PostgreSQL 16 Alpine container).
- **Schemas Applied:**
  1. `docs/assurance-mvp-spec/db/001_init_schema.sql` (Canonical domain schema: 11 tables, enums, triggers, checks)
  2. `tools/track-d-governability-audit/adapter/db/002_track_d_intake.sql` (Track D intake support: `self_assessment_context` JSONB, `source_artifact_hash`, `import_source`)

---

## 2. Invariant Mechanisms Inspected & Proven

| Target Property | Database Mechanism | Operational Behavior |
|---|---|---|
| `Evidence.supports_level` | `evidence_level` ENUM | Stores the specific evidence tier (`E0_claimed` through `E4_adversarially_tested`). |
| `Evidence.submitted_by_type` | `CHECK (submitted_by_type IN ('client', 'operator', 'reviewer', 'test_harness'))` | Restricts submitter category to enumerated actors. |
| `Finding.evidence_level` | `enforce_evidence_integrity()` Trigger on `findings` | Blocks setting `evidence_level` to `E2_observed`, `E3_validated`, or `E4_adversarially_tested` unless qualifying evidence exists. |
| Reviewer/Test-Harness Qualification | Trigger condition: `e.submitted_by_type IN ('reviewer', 'test_harness')` AND `e.supports_level >= NEW.evidence_level` | Client-submitted claims can NEVER satisfy the trigger for E2+. |
| Staleness / Superseding | Trigger condition: `e.superseded_by IS NULL` | If qualifying evidence is superseded by newer/lower evidence, it ceases to qualify the finding. |
| Traceability Invariant | `CHECK (authority_map_node_id IS NOT NULL OR authority_map_edge_id IS NOT NULL)` | Findings cannot exist without pointing to an Authority Map node or edge. |

---

## 3. Test Execution Matrix (16 Database Invariant Scenarios)

| # | Scenario | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|---|
| **1** | Client submits `E1_documented` | ACCEPTED (Row persisted) | Row inserted with `supports_level = 'E1_documented'` | ✅ PASS |
| **2** | Client records `E3_validated` claim in evidence table | Stored as client claim, but cannot elevate finding | Row inserted, subsequent finding upgrade to E3 rejected by trigger | ✅ PASS |
| **3** | Client records `E2_observed` claim in evidence table | Stored as client claim, but cannot elevate finding | Row inserted, subsequent finding upgrade to E2 rejected by trigger | ✅ PASS |
| **4** | Reviewer submits `E2_observed` evidence | ACCEPTED | Row inserted with `submitted_by_type = 'reviewer'` | ✅ PASS |
| **5** | Test harness submits `E4_adversarially_tested` evidence | ACCEPTED | Row inserted with `submitted_by_type = 'test_harness'` | ✅ PASS |
| **6** | Finding attempts upgrade to `E2_observed` with client-only evidence | REJECTED by trigger | `RAISE EXCEPTION` from trigger: *cannot be set to E2_observed without qualifying reviewer or test_harness evidence* | ✅ PASS |
| **7** | Finding upgrades to `E2_observed` with qualifying reviewer evidence | ACCEPTED | Finding `evidence_level` updated to `E2_observed` | ✅ PASS |
| **8** | Finding attempts upgrade to `E3_validated` with only reviewer `E2_observed` evidence | REJECTED by trigger | `RAISE EXCEPTION`: insufficient evidence level rank | ✅ PASS |
| **9** | Sequential UPDATE elevation attack (`E1 -> E2 -> E3 -> E4`) | REJECTED on all levels | Trigger blocks all non-qualifying levels | ✅ PASS |
| **10** | Actor provenance boundary check | Database enforces enum check; API enforces server-side session | Invalid enum `attacker` rejected; DB accepts valid enum strings | ✅ PASS |
| **11** | Superseded evidence staleness test | Superseded evidence loses qualification | Trigger ignores `superseded_by IS NOT NULL` rows; subsequent elevation blocked | ✅ PASS |
| **12** | Phase 1 Adapter output integrated into PostgreSQL | Adapter claims stored with `submitted_by_type='client'`, finding capped at E1 | 10 claims persisted, Finding upgrade to E2 blocked by trigger | ✅ PASS |
| **13** | Bypass 1: Finding without node or edge reference | REJECTED by CHECK constraint | `violates check constraint "finding_traces_to_authority_map"` | ✅ PASS |
| **14** | Bypass 2: Invalid `evidence_level` enum value (`E99_super_valid`) | REJECTED by enum parser | `invalid input value for enum evidence_level` | ✅ PASS |
| **15** | Bypass 3: Evidence referencing non-existent finding | REJECTED by Foreign Key | `violates foreign key constraint "evidence_finding_id_fkey"` | ✅ PASS |
| **16** | Bypass 4: `review_decisions` row with `NULL` reasoning | REJECTED by NOT NULL constraint | `null value in column "reasoning" of relation "review_decisions"` | ✅ PASS |

---

## 4. Key Discoveries & Boundary Clarifications

1. **Claim Preservation vs. Finding Upgrade (Settled Decision 2 Validated):**
   The database allows a client to submit what they claim (`supports_level = 'E4'`) in the `evidence` table, preserving the client's assertion faithfully. However, the database trigger `enforce_evidence_integrity` strictly enforces that *only* rows where `submitted_by_type IN ('reviewer', 'test_harness')` count toward upgrading the `findings.evidence_level`. This structurally prevents client self-validation.

2. **Actor Provenance Boundary (API vs. SQL Layer):**
   The SQL schema restricts `submitted_by_type` to valid enum strings (`client`, `operator`, `reviewer`, `test_harness`). The database itself cannot authenticate session identity without row-level security (out of scope for v0.1). Therefore, the API route must set `submitted_by_type` server-side from the authenticated session context, as specified in `11-api-contract.yaml`.

3. **Adapter Semantic Preservation:**
   When the output of `translateTrackDToAssurance()` is inserted into the PostgreSQL schema, all 10 evidence claims are persisted as client statements with `supports_level` preserving the claimed level, while the finding remains strictly at `E1_documented`.

---

## 5. Execution Summary

- **Adapter & Invariant Test Suite (`npm test`):** 64 tests passing across 19 suites (0 failures).
- **TypeScript Compilation (`npm run typecheck`):** Exit code 0.
- **Next.js Production Build (`npm run build`):** Exit code 0.
- **Phase Status:** **PHASE 2 COMPLETE**
