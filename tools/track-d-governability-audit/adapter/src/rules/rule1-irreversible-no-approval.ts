import { CandidateFinding, AuthorityMapEdgeInput, AuthorityMapNodeInput } from './types.js';

/**
 * Rule 1: 
 * IF edge.edge_type = 'calls' 
 * AND edge.action_reversibility = 'irreversible' 
 * AND edge.requires_human_approval = false 
 * THEN critical/ASI01
 */
export function evaluateRule1IrreversibleNoApproval(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];

  for (const edge of edges) {
    if (
      edge.edgeType === 'calls' &&
      edge.actionReversibility === 'irreversible' &&
      edge.requiresHumanApproval === false
    ) {
      findings.push({
        frameworkRefs: ['ASI01'],
        severity: 'critical',
        confidence: 'moderate',
        evidenceLevel: 'E1_documented',
        description: 'Irreversible action can be called without human approval.',
        basis: `Edge ${edge.id} allows 'calls' with irreversible action reversibility and no human approval.`,
        authorityMapEdgeId: edge.id
      });
    }
  }

  return findings;
}
