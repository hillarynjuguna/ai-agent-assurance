import { CandidateFinding, AuthorityMapEdgeInput, AuthorityMapNodeInput } from './types.js';

/**
 * Rule 2: 
 * IF edge.edge_type = 'delegates_to' 
 * AND target_node.node_type = 'external_agent' 
 * AND edge.trust_boundary IN ('external', 'unknown') 
 * THEN high/ASI07,ASI09
 */
export function evaluateRule2ExternalDelegation(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  
  const nodeMap = new Map<string, AuthorityMapNodeInput>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    if (edge.edgeType === 'delegates_to' && (edge.trustBoundary === 'external' || edge.trustBoundary === 'unknown')) {
      const targetNode = nodeMap.get(edge.targetNodeId);
      
      if (targetNode && targetNode.nodeType === 'external_agent') {
        findings.push({
          frameworkRefs: ['ASI07', 'ASI09'],
          severity: 'high',
          confidence: 'moderate',
          evidenceLevel: 'E1_documented',
          description: 'Delegation to an external agent across an external or unknown trust boundary.',
          basis: `Edge ${edge.id} delegates to external agent ${targetNode.name} across ${edge.trustBoundary} boundary.`,
          authorityMapEdgeId: edge.id
        });
      }
    }
  }

  return findings;
}
