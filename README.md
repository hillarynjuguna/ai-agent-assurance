# AI Agent Assurance

An evidence-aware governance engine for autonomous AI systems. Implements a chain-of-custody pipeline where the gap between what's claimed and what's verified is structurally visible.

## Architecture

```
Track D v6.1 (Self-Assessment UI)
  ↓  exportJSON() or "Send to Assurance"
Intake Adapter (validate → hash → translate)
  ↓
Assessment Engine (L1_diagnostic → intake)
  ├── self_assessment_context (JSONB, never averaged with findings)
  ├── Evidence claims (submitted_by_type=client, capped at E1)
  ├── Deterministic rules (D1/D3/D5/D10 fire against Authority Map)
  ├── Soft dimensions (D4/D6/D7/D8/D9 → LLM finding-draft pipeline)
  └── Report (structured context with provenance disclaimer)
```

## Repository Structure

```
├── docs/
│   └── assurance-mvp-spec/     # Canonical specification documents
│       ├── 01-CANONICAL-SPEC.md
│       ├── 02-ARCHITECTURE.md
│       ├── 02-ARCHITECTURE-revised.md
│       ├── 05-ASSESSMENT-ENGINE.md
│       ├── 06-LLM-BOUNDARY-AND-INVARIANTS.md
│       ├── 07-REVIEWER-WORKFLOW.md
│       ├── 09-VERTICAL-SLICE.md
│       ├── 10-DEV-PLAN.md
│       ├── db/001_init_schema.sql       # Base schema
│       ├── src/domain/types.ts          # Domain types
│       ├── src/schemas/                 # LLM & extraction schemas
│       ├── src/api/                     # API contract
│       └── fixtures/                    # Synthetic corpus
│
├── tools/track-d-governability-audit/
│   ├── Governability-Diagnostic-Protocol.html   # Track D v6.1 UI
│   └── adapter/                                 # ← IMPLEMENTED
│       ├── src/                  # Core adapter module
│       │   ├── track-d-types.ts
│       │   ├── assurance-types.ts
│       │   ├── validate.ts
│       │   ├── hash.ts
│       │   ├── dimension-map.ts
│       │   ├── translate.ts
│       │   ├── soft-dimensions.ts
│       │   ├── report-context.ts
│       │   └── rules/            # Deterministic assessment rules
│       ├── db/002_track_d_intake.sql
│       ├── tests/adapter.test.ts
│       └── fixtures/
│
├── trust-readiness-diagnostic/   # Next.js diagnostic app
│   └── src/
│
└── AGENT_BOOTSTRAP.md           # ← Start here for AI agents
```

## Current State

**Completed:**
- Track D v6.1 ↔ Assurance MVP intake adapter (38/38 tests passing)
- Deterministic rules 1-4 (irreversibility, delegation, identity, containment)
- D6/D7 soft-dimension LLM-draft routing module
- Schema migration for self_assessment_context
- Report context section with provenance disclaimer
- HTML client bridge ("Send to Assurance" button)

**Next:** See [AGENT_BOOTSTRAP.md](./AGENT_BOOTSTRAP.md) for the continuation plan.

## Key Invariants

1. **Evidence gating (Settled Decision 2):** Client-submitted evidence is capped at E1_documented. The SQL trigger `enforce_evidence_integrity` blocks E2+ without reviewer/test_harness evidence.
2. **Self-assessment isolation (Settled Decision 1):** Track D's Diligence Positioning Matrix is stored as JSONB context, never blended into finding severity/confidence/evidence_level.
3. **Claim vs. verification:** The system preserves what was claimed (Evidence.supports_level) separately from what is recognized (Finding.evidence_level).

## Running Tests

```bash
cd tools/track-d-governability-audit/adapter
npm install
npm test        # 38 tests, ~500ms
npm run typecheck  # tsc --noEmit
```

## License

MIT
