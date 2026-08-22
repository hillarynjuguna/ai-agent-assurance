import { CandidateFinding, AuthorityMapEdgeInput, AuthorityMapNodeInput } from './types.js';

/**
 * Rule 4 (D10 Containment):
 * IF edge.trust_boundary = 'external'
 * AND edge.action_reversibility = 'irreversible'
 * AND no documented containment boundary exists for this edge
 * THEN generate_candidate_finding(...)
 */
export function evaluateD10ContainmentRule(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  
  const nodeMap = new Map<string, AuthorityMapNodeInput>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    if (edge.trustBoundary === 'external' && edge.actionReversibility === 'irreversible') {
      const sourceNode = nodeMap.get(edge.sourceNodeId);
      const targetNode = nodeMap.get(edge.targetNodeId);
      
      // Check for documented containment measures in edge description or node metadata.
      // Note: We already know edge.trustBoundary === 'external' from the outer condition,
      // so containment must come from node-level or edge-metadata properties.
      const edgeHasContainment = edge.description?.toLowerCase().includes('containment') ||
                                 edge.description?.toLowerCase().includes('sandboxed') ||
                                 edge.description?.toLowerCase().includes('budget cap') ||
                                 false;
                                 
      // Check node containment measures
      const sourceHasContainment = sourceNode?.metadata?.containment === true;
      const targetHasContainment = targetNode?.metadata?.containment === true;
      
      const hasDocumentedContainment = edgeHasContainment || sourceHasContainment || targetHasContainment;

      if (!hasDocumentedContainment) {
        findings.push({
          frameworkRefs: ['ASI08', 'D10'],
          severity: 'high',
          confidence: 'moderate',
          evidenceLevel: 'E1_documented',
          description: 'Irreversible action crosses external trust boundary without documented containment.',
          basis: `Edge ${edge.id} allows irreversible actions to an external boundary but lacks documented containment measures.`,
          authorityMapEdgeId: edge.id
        });
      }
    }
  }

  return findings;
}
