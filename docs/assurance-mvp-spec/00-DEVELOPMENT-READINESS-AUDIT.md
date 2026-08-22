# Phase A: Development Readiness Audit

Question asked: if this specification went to a competent engineer today, could they build v0.1 without inventing major parts of the methodology? **Answer: not as written. Three real gaps needed resolving first, resolved below. Everything else in the two prior documents was implementable as-is.**

## A. Data model discrepancy, resolved

The Decision Blueprint's own entity list, "Client, Assessment, System, Framework Reference, Finding, Evidence, Severity, Confidence, Reviewer, Recommendation," is ten items despite being labeled "nine entities" in the text. That was a genuine counting error, not an intentional alternate design. Worse, it implies Severity and Confidence are their own tables, which contradicts how they were used everywhere else in both documents, as enum fields on Finding.

The System Specification's ten-table version (adding AuthorityMapNode and AuthorityMapEdge, correctly keeping severity/evidence_level/confidence as Finding fields) is the materially correct one. **Canonical decision: use the System Specification's schema.** One addition made here and justified in Phase F: an eleventh table, ReviewDecision, an append-only log distinct from Evidence, because "reviewed = true" does not satisfy the auditability invariant Section 19 of the follow-up prompt itself demands. See 03-domain-model.sql.

## B. Timeline discrepancy, resolved

The System Specification says Days 1-7 are methodology only, no code. The Decision Blueprint's Section 19.7 puts schema and evidence-ledger work in Days 4-7. Direct contradiction.

Engineering-realistic resolution: schema design does not depend on the ASI/ISM mapping *content* being finished, only on the entity model being settled, which Section A above now does. Methodology-content work (writing the actual mapping rules per framework) and schema/migration work are parallelizable, not sequential. Revised: **Days 1-3, finalize the canonical entity model (done here) and stand up the base schema and domain types in parallel with drafting the first ACSC ISM / OWASP ASI mapping rules. Days 4-7, continue framework-mapping content while the Authority Map builder and Evidence Engine get implemented against the now-stable schema.** This is reflected in 10-DEV-PLAN.md.

## C. CIR integration, resolved as a design decision, not an assumption

A direct inspection was attempted this session via the connected Vercel MCP tool. `list_projects` and `get_project` both require a resolvable team ID, and no team-listing tool was available in this environment to discover it, so the attempt returned an error rather than project data. This is a real, reportable outcome, not a silent gap.

**KNOWN (verified by direct page fetch, prior session):** CIR Diagnostic Engine's public-facing claims, seven audit dimensions, CrewAI/LangGraph config ingestion, multi-model cross-validation, full audit-trail export, three pricing tiers.
**ASSUMED: nothing.** In particular, do not assume the same framework as the separate hillarynjuguna.vercel.app site (known to be Astro), the two are different projects and nothing confirms they share a stack.
**REQUIRES INSPECTION:** runtime/framework, database engine, existing auth model, existing API surface, UI stack, deployment configuration, and technical debt, all unverified.

**Design decision made to unblock development despite this:** build v0.1 as a standalone service with its own Postgres database and a small, explicit API surface (11-api-contract.yaml), rather than assuming embedding inside CIR's existing codebase. This is deliberately the lower-risk default given genuine unknowns, and it does not foreclose deeper integration later, once Hillary can supply either the Vercel team/project slug or direct repository access for a real inspection.

## Everything else: classification

| Area | Status |
|---|---|
| Agent Authority Map node/edge model | Sufficiently defined to implement, extended in Phase D with the additional fields the follow-up prompt asked to evaluate |
| Evidence E0-E4 model | Conceptually strong, was underspecified as a system invariant. Made concrete in 05-ASSESSMENT-ENGINE.md and enforced in 03-domain-model.sql |
| Three-layer framework mapping (Security Posture / Agentic Behaviour / Governance-Assurance) | Sufficiently defined |
| OWASP ASI01-10 mapping content | Sufficiently defined, verified full list, see prior session's research |
| ACSC ISM specific control mapping content | Methodologically underspecified, the *specific* ISM guideline numbers to map against were never enumerated, only referenced generally. This is a genuine content-authoring task for Days 1-7, not a blocker, flagged in 10-DEV-PLAN.md |
| Reviewer role and Evan | Was implicitly Evan-shaped. Corrected in Phase F, generic Reviewer role, Evan (or anyone) assignable later |
| Pricing tiers | Dependent on external decision (real client conversations), correctly deferred in both prior documents, not needed for v0.1 build |
| Composite score avoidance | Sufficiently defined and consistent across both documents, no contradiction found |
| "Extend CIR" language throughout both documents | Was likely to create false confidence, resolved in Section C above |

## Evidence discipline applied to carried-over claims

- OWASP Top 10 for Agentic Applications 2026 full ASI01-10 list and its December 9, 2025 publication date: **verified** (prior session, multiple independent sources).
- ASI03 as the most-reported real-world failure category: **strong evidence**, not independently re-verified this session, carried from prior sourced research.
- CIR's seven dimensions and three pricing tiers: **verified** by direct fetch.
- CIR's internal architecture: **unverified**, see Section C.
- Competitive landscape figures ($3.6B, named platforms): **verified** from prior session's research, not re-checked this session.
