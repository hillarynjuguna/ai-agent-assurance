# Phase B: Canonical v0.1 Specification

## Product boundary

> An AI Agent Assurance Assessment system that converts information about an agentic system into an explicit authority model, framework-mapped findings, evidence-linked assessment records, human-review checkpoints, and an auditable assurance report.

This definition is validated, not challenged. It correctly excludes runtime enforcement, continuous monitoring, and automated adversarial testing, which is exactly the boundary that keeps this out of Zenity/Noma/Straiker territory (see the decision brief's competitive research).

## Sequence, validated with one correction

Original: Client Intake to Agent Authority Map to Framework Mapping to Findings to Evidence Ledger to Human Review to Report.

Correction: Evidence is not a stage after Findings, it is attached continuously from the moment a Finding is drafted (at E0/E1) through Human Review (where it may reach E2/E3). Modeling it as a discrete downstream stage undersells that a Finding without any Evidence record should not be constructible at all. The corrected sequence:

**Intake -> Authority Map -> Framework Mapping -> Finding drafted with initial Evidence (E0/E1) -> Human Review gate -> Evidence upgraded where applicable -> Report.**

Human Review is a gate condition on Assessment status, not a pipeline stage with its own output, it either passes or blocks progression. This matches how it is actually modeled in 03-domain-model.sql.

## Explicit non-goals, reaffirmed

Not building: Zenity, Noma, a penetration-testing platform, an autonomous red-team system, continuous runtime monitoring, a generic GRC platform, an enterprise SIEM, or a multi-framework compliance engine covering everything at once. v0.1 maps against ACSC ISM and OWASP Agentic ASI01-10 only. ISO 42001, ISO 23894, NIST AI RMF, and MITRE ATLAS are structurally supported (see FrameworkReference in the domain model) but not populated until a real client asks.
