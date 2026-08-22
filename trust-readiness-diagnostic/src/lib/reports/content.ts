import { DIMENSIONS } from "../../data/dimensions";
import { EVIDENCE_REQUIREMENTS } from "../../data/evidence";
import { calculateScores, ScoreData } from "../../utils/scoring";

export interface EvidenceChecklistItem {
  dimensionId: number;
  title: string;
  requiredEvidence: string;
  acceptableArtifacts: string[];
  redFlags: string[];
  status: "PASS" | "NEEDS_ATTENTION" | "CRITICAL_GAP" | "EXEMPT";
  capabilityScore: number;
  assuranceScore: number;
  isNA: boolean;
}

export interface RemediationStep {
  priority: "HIGH" | "MEDIUM" | "LOW";
  dimensionId: number;
  title: string;
  deficitType: "Capability" | "Assurance" | "Both";
  actionableStep: string;
  targetOutcome: string;
}

export interface StructuredReportContent {
  executiveSummary: string;
  counterpartyReadinessSummary: string;
  topRisks: Array<{
    dimensionId: number;
    title: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    description: string;
  }>;
  evidenceChecklist: EvidenceChecklistItem[];
  remediationPlan: RemediationStep[];
  reviewQuestions: Array<{
    counterparty: "Payment Processor" | "Investor" | "Insurer" | "Enterprise Client" | "Regulator";
    question: string;
    whyAsked: string;
  }>;
  validityWindow: {
    validDays: number;
    validUntilIso: string;
    recommendation: string;
  };
  recommendedNextActions: string[];
}

