import { ValidatedTrackDExport } from '../track-d-types';
import { SeededAuthorityMap } from '../authority-map-seed';
import { SystemSnapshot } from './types';

export interface CreateSnapshotOptions {
  systemId: string;
  sourceArtifactHash: string;
  authorityMap: SeededAuthorityMap;
  sourceVersion?: string | null;
  capturedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an immutable SystemSnapshot representing the frozen system state.
 * 
 * Epistemic Rules:
 * - Deterministic snapshot identity is computed from systemId + configHash.
 * - Distinguishes sourceVersion (from client/export) from snapshot identifier (assessment-generated).
 * - Immutably stores the exact Authority Map state derived for this snapshot.
 */
export function createSystemSnapshot(options: CreateSnapshotOptions): SystemSnapshot {
  const {
    systemId,
    sourceArtifactHash,
    authorityMap,
    sourceVersion = null,
    capturedAt = new Date().toISOString(),
    metadata = {}
  } = options;

  // Deterministic snapshot identifier based on systemId and first 16 hex chars of configHash
  const shortHash = sourceArtifactHash.substring(0, 16);
  const snapshotId = `snapshot-${systemId}-${shortHash}`;
  const authorityMapId = `authmap-${snapshotId}`;

  return {
    id: snapshotId,
    systemId,
    sourceVersion: sourceVersion ?? null,
    configHash: sourceArtifactHash,
    capturedAt,
    authorityMapId,
    authorityMap: {
      ...authorityMap,
      systemId
    },
    metadata: {
      ...metadata,
      schemaVersion: metadata.schemaVersion || '6.1.0',
      nodeCount: authorityMap.nodes.length,
      edgeCount: authorityMap.edges.length,
    }
  };
}

/**
 * Convenience helper to create a SystemSnapshot directly from a validated Track D export.
 */
export function createSystemSnapshotFromTrackD(
  validated: ValidatedTrackDExport,
  sourceArtifactHash: string,
  authorityMap: SeededAuthorityMap,
  systemId: string = 'system-default'
): SystemSnapshot {
  return createSystemSnapshot({
    systemId,
    sourceArtifactHash,
    authorityMap,
    sourceVersion: validated.schemaVersion || null,
    metadata: {
      company: validated.assessment.metadata.company,
      criticality: validated.assessment.metadata.criticality,
      audience: validated.assessment.metadata.audience,
      confidence: validated.assessment.metadata.confidence,
    }
  });
}
