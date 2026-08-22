# Agent Bootstrap: AI Agent Assurance

> **Read this file first.** It tells you what exists, what's been decided, what's next, and how to verify your own work.

## 1. What This System Is

An evidence-aware governance engine for autonomous AI systems. It implements a chain-of-custody pipeline where:
- **Clients self-assess** their AI governance posture via Track D (10-dimension diagnostic)
- **The adapter** translates that self-assessment into the Assurance MVP's domain model
- **The assessment engine** produces findings with evidence level constraints
- **Reviewers** can upgrade evidence levels through independent verification
- **Reports** show self-assessment context clearly separated from verified findings

The core differentiator: **the system won't let you lie to yourself about your AI governance.** Client claims are preserved faithfully but structurally prevented from becoming verified evidence without independent review.

## 2. Settled Decisions — Do Not Revisit

These have been architecturally settled and are enforced in code and SQL:

### Settled Decision 1: Composite Score is Context, Not Evidence
Track D's Diligence Positioning Matrix (weighted capability/assurance percentages) is stored as `self_assessment_context` JSONB on the `assessments` table. It is informational context for reviewers. It is **never** averaged with or blended into any Finding's severity, confidence, or evidence_level.

**Enforced in:** `translate.ts` → `selfAssessmentContext`, `report-context.ts` → provenance disclaimer

### Settled Decision 2: Evidence Level Cap for Client Submissions
Client-submitted evidence (`submitted_by_type = 'client'`) preserves the full claimed level in `Evidence.supports_level` (so reviewers can see what was claimed). But the Finding's `evidence_level` is capped at `E1_documented`. The SQL trigger `enforce_evidence_integrity` on the `findings` table blocks upgrades to E2+ unless qualifying evidence from `'reviewer'` or `'test_harness'` exists.

**Enforced in:** `translate.ts` → `gatedEvidenceLevel`, `db/001_init_schema.sql` → triggers, `db/002_track_d_intake.sql`

### Track D Export Shape
The v6.1 `exportJSON()` produces string values from DOM elements (`cap: "2"`, `evid: "1"`, `na: "false"`), not numbers or booleans. The validator handles parsing. Pill-toggle selections (audience/action pills) are **NOT** included in the export — only `metadata.audience` (a dropdown value) is exported.

## 3. What Exists and Works

### Adapter Module (`tools/track-d-governability-audit/adapter/`)
- **38/38 tests passing** — run with `npm test`
- **TypeScript strict mode** — verify with `npm run typecheck`
- Core pipeline: `validate.ts` → `hash.ts` → `translate.ts`
- Deterministic rules: Rules 1-4 in `src/rules/`
- Soft dimension routing: `soft-dimensions.ts` (D4/D6/D7/D8/D9 → LLM finding-draft)
- Report section: `report-context.ts` with provenance disclaimer + markdown renderer
- Schema: `db/002_track_d_intake.sql` extends the base schema

### Track D v6.1 HTML (`tools/track-d-governability-audit/Governability-Diagnostic-Protocol.html`)
- Self-contained single-file diagnostic UI
- "Send to Assurance →" button POSTs to `window.ASSURANCE_INTAKE_URL` (default: `/api/diagnostics/intake`)
- "Download JSON" exports the same v6.1 shape for offline use

### Trust Readiness Diagnostic App (`trust-readiness-diagnostic/`)
- Next.js app with existing scoring, report generation, and Gumroad payment integration
- `src/lib/reports/content.ts` generates structured report content
- `src/utils/scoring.ts` implements the scoring engine
- Has its own `.git` history

### Assurance MVP Specification (`docs/assurance-mvp-spec/`)
- `01-CANONICAL-SPEC.md` — product spec
- `02-ARCHITECTURE.md` — original architecture
- `02-ARCHITECTURE-revised.md` — revised architecture (Track D as product surface)
- `05-ASSESSMENT-ENGINE.md` — deterministic rule definitions (Rules 1-3 + evidence ladder)
- `06-LLM-BOUNDARY-AND-INVARIANTS.md` — LLM constraint model
- `07-REVIEWER-WORKFLOW.md` — reviewer evidence upgrade workflow
- `09-VERTICAL-SLICE.md` — vertical slice spec
- `10-DEV-PLAN.md` — development plan
- `db/001_init_schema.sql` — full PostgreSQL schema with triggers
- `src/domain/types.ts` — canonical TypeScript domain types
- `src/schemas/finding-draft.schema.json` — LLM finding-draft output schema
- `src/schemas/architecture-extraction.schema.json` — architecture extraction schema
- `src/api/11-api-contract.yaml` — OpenAPI contract
- `fixtures/08-synthetic-corpus.json` — 10-system test corpus