export function generateReportContent(
  dimensionData: ScoreData,
  criticality: string = "Operational",
  operationAssessed: string = "Assessed Workflow"
): StructuredReportContent {
  const HIGH_RISK_PROFILES = new Set(["Financial", "Regulated", "Safety-Critical"]);
  const isHighRisk = HIGH_RISK_PROFILES.has(criticality);
  const results = calculateScores(dimensionData, DIMENSIONS, isHighRisk);

  // 1. Evidence Checklist
  const evidenceChecklist: EvidenceChecklistItem[] = DIMENSIONS.map((d, index) => {
    const dimId = index + 1;
    const entry = dimensionData[dimId] || { cap: 0, evid: 0, na: false };
    const req = EVIDENCE_REQUIREMENTS[dimId] || {
      requiredEvidence: "Standard control evidence",
      acceptableArtifacts: ["System logs"],
      redFlags: ["No evidence"],
      remediationSuggestion: "Implement standard control"
    };

    let status: "PASS" | "NEEDS_ATTENTION" | "CRITICAL_GAP" | "EXEMPT" = "PASS";
    if (entry.na) {
      status = "EXEMPT";
    } else if (entry.cap < 2 && entry.evid < 2) {
      status = "CRITICAL_GAP";
    } else if (entry.cap < 2 || entry.evid < 2) {
      status = "NEEDS_ATTENTION";
    }

    return {
      dimensionId: dimId,
      title: d.title,
      requiredEvidence: req.requiredEvidence,
      acceptableArtifacts: req.acceptableArtifacts,
      redFlags: req.redFlags,
      status,
      capabilityScore: entry.cap,
      assuranceScore: entry.evid,
      isNA: entry.na,
    };
  });

  // 2. Remediation Plan
  const remediationPlan: RemediationStep[] = [];
  DIMENSIONS.forEach((d, index) => {
    const dimId = index + 1;
    const entry = dimensionData[dimId] || { cap: 0, evid: 0, na: false };
    if (entry.na) return;

    const req = EVIDENCE_REQUIREMENTS[dimId];
    if (entry.cap < 2 || entry.evid < 2) {
      let deficitType: "Capability" | "Assurance" | "Both" = "Both";
      if (entry.cap < 2 && entry.evid >= 2) deficitType = "Capability";
      else if (entry.cap >= 2 && entry.evid < 2) deficitType = "Assurance";

      remediationPlan.push({
        priority: (entry.cap < 2 && entry.evid < 2) ? "HIGH" : "MEDIUM",
        dimensionId: dimId,
        title: d.title,
        deficitType,
        actionableStep: req ? req.remediationSuggestion : `Improve controls for D${dimId}.`,
        targetOutcome: `Achieve Level 2+ capability and Level 2+ evidence assurance for ${d.title}.`
      });
    }
  });

  // Sort remediation by priority (HIGH first)
  remediationPlan.sort((a) => (a.priority === "HIGH" ? -1 : 1));

  // 3. Top Risks
  const topRisks = remediationPlan.slice(0, 5).map(r => ({
    dimensionId: r.dimensionId,
    title: r.title,
    severity: r.priority,
    description: `Deficit in ${r.deficitType}. ${r.actionableStep}`
  }));

  // 4. Executive Summary
  const executiveSummary = `This diagnostic evaluates institutional trust-readiness for '${operationAssessed}' operating under a ${criticality} risk classification. ` +
    `The system achieved a Capability Score of ${results.capPct}% (${results.capZone.toUpperCase()} zone) and an Assurance Score of ${results.assurPct}% (${results.assurZone.toUpperCase()} zone). ` +
    `Overall Verdict: ${results.verdict}. Under current controls, external counterparties are likely to flag ${remediationPlan.length} control deficit(s) during due diligence.`;

  // 5. Counterparty Readiness Summary
  const counterpartyReadinessSummary = `External posture evaluation across key counterparty trust gates: ` +
    `Payment Processors [${results.gates.payment.text}], Investors [${results.gates.investor.text}], ` +
    `Insurers [${results.gates.insurer.text}], Enterprise Clients [${results.gates.client.text}], ` +
    `and Regulators [${results.gates.regulator.text}]. ` +
    `${results.gates.payment.text === "HIGH RISK" ? "Payment processors will reject transaction rails until blast-radius containment (D10) and reversibility (D1) are established. " : ""}` +
    `${results.gates.insurer.text === "WEAK" ? "Insurers will decline underwriting due to audit provenance gaps (D2). " : ""}` +
    `${results.gates.client.text === "NOT READY" ? "Enterprise procurement teams will fail vendor security reviews due to boundary delegation deficits (D5)." : ""}`;

  // 6. Review Questions
  const reviewQuestions = [
    {
      counterparty: "Payment Processor" as const,
      question: "Can an autonomous agent initiate financial transfers or refund loops without a human hold buffer?",
      whyAsked: "Processors mandate chargeback & runaway spending protection before granting merchant API keys."
    },
    {
      counterparty: "Investor" as const,
      question: "If an agent causes a major customer outage or data leak, who bears legal and financial liability?",
      whyAsked: "Venture due diligence flags unassigned autonomous liability as a critical valuation blocker."
    },
    {
      counterparty: "Insurer" as const,
      question: "Are agent decision logs stored in a tamper-evident, append-only vault for post-incident claims analysis?",
      whyAsked: "Cyber E&O underwriters reject claims if event provenance cannot be proven cryptographically."
    },
    {
      counterparty: "Enterprise Client" as const,
      question: "What hard boundaries prevent the agent from accessing customer data outside its immediate task lane?",
      whyAsked: "Enterprise CISOs require strict blast-radius containment (SOC 2 Type II AI Addendum)."
    },
    {
      counterparty: "Regulator" as const,
      question: "Is there a functional kill-switch API endpoint that instantly halts all agent execution loops?",
      whyAsked: "AI safety frameworks (EU AI Act, NIST RMF) require operator override capabilities."
    }
  ];

  // 7. Validity Window
  const now = new Date();
  const validDays = isHighRisk ? 30 : 90;
  const validUntil = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);

  const validityWindow = {
    validDays,
    validUntilIso: validUntil.toISOString(),
    recommendation: `High-risk agentic workflows require re-assessment every ${validDays} days or upon any model version update.`
  };

  // 8. Recommended Next Actions
  const recommendedNextActions = [
    "Prioritize remediation of HIGH priority control deficits (D1 Reversibility, D2 Audit, D10 Containment).",
    "Assemble standardized AI Due Diligence Artifact Vault containing event log schemas and kill-switch runbooks.",
    "Schedule a 60-minute Expert Trust Review session to validate counterparty DDQ responses prior to audit submission."
  ];

  return {
    executiveSummary,
    counterpartyReadinessSummary,
    topRisks,
    evidenceChecklist,
    remediationPlan,
    reviewQuestions,
    validityWindow,
    recommendedNextActions
  };
}
