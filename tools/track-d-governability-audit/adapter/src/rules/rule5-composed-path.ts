import type { 
  AuthorityMapEdgeInput, 
  AuthorityMapNodeInput, 
  CandidateFinding 
} from './types';
import { findSecurityRelevantPaths, createPathReference } from '../paths/traverse';

/**
 * Rule 5: Composed Authority Path Violation (ASI02, ASI08)
 * 
 * Logic:
 * IF a directed path exists in the Authority Graph where:
 *   - Path originates at an untrusted ingress (external boundary or data source)
 *   - Path results in state mutation AND/OR external egress
 *   - Path involves irreversible action, sensitive data movement, or unconstrained side effects
 *   - Path is NOT effectively gated (no pre-execution, fail-closed sanitization or approval)
 * THEN generate a candidate finding:
 *   - Framework refs: ['ASI02', 'ASI08']
 *   - Severity: 'critical' (if irreversible or sensitive) or 'high'
 *   - Confidence: 'moderate'
 *   - Evidence level: 'E1_documented'
 *   - PathReference: complete reconstructable node and edge chain
 * 
 * Negative Control:
 * If the path contains an effective sanitization boundary or a pre-execution fail-closed approval gate,
 * the path is considered effectively gated and NO finding is generated.
 */
export function evaluateRule5ComposedPath(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  const securityPaths = findSecurityRelevantPaths(edges, nodes);
  const findings: CandidateFinding[] = [];

  for (const path of securityPaths) {
    // If the path is effectively gated by sanitization or fail-closed pre-execution approval, skip
    if (path.isEffectivelyGated) {
      continue;
    }

    // A hazardous composed path has untrusted ingress reaching external egress or mutating state
    const isDangerous = 
      path.hasUntrustedIngress && 
      (
        (path.hasExternalEgress && (path.hasStateMutation || path.hasIrreversibleAction || path.carriesSensitiveData)) ||
        (path.hasStateMutation && path.hasExternalEgress) ||
        (path.hasIrreversibleAction)
      );

    if (isDangerous) {
      const isCritical = path.hasIrreversibleAction || path.carriesSensitiveData;
      const pathRef = createPathReference(path);

      findings.push({
        frameworkRefs: ['ASI02', 'ASI08'],
        severity: isCritical ? 'critical' : 'high',
        confidence: 'moderate',
        evidenceLevel: 'E1_documented',
        description: `Composed uncontained authority path detected: '${path.startNodeId}' -> '${path.terminalNodeId}' crosses trust boundaries without an enforced pre-execution gate.`,
        basis: `path_nodes=[${path.nodeIds.join(' -> ')}], hop_count=${path.hopCount}, untrusted_ingress=${path.hasUntrustedIngress}, state_mutation=${path.hasStateMutation}, external_egress=${path.hasExternalEgress}, irreversible=${path.hasIrreversibleAction}, effectively_gated=false`,
        authorityMapNodeId: path.terminalNodeId,
        authorityMapEdgeId: path.edgeIds[path.edgeIds.length - 1],
        pathReference: pathRef
      });
    }
  }

  return findings;
}
