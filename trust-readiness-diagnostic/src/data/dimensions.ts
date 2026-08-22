import type { DiagnosticDimension, ScoreOption } from "../utils/scoring";

export const DIMENSIONS: DiagnosticDimension[] = [
    {
        id: 1, title: "Reversibility Classification", weight: 3,
        question: "Should this action even be automated? (Does the system systematically know when an action is irreversible?)",
        regulatoryTags: ["NIST: Map", "ISO 42001 A.6", "EU AI Act Art.9"],
        capOptions: [
            { val: 0, title: "0 — Absent", desc: "No action classification. AI executes blindly without reversibility assessment." },
            { val: 1, title: "1 — Minimal", desc: "Ad hoc flags. Manual taxonomy only, no systematic enforcement." },
            { val: 2, title: "2 — Partial", desc: "Systematic classification applied. Gating is advisory, not enforced." },
            { val: 3, title: "3 — Complete", desc: "Total classification with enforced gating and documented rollback paths." }
        ]
    },
    {
        id: 2, title: "Audit Provenance", weight: 4,
        question: "Does the operation maintain a tamper-evident record of AI state transitions and governance events?",
        regulatoryTags: ["NIST: Measure", "ISO 42001 Cl.9", "EU AI Act Art.12"],
        capOptions: [
            { val: 0, title: "0 — Absent", desc: "No audit trail. AI actions logged informally or not at all." },
            { val: 1, title: "1 — Minimal", desc: "Basic timestamped logs. Not tamper-evident (mutable by admins)." },
            { val: 2, title: "2 — Partial", desc: "Hash-chained audit trail. Append-only, single-platform scope." },
            { val: 3, title: "3 — Complete", desc: "Cryptographically signed, cross-platform trail with Merkle verification." }
        ]
    },
    {
        id: 3, title: "Human Override Capability", weight: 4,
        counterpartyQuestion: "Can a human intercept and stop irreversible actions before they cause damage?", whyItMatters: "Insurers and enterprise clients view un-interceptable actions as unmitigated liability. If it can't be stopped, it can't be insured.",
        regulatoryTags: ["NIST: Manage", "ISO 42001 A.3.2", "EU AI Act Art.14"],
        capOptions: [
            { val: 0, title: "0 — Absent", desc: "Complete autonomy. No intervention path exists at any stage." },
            { val: 1, title: "1 — Minimal", desc: "All-or-nothing kill switch exists but is not integrated into workflows." },
            { val: 2, title: "2 — Partial", desc: "Graduated override at multiple decision gates. Interventions are logged." },
            { val: 3, title: "3 — Complete", desc: "Mandatory human auth at irreversibility boundary (Topology Guard)." }
        ]
    },
    {
        id: 4, title: "Behavioral Verification", weight: 2,
        question: "Does the operation verify its agents behave as specified, rather than merely claiming they do?",
        regulatoryTags: ["NIST: Measure", "ISO 42001 A.5", "EU AI Act Art.11"],
        capOptions: [
            { val: 0, title: "0 — Absent", desc: "No verification. Behavior is assumed to match specification." },
            { val: 1, title: "1 — Minimal", desc: "Inconsistent manual spot-checking of outputs." },
            { val: 2, title: "2 — Partial", desc: "Automated discrepancy detection between policy claims and observed behavior." },
            { val: 3, title: "3 — Complete", desc: "Formal verification. System invariants are proved continuously or at deployment." }
        ]
    },
    {
        id: 5, title: "Delegation Boundaries", weight: 2,
        question: "Are the functional boundaries of what AI agents can do explicitly defined, enforced, and documented?",
        regulatoryTags: ["NIST: Govern", "ISO 42001 A.2", "EU AI Act Art.9"],
        capOptions: [
            { val: 0, title: "0 — Absent", desc: "No boundaries. Agents operate with unconstrained scope." },
            { val: 1, title: "1 — Minimal", desc: "Implicit boundaries limited only by available tools or API surface." },
            { val: 2, title: "2 — Partial", desc: "Explicit context contracts enforced at the routing or orchestration layer." },
            { val: 3, title: "3 — Complete", desc: "Dynamic delegation with asymmetric gating based on evidential standards per action." }
        ]
    },
    {
        id: 6, title: "Counterparty Risk Profile", weight: 2,
        question: "Has the operation assessed how institutional counterparties (banks, insurers, investors) evaluate its risk?",
        regulatoryTags: ["Institutional DD"],
        capOptions: [
            { val: 0, title: "0 — Absent", desc: "No assessment. External institutional evaluation is ignored entirely." },
            { val: 1, title: "1 — Minimal", desc: "Verbal awareness of scrutiny but no documented modeling or criteria mapping." },
            { val: 2, title: "2 — Partial", desc: "Self-assessment documented against known counterparty criteria (e.g., SOC 2, investor checklists)." },
            { val: 3, title: "3 — Complete", desc: "Third-party validated risk profile with documented likely institutional acceptance pathways." }
        ]
    },
    {
        id: 7, title: "Institutional Legibility", weight: 2,
        question: "Can an external counterparty read and understand the operation without insider engineering knowledge?",
        regulatoryTags: ["NIST: Govern", "ISO 42001 A.7.5", "EU AI Act Art.13"],
        capOptions: [
            { val: 0, title: "0 — Absent", desc: "Opaque infrastructure. Unintelligible to anyone without deep system access." },
            { val: 1, title: "1 — Minimal", desc: "Technically legible. Requires deep engineering knowledge to interpret." },
            { val: 2, title: "2 — Partial", desc: "Professionally legible (risk registers, logs). Not tailored to specific audiences." },
            { val: 3, title: "3 — Complete", desc: "Counterparty-specific formats (regulatory bundles, legal summaries, investor tear-sheets)." }
        ]
    },
    {
        id: 8, title: "Model Provenance & Supply Chain", weight: 2,
        question: "Are the governance posture, training conditions, and data boundaries of underlying models verifiable?",
        regulatoryTags: ["NIST: Map", "ISO 42001 A.6/A.7", "EU AI Act Art.10"],
        capOptions: [
            { val: 0, title: "0 — Absent", desc: "Undisclosed or unverifiable models. No governance claims can be independently validated." },
            { val: 1, title: "1 — Minimal", desc: "Known model family with published safety card, but no contractual data boundaries or SLAs." },
            { val: 2, title: "2 — Partial", desc: "Enterprise agreements with zero-retention DPAs and audit rights. Verifiable data isolation." },
            { val: 3, title: "3 — Complete", desc: "Cryptographic attestation of training data provenance + independent model audit or self-hosted with verifiable lineage." }
        ]
    },
    {
        id: 9, title: "Incident Response", weight: 3,
        question: "Does the operation have a specific, restorative protocol for when AI behavior fails or drifts?",
        regulatoryTags: ["NIST: Manage", "ISO 42001 A.6.2.6", "EU AI Act Art.9/17"],
        capOptions: [
            { val: 0, title: "0 — Absent", desc: "No incident protocol exists for AI-specific failures or behavioral drift." },
            { val: 1, title: "1 — Minimal", desc: "Ad-hoc response, relying on standard IT downtime procedures. No AI-specific playbooks." },
            { val: 2, title: "2 — Partial", desc: "Dedicated AI incident response plan with playbooks for drift, jailbreaks, and prompt injection." },
            { val: 3, title: "3 — Complete", desc: "Automated containment paired with rehearsed, SLA-bound human restoration and post-incident verification." }
        ]
    },
    {
        id: 10, title: "Containment & Blast Radius", weight: 4,
        question: "If nobody stops it... what happens? (What is the architectural limit on rogue damage?)",
        regulatoryTags: ["NIST: Manage", "ISO 42001 A.3.2/A.7.4", "EU AI Act Art.9"],
        capOptions: [
            { val: 0, title: "0 — Absent", desc: "Global access. Unmetered spend. No architectural limits on agent scope or damage." },
            { val: 1, title: "1 — Minimal", desc: "Basic permissions exist, but blast radius remains large (e.g., broad API keys, shared credentials)." },
            { val: 2, title: "2 — Partial", desc: "Least privilege enforced with hard-capped budgets and scoped credentials per agent." },
            { val: 3, title: "3 — Complete", desc: "Zero-trust compartmentalization. Ephemeral sandboxes, network segmentation, and automatic budget exhaustion killswitches." }
        ]
    }
];

export const EVIDENCE_OPTIONS: ScoreOption[] = [
    { val: 0, title: "0-No Evidence", desc: "No formalized controls. Attestation only." },
    { val: 1, title: "1-Basic Docs", desc: "Manual logs or policy documents." },
    { val: 2, title: "2-Partial Systems", desc: "Fragmented system-level controls." },
    { val: 3, title: "3-Formal Verification", desc: "Cryptographic or mathematically formal guarantees." },
    { val: 4, title: "4-Continuous Audit", desc: "Automated, tamper-evident continuous audit." }
];
