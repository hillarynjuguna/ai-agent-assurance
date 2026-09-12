import { createHash } from 'crypto';
import type { 
  AuthorityMapEdgeInput, 
  AuthorityMapNodeInput, 
  TrustBoundary 
} from '../rules/types';
import type { 
  AuthorityPath, 
  PathReference, 
  ControlSemantics 
} from './types';

export const TRAVERSAL_ALGORITHM_VERSION = '1.0.0';

export interface TraversalOptions {
  maxDepth?: number;
  algorithmVersion?: string;
}

/**
 * Builds a deterministic PathReference from an AuthorityPath.
 */
export function createPathReference(
  path: AuthorityPath, 
  algorithmVersion: string = TRAVERSAL_ALGORITHM_VERSION
): PathReference {
  const hashPayload = `${path.nodeIds.join('->')}|${path.edgeIds.join('->')}`;
  const pathHash = createHash('sha256').update(hashPayload).digest('hex');

  return {
    pathId: path.id,
    pathHash,
    traversalAlgorithm: 'bounded_depth_dfs_v1',
    algorithmVersion,
    nodeIds: path.nodeIds,
    edgeIds: path.edgeIds
  };
}

/**
 * Traverses the Authority Graph to discover security-relevant paths.
 * 
 * Path criteria:
 * - Originates at an untrusted ingress point (external data source, external agent, or ingress-tagged edge)
 * - Traverses agent/tool processing logic across boundaries (hopCount >= 2)
 * - Terminates at an external egress point, state mutation, or irreversible action
 * 
 * Safeguards:
 * - Cycle protection using path-local visitedNodeIds set
 * - Hard depth bounding (default maxDepth = 6)
 * - Deterministic path identification and sorting
 */
export function findSecurityRelevantPaths(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[],
  options?: TraversalOptions
): AuthorityPath[] {
  const maxDepth = options?.maxDepth ?? 6;
  const nodeMap = new Map<string, AuthorityMapNodeInput>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  // Adjacency list: sourceNodeId -> edges
  const outgoingEdges = new Map<string, AuthorityMapEdgeInput[]>();
  for (const edge of edges) {
    if (!outgoingEdges.has(edge.sourceNodeId)) {
      outgoingEdges.set(edge.sourceNodeId, []);
    }
    outgoingEdges.get(edge.sourceNodeId)!.push(edge);
  }

  // Sort outgoing edges deterministically by ID
  for (const [, edgeList] of outgoingEdges) {
    edgeList.sort((a, b) => a.id.localeCompare(b.id));
  }

  // Determine if a node constitutes an untrusted ingress origin
  function isUntrustedIngressOrigin(node: AuthorityMapNodeInput, firstEdge?: AuthorityMapEdgeInput): boolean {
    // Explicit ingress classification on first outgoing edge
    if (firstEdge?.dataFlow === 'ingress') {
      return true;
    }

    // External data source (e.g. Inbound Customer Emails)
    if (node.nodeType === 'data_source') {
      const boundary = node.metadata?.trust_boundary as string | undefined;
      return boundary === 'external' || boundary === 'unknown' || firstEdge?.trustBoundary === 'external';
    }

    // External agent is untrusted ingress
    if (node.nodeType === 'external_agent') {
      return true;
    }

    // If node is explicitly marked with external trust boundary and is not an internal agent
    const nodeBoundary = node.metadata?.trust_boundary as string | undefined;
    if ((nodeBoundary === 'external' || nodeBoundary === 'unknown') && node.nodeType !== 'agent') {
      return true;
    }

    return false;
  }

  const discoveredPaths: AuthorityPath[] = [];

  // Depth-First Search with backtracking
  function dfs(
    currentNodeId: string,
    currentPathNodes: string[],
    currentPathEdges: AuthorityMapEdgeInput[],
    visitedNodeIds: Set<string>,
    depth: number
  ) {
    if (depth > maxDepth) {
      return;
    }

    const currentEdgeList = outgoingEdges.get(currentNodeId) || [];

    for (const edge of currentEdgeList) {
      const nextNodeId = edge.targetNodeId;

      // Cycle prevention: prevent visiting a node already in the current traversal path
      if (visitedNodeIds.has(nextNodeId)) {
        continue;
      }

      const nextNode = nodeMap.get(nextNodeId);
      if (!nextNode) {
        continue;
      }

      const updatedPathNodes = [...currentPathNodes, nextNodeId];
      const updatedPathEdges = [...currentPathEdges, edge];
      const nextVisited = new Set(visitedNodeIds);
      nextVisited.add(nextNodeId);

      // Evaluate whether the path so far represents a security-relevant complete path
      const evaluated = evaluatePathProperties(updatedPathNodes, updatedPathEdges, nodeMap);

      if (isSecurityRelevant(evaluated)) {
        discoveredPaths.push(evaluated);
      }

      // Continue traversal if depth permits
      dfs(nextNodeId, updatedPathNodes, updatedPathEdges, nextVisited, depth + 1);
    }
  }

  // Identify starting nodes
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  for (const candidateStartNode of sortedNodes) {
    const firstEdges = outgoingEdges.get(candidateStartNode.id) || [];
    const hasIngressEdge = firstEdges.some(e => isUntrustedIngressOrigin(candidateStartNode, e));

    if (isUntrustedIngressOrigin(candidateStartNode) || hasIngressEdge) {
      const initialVisited = new Set<string>([candidateStartNode.id]);
      dfs(candidateStartNode.id, [candidateStartNode.id], [], initialVisited, 1);
    }
  }

  // Deterministically sort discovered paths
  discoveredPaths.sort((a, b) => a.id.localeCompare(b.id));

  return discoveredPaths;
}

