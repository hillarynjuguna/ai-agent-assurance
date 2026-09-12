export type AuthorityNodeType = "agent" | "model" | "memory" | "tool" | "api" | "data_source" | "external_agent" | "identity";
export type AuthorityEdgeType = "reads" | "writes" | "calls" | "delegates_to" | "authenticates_as";
export type Reversibility = "reversible" | "partially_reversible" | "irreversible";
export type TrustBoundary = "internal" | "partner" | "external" | "unknown";
export type FindingSeverity = "critical" | "high" | "medium" | "low" | "informational";
export type FindingConfidence = "low" | "moderate" | "high";
export type EvidenceLevel = "E0_claimed" | "E1_documented";

import type { 
  ControlSemantics, 
  TemporalConstraint, 
  PathReference, 
  DataFlowClassification, 
  StateMutationType 
} from '../paths/types';

export interface CandidateFinding {
  frameworkRefs: string[];
  severity: FindingSeverity;
  confidence: FindingConfidence;
  evidenceLevel: EvidenceLevel;
  description: string;
  basis: string;
  authorityMapNodeId?: string;
  authorityMapEdgeId?: string;
  pathReference?: PathReference;
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
  dataFlow?: DataFlowClassification;
  mutatesState?: StateMutationType;
  carriesSensitiveData?: boolean;
  externalSideEffect?: boolean;
  controlSemantics?: ControlSemantics;
  temporalConstraint?: TemporalConstraint;
}

export interface AuthorityMapNodeInput {
  id: string;
  nodeType: AuthorityNodeType;
  name: string;
  identity?: string;
  metadata: Record<string, unknown>;
  controlSemantics?: ControlSemantics;
}

