export interface DimensionEvidence {
  dimensionId: number;
  title: string;
  requiredEvidence: string;
  acceptableArtifacts: string[];
  redFlags: string[];
  remediationSuggestion: string;
}

export const EVIDENCE_REQUIREMENTS: Record<number, DimensionEvidence> = {
  1: {
    dimensionId: 1,
    title: "Reversibility & Human Intercept",
    requiredEvidence: "Enforced delay windows or human confirmation gates before state-mutating actions execute.",
    acceptableArtifacts: [
      "Queue delay configuration with TTL",
      "Two-phase commit workflow logs",
      "Approval queue UI/API specifications",
      "Undo/rollback execution handlers"
    ],
    redFlags: [
      "Direct API calls without delay",
      "No human-in-the-loop approval step for high-risk actions",
      "Irreversible database/external mutations"
    ],
    remediationSuggestion: "Implement a mandatory hold buffer (e.g. 60-second delay or human approval gate) before executing non-reversible external actions."
  },
  2: {
    dimensionId: 2,
    title: "Audit Provenance",
    requiredEvidence: "Tamper-evident logs recording every agent decision, tool call, prompt context, and output.",
    acceptableArtifacts: [
      "Append-only event log streams (e.g. Kafka/AWS Kinesis)",
      "Cryptographic log hashes / Merkle trees",
      "Structured JSON audit schema containing actor, timestamp, input, output, and approval state"
    ],
    redFlags: [
      "Mutable database logs without write-once controls",
      "Console stdout only without persistence",
      "Missing prompt or tool call inputs in log payload"
    ],
    remediationSuggestion: "Implement append-only event logging capturing actor ID, timestamp, tool call name, approval state, and SHA-256 output hash."
  },
  3: {
    dimensionId: 3,
    title: "Safe Intervention & Halt (Kill Switch)",
    requiredEvidence: "Instant global and per-agent emergency stop mechanism accessible to authorized operators.",
    acceptableArtifacts: [
      "Circuit breaker configuration & kill-switch API endpoint",
      "Operator panic button UI / Runbook",
      "Graceful degradation test results"
    ],
    redFlags: [
      "Requires restarting application processes to halt agent",
      "No operator alert on anomalous execution spikes",
      "Unsynchronized worker loops that ignore stop flags"
    ],
    remediationSuggestion: "Build a global Redis/feature-flag circuit breaker that worker loops poll before every agent action."
  },
  4: {
    dimensionId: 4,
    title: "Behavior Verification against Explicit Policies",
    requiredEvidence: "Automated assertion layers validating agent outputs against regulatory and corporate policy schemas.",
    acceptableArtifacts: [
      "JSON Schema validation passes",
      "Pre/Post-condition guardrail code (e.g., NeMo Guardrails, Llama Guard)",
      "Automated policy evaluation test suites"
    ],
    redFlags: [
      "Relying solely on system prompt instructions for safety",
      "Unvalidated LLM output passed directly to downstream APIs",
      "No automated unit tests for policy compliance"
    ],
    remediationSuggestion: "Enforce deterministic post-processing schemas and automated guardrail evaluation on all raw model outputs."
  },
  5: {
    dimensionId: 5,
    title: "Delegation Limits & Boundary Codification",
    requiredEvidence: "Hard-coded financial, volume, and operational boundary checks embedded in execution code.",
    acceptableArtifacts: [
      "Max spend / transaction limits in code",
      "Rate-limiting and request quota configurations",
      "Role-Based Access Control (RBAC) scopes"
    ],
    redFlags: [
      "Agent has unrestricted API token permissions",
      "No cap on execution retries or token expenditure",
      "Agent can dynamically alter its own authority scope"
    ],
    remediationSuggestion: "Encapsulate agent credentials into low-privilege service accounts with explicit per-transaction and daily spending limits."
  },
  6: {
    dimensionId: 6,
    title: "Institutional Liability & Ownership Mapping",
    requiredEvidence: "Documented legal responsibility framework and human accountability assignment per agent workflow.",
    acceptableArtifacts: [
      "Signed RACI matrix identifying human system owner",
      "Insurance policy covering autonomous system errors & omissions",
      "Counterparty Terms of Service / Liability SLA"
    ],
    redFlags: [
      "Unassigned ownership of autonomous workflow decisions",
      "No clear escalation path for customer disputes caused by agent actions",
      "Disclaimed liability without counterparty agreement"
    ],
    remediationSuggestion: "Establish an operational RACI framework assigning explicit human sign-off responsibility for agent operations."
  },
  7: {
    dimensionId: 7,
    title: "Governance Transparency to External Counterparties",
    requiredEvidence: "Auditable documentation and live dashboard describing active control systems to third parties.",
    acceptableArtifacts: [
      "External Security Vault / SOC 2 Type II AI Addendum",
      "Live status page showing agent control status",
      "Customer-facing AI governance disclosure"
    ],
    redFlags: [
      "Black-box architecture with proprietary undisclosed safety claims",
      "Inability to provide audit evidence upon customer DDQ request",
      "Contradictory claims between marketing and technical implementation"
    ],
    remediationSuggestion: "Assemble a standardized AI Due Diligence Package containing architecture diagrams, control specs, and sample audit logs."
  },
  8: {
    dimensionId: 8,
    title: "Model Provenance & Version Control",
    requiredEvidence: "Tracked model lineage, system prompts, weights origin, and dataset privacy compliance.",
    acceptableArtifacts: [
      "Model cards / Prompt version repository (Git tracked)",
      "Vendor SLA confirming data opt-out (no training on customer data)",
      "Deterministic model seed & parameter locking"
    ],
    redFlags: [
      "Using non-pinned 'latest' model endpoints in production",
      "Uncontrolled prompt edits without Git history",
      "Uncertainty regarding training data IP or privacy compliance"
    ],
    remediationSuggestion: "Pin exact model version identifiers (e.g. gpt-4o-2024-08-06) and store system prompts in version-controlled repositories."
  },
  9: {
    dimensionId: 9,
    title: "Autonomous Failure Recovery & Incident Playbooks",
    requiredEvidence: "Tested failure modes, fallback routines, and incident post-mortem procedures.",
    acceptableArtifacts: [
      "Chaos engineering / Failure mode simulation results",
      "Automated fallback to deterministic heuristics or human queues",
      "Incident response runbook for agent hallucinations or loops"
    ],
    redFlags: [
      "System hangs or loops endlessly on API errors",
      "Data corruption caused by partial agent execution",
      "No post-mortem protocol for autonomous incidents"
    ],
    remediationSuggestion: "Implement automatic fallback to human queues on 2 consecutive agent step failures or unexpected schema responses."
  },
  10: {
    dimensionId: 10,
    title: "Blast-Radius Containment",
    requiredEvidence: "Strict isolation of network, database, and messaging permissions to prevent lateral movement.",
    acceptableArtifacts: [
      "Network security group rules / VPC isolation",
      "Database read-only / table-level access scoping",
      "Sandboxed code execution environment (e.g. E2B, Docker)"
    ],
    redFlags: [
      "Agent runs with root/admin database privileges",
      "Agent can send unmoderated emails to arbitrary external addresses",
      "Agent environment has egress access to internal corporate subnets"
    ],
    remediationSuggestion: "Sandbox agent execution environments, enforce strict egress firewalls, and restrict database credentials to scoped schemas."
  }
};
