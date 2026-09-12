import type { 
  AuthorityMapEdgeInput, 
  AuthorityMapNodeInput, 
  CandidateFinding 
} from './types';

/**
 * Rule 7: Temporal Control Deficiency (ASI01, ASI08)
 * 
 * Logic:
 * A static scalar limit (e.g., $50 max per transaction) is easily defeated by split transactions
 * (e.g., $48.50 + $48.50 in 90 seconds) unless bound by an effective temporal rate-limiting window
 * or cumulative volume cap.
 * 
 * IF an edge involves financial transactions or irreversible actions:
 *   AND has an autonomous scalar limit (defined via temporalConstraint.scalarLimit or permissionScope cap)
 *   AND (temporalConstraint is missing OR windowSeconds <= 0 OR maxCumulativeAmount is undefined)
 * THEN generate candidate finding:
 *   - Framework refs: ['ASI01', 'ASI08']
 *   - Severity: 'high'
 *   - Confidence: 'moderate'
 *   - Evidence level: 'E1_documented'
 * 
 * Negative Control:
 * IF the edge has a valid temporalConstraint with windowSeconds > 0 and a defined maxCumulativeAmount,
 * NO finding is generated.
 */
export function evaluateRule7TemporalConstraints(
  edges: AuthorityMapEdgeInput[],
  _nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];

  for (const edge of edges) {
    const isFinancialOrIrreversible = 
      edge.actionReversibility === 'irreversible' ||
      edge.permissionScope.includes('refund') ||
      edge.permissionScope.includes('payment') ||
      edge.permissionScope.includes('transfer');

    // Check if edge has a scalar limit either through structured temporalConstraint or permission scope
    const hasStructuredScalar = edge.temporalConstraint?.scalarLimit?.maxAmount !== undefined;
    const hasScopeScalar = /under_\d+|limit_\d+|\$?\d+/.test(edge.permissionScope) && 
      !edge.requiresHumanApproval;

    if (isFinancialOrIrreversible && (hasStructuredScalar || hasScopeScalar)) {
      const tc = edge.temporalConstraint;
      const scalarAmount = tc?.scalarLimit?.maxAmount ?? 'inferred_from_scope';
      const windowSeconds = tc?.temporalLimit?.windowSeconds ?? 0;
      const cumulativeCap = tc?.temporalLimit?.maxCumulativeAmount;

      const lacksTemporalWindow = windowSeconds <= 0;
      const lacksCumulativeCap = cumulativeCap === undefined;

      if (lacksTemporalWindow || lacksCumulativeCap) {
        findings.push({
          frameworkRefs: ['ASI01', 'ASI08'],
          severity: 'high',
          confidence: 'moderate',
          evidenceLevel: 'E1_documented',
          description: `Static limit on edge '${edge.id}' lacks temporal windowing or cumulative caps, exposing system to split-action bypass.`,
          basis: `scalar_limit=${scalarAmount}, window_seconds=${windowSeconds}, cumulative_cap=${cumulativeCap ?? 'none'}, temporal_enforcement=false`,
          authorityMapEdgeId: edge.id
        });
      }
    }
  }

  return findings;
}
