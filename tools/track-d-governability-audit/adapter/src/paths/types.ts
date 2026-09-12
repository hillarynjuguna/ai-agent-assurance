import type { TrustBoundary } from '../rules/types';

export type DataFlowClassification = 'ingress' | 'egress' | 'internal_state' | 'control_signal';
export type StateMutationType = 'none' | 'transient' | 'persistent_storage' | 'credential_store';
export type ControlExecutionPoint = 'pre_execution' | 'post_execution' | 'out_of_band' | 'asynchronous_logging';
export type ControlFailMode = 'fail_open' | 'fail_closed' | 'indeterminate';
export type ControlDefaultAction = 'allow' | 'deny' | 'escalate';

export interface ControlSemantics {
  controlId: string;
  name?: string;
  controlPresent: boolean;
  controlEnforced: boolean;
  executionPoint: ControlExecutionPoint;
  failMode: ControlFailMode;
  defaultAction: ControlDefaultAction;
  timeoutMs?: number;
  bypassConditions?: string[];
  sanitizationBoundary?: boolean;
}

export interface TemporalConstraint {
  scalarLimit?: {
    maxAmount?: number;
    currency?: string;
    unit?: string;
  };
  temporalLimit?: {
    windowSeconds: number;
    maxCumulativeAmount?: number;
    maxOccurrences?: number;
  };
  rateLimit?: {
    maxRequests: number;
    periodSeconds: number;
  };
  retryBudget?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface AuthorityPath {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  startNodeId: string;
  terminalNodeId: string;
  hopCount: number;
  trustBoundariesCrossed: TrustBoundary[];
  hasUntrustedIngress: boolean;
  hasExternalEgress: boolean;
  hasStateMutation: boolean;
  hasIrreversibleAction: boolean;
  carriesSensitiveData?: boolean;
  controlsAlongPath: ControlSemantics[];
  isEffectivelyGated: boolean;
}

export interface PathReference {
  pathId: string;
  pathHash: string;
  traversalAlgorithm: string;
  algorithmVersion: string;
  nodeIds: string[];
  edgeIds: string[];
}

export type FindingStage = 'candidate' | 'established' | 'dispositioned';