function evaluatePathProperties(
  nodeIds: string[],
  edges: AuthorityMapEdgeInput[],
  nodeMap: Map<string, AuthorityMapNodeInput>
): AuthorityPath {
  const startNodeId = nodeIds[0];
  const terminalNodeId = nodeIds[nodeIds.length - 1];
  const hopCount = edges.length;

  const trustBoundariesCrossed: TrustBoundary[] = [];
  const controlsAlongPath: ControlSemantics[] = [];

  let hasUntrustedIngress = false;
  let hasExternalEgress = false;
  let hasStateMutation = false;
  let hasIrreversibleAction = false;
  let carriesSensitiveData = false;

  const startNode = nodeMap.get(startNodeId);
  const terminalNode = nodeMap.get(terminalNodeId);

  // Check ingress on start node or first edge
  if (startNode) {
    if (startNode.nodeType === 'external_agent') {
      hasUntrustedIngress = true;
    } else if (startNode.nodeType === 'data_source') {
      const boundary = startNode.metadata?.trust_boundary as string | undefined;
      if (boundary === 'external' || boundary === 'unknown' || (edges.length > 0 && edges[0].trustBoundary === 'external')) {
        hasUntrustedIngress = true;
      }
    } else {
      const nodeBoundary = startNode.metadata?.trust_boundary as TrustBoundary | undefined;
      if ((nodeBoundary === 'external' || nodeBoundary === 'unknown') && startNode.nodeType !== 'agent') {
        hasUntrustedIngress = true;
      }
    }

    if (startNode.controlSemantics) {
      controlsAlongPath.push(startNode.controlSemantics);
    }
  }

  if (edges.length > 0 && edges[0].dataFlow === 'ingress') {
    hasUntrustedIngress = true;
  }

  // Iterate edges
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];

    if (!trustBoundariesCrossed.includes(edge.trustBoundary)) {
      trustBoundariesCrossed.push(edge.trustBoundary);
    }

    // Check egress on terminal edge
    if (i === edges.length - 1) {
      if (edge.dataFlow === 'egress' || edge.externalSideEffect || edge.trustBoundary === 'external') {
        hasExternalEgress = true;
      }
    }

    if (
      edge.edgeType === 'writes' || 
      (edge.mutatesState && edge.mutatesState !== 'none') || 
      edge.permissionScope.includes('write') || 
      edge.permissionScope.includes('create') ||
      edge.permissionScope.includes('update')
    ) {
      hasStateMutation = true;
    }

    if (edge.actionReversibility === 'irreversible') {
      hasIrreversibleAction = true;
    }

    if (edge.carriesSensitiveData) {
      carriesSensitiveData = true;
    }

    if (edge.controlSemantics) {
      controlsAlongPath.push(edge.controlSemantics);
    }

    const targetNode = nodeMap.get(edge.targetNodeId);
    if (targetNode?.controlSemantics) {
      controlsAlongPath.push(targetNode.controlSemantics);
    }
  }

  // Check terminal node
  if (terminalNode) {
    if (terminalNode.nodeType === 'api' || terminalNode.nodeType === 'external_agent') {
      hasExternalEgress = true;
    }
  }

  // A path is effectively gated if it passes through an enforced, pre-execution, fail-closed gate or sanitization boundary
  const isEffectivelyGated = controlsAlongPath.some(c => 
    c.controlPresent && 
    c.controlEnforced && 
    (c.sanitizationBoundary === true || 
      (c.executionPoint === 'pre_execution' && c.failMode === 'fail_closed' && c.defaultAction === 'deny'))
  );

  const hashPayload = `${nodeIds.join('->')}|${edges.map(e => e.id).join('->')}`;
  const pathId = `path-${createHash('sha256').update(hashPayload).digest('hex').slice(0, 16)}`;

  return {
    id: pathId,
    nodeIds,
    edgeIds: edges.map(e => e.id),
    startNodeId,
    terminalNodeId,
    hopCount,
    trustBoundariesCrossed,
    hasUntrustedIngress,
    hasExternalEgress,
    hasStateMutation,
    hasIrreversibleAction,
    carriesSensitiveData,
    controlsAlongPath,
    isEffectivelyGated
  };
}

function isSecurityRelevant(path: AuthorityPath): boolean {
  // Must originate from untrusted ingress
  if (!path.hasUntrustedIngress) {
    return false;
  }

  // Composed path analysis evaluates reachability across 2 or more hops
  // (Single-hop direct calls are evaluated by edge-level analysis: Rule 1, Rule 2, Rule 4)
  if (path.hopCount < 2) {
    return false;
  }

  // Must terminate or result in external egress, state mutation, or irreversible action
  return path.hasExternalEgress || path.hasStateMutation || path.hasIrreversibleAction;
}
