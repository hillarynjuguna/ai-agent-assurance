import { CandidateFinding, AuthorityMapEdgeInput, AuthorityMapNodeInput } from './types';

/**
 * Rule 3: 
 * IF node.node_type = 'identity' 
 * AND count(edges) > 1 
 * AND permission scopes differ 
 * THEN high/ASI03
 */
export function evaluateRule3SharedIdentity(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  
  for (const node of nodes) {
    if (node.nodeType === 'identity') {
      const connectedEdges = edges.filter(e => e.sourceNodeId === node.id || e.targetNodeId === node.id);
      
      if (connectedEdges.length > 1) {
        const scopes = new Set<string>();
        for (const edge of connectedEdges) {
          if (edge.permissionScope) {
            scopes.add(edge.permissionScope);
          }
        }
        
        if (scopes.size > 1) {
          findings.push({
            frameworkRefs: ['ASI03'],
            severity: 'high',
            confidence: 'moderate',
            evidenceLevel: 'E1_documented',
            description: 'Identity node is shared across multiple edges with differing permission scopes.',
            basis: `Identity node ${node.id} (${node.name}) is connected to ${connectedEdges.length} edges with ${scopes.size} differing permission scopes.`,
            authorityMapNodeId: node.id
          });
        }
      }
    }
  }

  return findings;
}