## 4. What's Next — Prioritized

### Phase 1: Wire the API Route (intake endpoint)
Connect the adapter to an actual API endpoint in the trust-readiness-diagnostic Next.js app.

**Files to create/modify:**
- `trust-readiness-diagnostic/src/app/api/diagnostics/intake/route.ts` — POST handler
- Wire: `validateTrackDExport` → `hashTrackDExport` → `translateTrackDToAssurance`
- Return: assessment ID, source hash, floor conditions, evidence claim count
- Storage: For MVP, use local JSON file storage (no Postgres yet)

**Acceptance criteria:**
- POST the weak-governance fixture → get back `L1_diagnostic` assessment with floor conditions
- POST the strong-governance fixture → get back assessment with no floor conditions
- POST invalid JSON → get 400 with validation errors
- POST the same fixture twice → get the same content hash (idempotency)

### Phase 2: Authority Map Seeding
Implement the first Authority Map derivation from Track D intake.

**Context:** Track D dimensions map to Authority Map concepts:
- D1 (Reversibility) → `edge.action_reversibility`
- D3 (Human Override) → `edge.requires_human_approval`
- D5 (Delegation) → `delegates_to` edges
- D10 (Containment) → `edge.trust_boundary`
- D8 (Model Provenance) → `node(type=model)` if provenance info exists

**Key constraint:** Only seed from actually exported data. Do not invent nodes/edges from missing information.

### Phase 3: Run the Synthetic Corpus
`docs/assurance-mvp-spec/fixtures/08-synthetic-corpus.json` contains 10 systems. Process each through the adapter pipeline end-to-end.

### Phase 4: LLM Finding-Draft Integration
Wire `soft-dimensions.ts` output into actual LLM calls using the `finding-draft.schema.json` constraint schema.

### Phase 5: Reviewer Workflow
Implement the reviewer evidence upgrade path per `07-REVIEWER-WORKFLOW.md`.

## 5. Issue Classification Discipline

When you encounter unresolved issues, classify them:

| Category | Action |
|----------|--------|
| **BLOCKER** | Stop. Cannot proceed without resolution. Escalate to user. |
| **DESIGN DECISION** | Document options, recommend one, proceed with recommended unless user overrides. |
| **METHODOLOGY QUESTION** | Flag but proceed with best judgment. |
| **IMPLEMENTATION DETAIL** | Decide and move on. Document if non-obvious. |
| **FUTURE QUESTION** | Log in this file under "Open Questions" section below. Do not solve now. |

## 6. Verification Checklist

Before claiming any work is complete:

```bash
# From adapter directory
cd tools/track-d-governability-audit/adapter
npm run typecheck   # Must exit 0
npm test            # Must show 0 failures

# If modifying trust-readiness-diagnostic
cd trust-readiness-diagnostic
npm run build       # Must build without errors
```

## 7. Open Questions (for future sessions)

These are logged but intentionally unresolved:

1. **What is the canonical assessed object?** The system assesses "an AI system" but there's no versioned snapshot primitive. The `systems` table has a `description` text field — that's a placeholder. This becomes important when you need to answer "what changed since the last assessment?"

2. **Commercial positioning.** The architecture could serve: AI reliance assurance, agent governability assessment, AI due diligence infrastructure, or evidence-aware governance engine. These may be manifestations of the same engine. Don't lock this until the vertical slice is complete.

3. **Multi-tenant model.** The schema has `organizations` and role-based access but no tenant isolation strategy for the assessment data. Relevant for SaaS but not for MVP.

4. **Reassessment triggers.** Track D generates reassessment trigger conditions in the narrative. These are currently stored as text. Eventually they should be structured conditions that can fire automatically.
