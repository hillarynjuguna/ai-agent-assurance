import { 
  SystemSnapshot, 
  SystemSnapshotDiff, 
  NodeModification, 
  EdgeModification, 
  FieldDiff 
} from './types';
import { SeededAuthorityMapNode, SeededAuthorityMapEdge } from '../authority-map-seed';

/**
 * Computes a structural and semantic diff between two SystemSnapshots.
 * 
 * Compares:
 * - Nodes: added, removed, metadata modified
 * - Edges: added, removed, fields modified (requiresHumanApproval, actionReversibility, trustBoundary, permissionScope)
 */
export function diffSystemSnapshots(
  snapshotA: SystemSnapshot,
  snapshotB: SystemSnapshot
): SystemSnapshotDiff {
  const configHashChanged = snapshotA.configHash !== snapshotB.configHash;
  const nodesA = new Map<string, SeededAuthorityMapNode>(snapshotA.authorityMap.nodes.map(n => [n.id, n]));
  const nodesB = new Map<string, SeededAuthorityMapNode>(snapshotB.authorityMap.nodes.map(n => [n.id, n]));

  const edgesA = new Map<string, SeededAuthorityMapEdge>(snapshotA.authorityMap.edges.map(e => [e.id, e]));
  const edgesB = new Map<string, SeededAuthorityMapEdge>(snapshotB.authorityMap.edges.map(e => [e.id, e]));

  const addedNodes: SeededAuthorityMapNode[] = [];
  const removedNodes: SeededAuthorityMapNode[] = [];
  const modifiedNodes: NodeModification[] = [];

  const addedEdges: SeededAuthorityMapEdge[] = [];
  const removedEdges: SeededAuthorityMapEdge[] = [];
  const modifiedEdges: EdgeModification[] = [];

  // Check added & modified nodes
  for (const [id, nodeB] of nodesB.entries()) {
    const nodeA = nodesA.get(id);
    if (!nodeA) {
      addedNodes.push(nodeB);
    } else {
      const nodeChanges: FieldDiff[] = [];
      if (nodeA.nodeType !== nodeB.nodeType) {
        nodeChanges.push({ field: 'nodeType', from: nodeA.nodeType, to: nodeB.nodeType });
      }
      if (nodeA.name !== nodeB.name) {
        nodeChanges.push({ field: 'name', from: nodeA.name, to: nodeB.name });
      }
      // Check metadata containment
      const contA = nodeA.metadata?.containment;
      const contB = nodeB.metadata?.containment;
      if (contA !== contB) {
        nodeChanges.push({ field: 'metadata.containment', from: contA, to: contB });
      }

      if (nodeChanges.length > 0) {
        modifiedNodes.push({ nodeId: id, changes: nodeChanges });
      }
    }
  }

  // Check removed nodes
  for (const [id, nodeA] of nodesA.entries()) {
    if (!nodesB.has(id)) {
      removedNodes.push(nodeA);
    }
  }

  // Check added & modified edges
  for (const [id, edgeB] of edgesB.entries()) {
    const edgeA = edgesA.get(id);
    if (!edgeA) {
      addedEdges.push(edgeB);
    } else {
      const edgeChanges: FieldDiff[] = [];

      if (edgeA.edgeType !== edgeB.edgeType) {
        edgeChanges.push({ field: 'edgeType', from: edgeA.edgeType, to: edgeB.edgeType });
      }
      if (edgeA.actionReversibility !== edgeB.actionReversibility) {
        edgeChanges.push({ field: 'actionReversibility', from: edgeA.actionReversibility, to: edgeB.actionReversibility });
      }
      if (edgeA.requiresHumanApproval !== edgeB.requiresHumanApproval) {
        edgeChanges.push({ field: 'requiresHumanApproval', from: edgeA.requiresHumanApproval, to: edgeB.requiresHumanApproval });
      }
      if (edgeA.trustBoundary !== edgeB.trustBoundary) {
        edgeChanges.push({ field: 'trustBoundary', from: edgeA.trustBoundary, to: edgeB.trustBoundary });
      }
      if (edgeA.permissionScope !== edgeB.permissionScope) {
        edgeChanges.push({ field: 'permissionScope', from: edgeA.permissionScope, to: edgeB.permissionScope });
      }

      if (edgeChanges.length > 0) {
        modifiedEdges.push({
          edgeId: id,
          sourceNodeId: edgeB.sourceNodeId,
          targetNodeId: edgeB.targetNodeId,
          changes: edgeChanges
        });
      }
    }
  }

  // Check removed edges
  for (const [id, edgeA] of edgesA.entries()) {
    if (!edgesB.has(id)) {
      removedEdges.push(edgeA);
    }
  }

  const hasStructuralChanges = 
    addedNodes.length > 0 ||
    removedNodes.length > 0 ||
    modifiedNodes.length > 0 ||
    addedEdges.length > 0 ||
    removedEdges.length > 0 ||
    modifiedEdges.length > 0;

  return {
    snapshotAId: snapshotA.id,
    snapshotBId: snapshotB.id,
    systemId: snapshotB.systemId,
    configHashChanged,
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedEdges,
    removedEdges,
    modifiedEdges,
    hasStructuralChanges
  };
}
