export type AuthorityNodeType = "agent" | "model" | "memory" | "tool" | "api" | "data_source" | "external_agent" | "identity";
export type AuthorityEdgeType = "reads" | "writes" | "calls" | "delegates_to" | "authenticates_as";
export type Reversibility = "reversible" | "partially_reversible" | "irreversible";
export type TrustBoundary = "internal" | "partner" | "external" | "unknown";
export type FindingSeverity = "critical" | "high" | "medium" | "low" | "informational";
export type FindingConfidence = "low" | "moderate" | "high";
export type EvidenceLevel = "E0_claimed" | "E1_documented";

export interface CandidateFinding {
  frameworkRefs: string[];
  severity: FindingSeverity;
  confidence: FindingConfidence;
  evidenceLevel: EvidenceLevel;
  description: string;
  basis: string;
  authorityMapNodeId?: string;
  authorityMapEdgeId?: string;
}

export interface AuthorityMapEdgeInput {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: AuthorityEdgeType;
  actionReversibility?: Reversibility;
  requiresHumanApproval: boolean;
  trustBoundary: TrustBoundary;
  permissionScope: string;
  description?: string;
}

export interface AuthorityMapNodeInput {
  id: string;
  nodeType: AuthorityNodeType;
  name: string;
  identity?: string;
  metadata: Record<string, unknown>;
}
