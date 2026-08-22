// Phase D: Canonical v0.1 domain model, TypeScript.
// Mirrors db/001_init_schema.sql exactly. If the two drift, the SQL file
// is the source of truth, this file should be regenerated from it.

export type AuthorityNodeType =
  | "agent" | "model" | "memory" | "tool" | "api" | "data_source" | "external_agent" | "identity";

export type AuthorityEdgeType = "reads" | "writes" | "calls" | "delegates_to" | "authenticates_as";

export type DataClassification = "public" | "internal" | "confidential" | "restricted";
export type Reversibility = "reversible" | "partially_reversible" | "irreversible";
export type TrustBoundary = "internal" | "partner" | "external" | "unknown";

export type Framework = "ACSC_ISM" | "OWASP_ASI" | "CIR" | "ISO_42001" | "ISO_23894" | "NIST_AI_RMF" | "MITRE_ATLAS";
export type AssuranceLayer = "security_posture" | "agentic_behaviour" | "governance_assurance";

export type AssessmentLevel = "L1_diagnostic" | "L2_validated" | "L3_partnered";
export type AssessmentStatus = "intake" | "mapping" | "diagnostics" | "human_review" | "report_ready" | "delivered";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "informational";
export type FindingConfidence = "low" | "moderate" | "high";
export type FindingStatus = "open" | "acknowledged" | "remediated" | "accepted_risk";

// Ordered array, index doubles as rank. Keep in sync with level_rank in the SQL trigger.
export const EVIDENCE_LEVEL_RANK = [
  "E0_claimed", "E1_documented", "E2_observed", "E3_validated", "E4_adversarially_tested",
] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVEL_RANK)[number];

export type EvidenceType = "document" | "log_excerpt" | "test_result" | "screenshot" | "config_extract" | "client_statement";
export type SubmittedByType = "client" | "operator" | "reviewer" | "test_harness";

export type ReviewerRole = "operator" | "human_validator" | "specialist_partner" | "internal_validator";
export type ReviewDecisionType = "accept" | "reject" | "modify" | "request_more_evidence" | "downgrade_confidence" | "upgrade_evidence";

export interface Client {
  id: string;
  name: string;
  contactEmail: string;
  industry?: string;
  createdAt: string;
}

export interface AgentSystem {
  id: string;
  clientId: string;
  name: string;
  modelProvider?: string;
  modelName?: string;
  description?: string;
  createdAt: string;
}

export interface Reviewer {
  id: string;
  name: string;
  role: ReviewerRole;
  createdAt: string;
}

export interface Assessment {
  id: string;
  clientId: string;
  systemId: string;
  level: AssessmentLevel;
  status: AssessmentStatus;
  assignedReviewerId?: string;
  startedAt: string;
  completedAt?: string;
}

export interface AuthorityMapNode {
  id: string;
  systemId: string;
  nodeType: AuthorityNodeType;
  name: string;
  identity?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuthorityMapEdge {
  id: string;
  systemId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: AuthorityEdgeType;
  permissionScope: string;
  requiresHumanApproval: boolean;
  dataClassification?: DataClassification;
  actionReversibility?: Reversibility;
  trustBoundary: TrustBoundary;
  observable: boolean;
  credentialRef?: string;
  createdAt: string;
}

export interface FrameworkReference {
  id: string;
  framework: Framework;
  referenceCode: string;
  title: string;
  layer: AssuranceLayer;
}

export interface Finding {
  id: string;
  assessmentId: string;
  frameworkReferenceId?: string;
  authorityMapNodeId?: string;
  authorityMapEdgeId?: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  evidenceLevel: EvidenceLevel;
  status: FindingStatus;
  draftedBy: string; // "llm" or a reviewer/operator id
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  findingId: string;
  evidenceType: EvidenceType;
  contentHash: string;
  storageRef: string;
  supportsLevel: EvidenceLevel;
  submittedByType: SubmittedByType;
  submittedById?: string;
  submittedAt: string;
  supersededBy?: string;
}

export interface Recommendation {
  id: string;
  findingId: string;
  description: string;
  priority: FindingSeverity;
  owner: "client_action" | "operator_action";
  createdAt: string;
}

export interface ReviewDecision {
  id: string;
  findingId: string;
  reviewerId: string;
  decision: ReviewDecisionType;
  reasoning: string;
  evidenceId?: string;
  createdAt: string;
}

/**
 * Application-layer guard mirroring the SQL trigger `enforce_evidence_integrity`.
 * The database is the real enforcement point; this is a fast-fail check so
 * the API never issues a write it knows will be rejected, and so tests can
 * exercise the rule without a database.
 *
 * Deliberately NOT trusting `evidence.submittedByType` from request bodies:
 * the caller's authenticated identity must be looked up server-side and
 * used to set this field, never accepted as client input. That check lives
 * in the API layer (11-api-contract.yaml), not here.
 */
export function canSetEvidenceLevel(
  targetLevel: EvidenceLevel,
  qualifyingEvidence: Pick<Evidence, "supportsLevel" | "submittedByType" | "supersededBy">[]
): boolean {
  const targetRank = EVIDENCE_LEVEL_RANK.indexOf(targetLevel);
  if (targetRank <= EVIDENCE_LEVEL_RANK.indexOf("E1_documented")) return true; // E0/E1 always allowed
  return qualifyingEvidence.some(
    (e) =>
      e.supersededBy == null &&
      (e.submittedByType === "reviewer" || e.submittedByType === "test_harness") &&
      EVIDENCE_LEVEL_RANK.indexOf(e.supportsLevel) >= targetRank
  );
}
