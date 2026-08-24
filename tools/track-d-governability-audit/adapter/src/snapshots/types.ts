import { SeededAuthorityMap, SeededAuthorityMapNode, SeededAuthorityMapEdge } from '../authority-map-seed';

/**
 * SystemSnapshot
 * 
 * Canonical representation of a specific, frozen system state at assessment time.
 * Invariant 7: An assessment is bound to a specific system snapshot, not an abstract system in perpetuity.
 */
export interface SystemSnapshot {
  /** Deterministic snapshot identifier (e.g. snapshot-<systemId>-<shortHash>) */
  id: string;
  /** System identifier this snapshot represents */
  systemId: string;
  /** Source-provided version (e.g. "6.1.0" or client version), or null if unversioned */
  sourceVersion: string | null;
  /** SHA-256 content hash of the source configuration/export */
  configHash: string;
  /** ISO timestamp when the snapshot was captured */
  capturedAt: string;
  /** Identifier of the Authority Map associated with this snapshot */
  authorityMapId: string;
  /** Frozen Authority Map state at snapshot time */
  authorityMap: SeededAuthorityMap;
  /** Snapshot-level metadata */
  metadata: Record<string, unknown>;
}

export interface FieldDiff<T = unknown> {
  field: string;
  from: T;
  to: T;
}

export interface EdgeModification {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  changes: FieldDiff[];
}

export interface NodeModification {
  nodeId: string;
  changes: FieldDiff[];
}

export interface SystemSnapshotDiff {
  snapshotAId: string;
  snapshotBId: string;
  systemId: string;
  configHashChanged: boolean;
  addedNodes: SeededAuthorityMapNode[];
  removedNodes: SeededAuthorityMapNode[];
  modifiedNodes: NodeModification[];
  addedEdges: SeededAuthorityMapEdge[];
  removedEdges: SeededAuthorityMapEdge[];
  modifiedEdges: EdgeModification[];
  hasStructuralChanges: boolean;
}

export type ReassessmentTriggerCondition =
  | 'authority_changed'
  | 'tool_added'
  | 'permission_changed'
  | 'external_boundary_changed'
  | 'trust_boundary_changed'
  | 'model_changed'
  | 'irreversibility_changed'
  | 'human_approval_changed';

export interface ReassessmentTriggerEvaluation {
  reassessmentRequired: boolean;
  triggeredConditions: ReassessmentTriggerCondition[];
  reasons: string[];
  evaluatedAt: string;
}
