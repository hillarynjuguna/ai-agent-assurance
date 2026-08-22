# AI Agent Assurance Assessment, v0.1 Implementation Package

Companion to the two prior strategy documents (ai-agent-assurance-pipeline.md, ai-agent-assurance-system-spec.md), produced in response to the transition-to-development prompt. Read in this order:

1. `00-DEVELOPMENT-READINESS-AUDIT.md` — Phase A, what was actually ready to build versus what needed resolving first, including the two real discrepancies between the prior documents.
2. `01-CANONICAL-SPEC.md` — Phase B, the settled product boundary and pipeline sequence.
3. `02-ARCHITECTURE.md` — Phase C, stack, the n8n boundary, and a Mermaid diagram.
4. `db/001_init_schema.sql` and `src/domain/types.ts` — Phase D, the canonical eleven-table domain model, runnable SQL with invariant-enforcing triggers, and matching TypeScript types.
5. `05-ASSESSMENT-ENGINE.md` and `src/schemas/*.json` — Phase E, the rule model and the two LLM structured-output schemas that make the evidence boundary a schema-level fact, not a prompt instruction.
6. `06-LLM-BOUNDARY-AND-INVARIANTS.md` — Phase 16 and Section 19, what the LLM can never do and how each is actually blocked.
7. `07-REVIEWER-WORKFLOW.md` — Phase F, the generic Reviewer role.
8. `fixtures/08-synthetic-corpus.json` — Phase G, ten synthetic systems, three of them (SYN-05, SYN-09, SYN-10) deliberately adversarial per Section 20 of the prompt.
9. `09-VERTICAL-SLICE.md` — Phase H, exact acceptance criteria for the first end-to-end run (SYN-04).
10. `10-DEV-PLAN.md` — Phase I, the task breakdown, Days 1-30, revised timeline reconciling the two prior documents.
11. `src/api/11-api-contract.yaml` and `src/workflows/12-n8n-workflow.json` — the API surface and the (intentionally thin) n8n glue layer.

## Phase J, begin implementation, honest status

Repository access to the real CIR codebase was attempted this session via the connected Vercel MCP tool and did not resolve (00-DEVELOPMENT-READINESS-AUDIT.md, Section C). Given that, this package is the implementation artifact the prompt asks for as the fallback: repository structure, database migrations, TypeScript domain models, API contract, structured LLM schemas, n8n workflow definition, and a full synthetic fixture corpus, all present as real files above, not placeholder descriptions of files. What is not present is a running, deployed instance, that requires an actual environment (Postgres instance, Node runtime, LLM API keys) this container doesn't persist between sessions. Task 1 in 10-DEV-PLAN.md, applying the schema and running the trigger test, is the first thing to actually execute once there's a real database to point at.

## What's genuinely still open, not silently resolved

- Evan's background and liability position (carried over from the decision brief, unaffected by this package, since the architecture now doesn't depend on the answer).
- ACSC ISM specific control numbers to seed (Task 14, a content-authoring gap, not a technical one).
- Real inspection of the CIR codebase, blocked on either the Vercel team/project identifier or direct repository access.
