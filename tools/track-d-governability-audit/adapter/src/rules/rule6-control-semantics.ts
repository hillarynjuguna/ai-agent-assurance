import type { 
  AuthorityMapEdgeInput, 
  AuthorityMapNodeInput, 
  CandidateFinding 
} from './types';
import type { ControlSemantics } from '../paths/types';

/**
 * Rule 6: Nominal / Fail-Open Control Deficiency (ASI01, ASI08)
 * 
 * Logic:
 * Evaluates whether nominal security controls along edges or on nodes are effective or merely superficial.
 * 
 * IF a control is defined where:
 *   - controlPresent === true
 *   AND any of the following weaknesses exist:
 *     - failMode === 'fail_open'
 *     - defaultAction === 'allow' (permits execution on timeout/error)
 *     - executionPoint === 'post_execution' OR executionPoint === 'asynchronous_logging' (occurs after effect)
 *     - controlEnforced === false
 *     - timeoutMs === 0 AND defaultAction !== 'deny'
 * THEN generate candidate finding:
 *   - Framework refs: ['ASI01', 'ASI08']
 *   - Severity: 'high'
 *   - Confidence: 'moderate'
 *   - Evidence level: 'E1_documented'
 * 
 * Negative Control:
 * IF a control has failMode === 'fail_closed', defaultAction === 'deny',
 * executionPoint === 'pre_execution', and controlEnforced === true, NO finding is generated.
 */
export function evaluateRule6ControlSemantics(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];

  function checkControl(
    control: ControlSemantics, 
    contextType: 'edge' | 'node', 
    contextId: string
  ) {
    if (!control.controlPresent) {
      return;
    }

    const isFailOpen = control.failMode === 'fail_open';
    const isAllowDefault = control.defaultAction === 'allow';
    const isPostExecution = control.executionPoint === 'post_execution' || control.executionPoint === 'asynchronous_logging';
    const isUnenforced = !control.controlEnforced;
    const isZeroTimeoutAllow = control.timeoutMs === 0 && control.defaultAction !== 'deny';

    const isDeficient = isFailOpen || isAllowDefault || isPostExecution || isUnenforced || isZeroTimeoutAllow;

    if (isDeficient) {
      const controlLabel = control.name || control.controlId;
      const reasons: string[] = [];
      if (isFailOpen) reasons.push("fail_mode='fail_open'");
      if (isAllowDefault) reasons.push("default_action='allow'");
      if (isPostExecution) reasons.push(`execution_point='${control.executionPoint}'`);
      if (isUnenforced) reasons.push("control_enforced=false");
      if (isZeroTimeoutAllow) reasons.push("timeout_ms=0 with non-deny fallback");

      findings.push({
        frameworkRefs: ['ASI01', 'ASI08'],
        severity: 'high',
        confidence: 'moderate',
        evidenceLevel: 'E1_documented',
        description: `Nominal security control '${controlLabel}' on ${contextType} '${contextId}' fails open or lacks pre-execution enforcement.`,
        basis: `control_id=${control.controlId}, deficiencies=[${reasons.join(', ')}], effective_enforcement=false`,
        authorityMapEdgeId: contextType === 'edge' ? contextId : undefined,
        authorityMapNodeId: contextType === 'node' ? contextId : undefined
      });
    }
  }

  // Evaluate controls declared on edges
  for (const edge of edges) {
    if (edge.controlSemantics) {
      checkControl(edge.controlSemantics, 'edge', edge.id);
    }
  }

  // Evaluate controls declared on nodes
  for (const node of nodes) {
    if (node.controlSemantics) {
      checkControl(node.controlSemantics, 'node', node.id);
    }
  }

  return findings;
}
