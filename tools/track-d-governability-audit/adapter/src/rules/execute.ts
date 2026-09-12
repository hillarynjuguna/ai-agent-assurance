import { CandidateFinding, AuthorityMapEdgeInput, AuthorityMapNodeInput } from './types';
import { evaluateRule1IrreversibleNoApproval } from './rule1-irreversible-no-approval';
import { evaluateRule2ExternalDelegation } from './rule2-external-delegation';
import { evaluateRule3SharedIdentity } from './rule3-shared-identity';
import { evaluateD10ContainmentRule } from './d10-containment-rule';
import { evaluateRule5ComposedPath } from './rule5-composed-path';
import { evaluateRule6ControlSemantics } from './rule6-control-semantics';
import { evaluateRule7TemporalConstraints } from './rule7-temporal-constraints';

export interface RuleExecutionOptions {
  includePathLevel?: boolean;
  includeControlSemantics?: boolean;
  includeTemporal?: boolean;
}

export interface RuleExecutionResult {
  findings: CandidateFinding[];
  executedAt: string;
  rulesEvaluatedCount: number;
  findingsCount: number;
  layersEvaluated?: {
    edgeLevel: number;
    pathLevel: number;
    controlSemantics: number;
    temporal: number;
  };
}

/**
 * Layer 1: Edge-Level Analysis (Rules 1 - 4)
 * Evaluates pairwise relationships between adjacent nodes in isolation.
 */
export function evaluateEdgeLevelRules(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  const r1 = evaluateRule1IrreversibleNoApproval(edges, nodes);
  const r2 = evaluateRule2ExternalDelegation(edges, nodes);
  const r3 = evaluateRule3SharedIdentity(edges, nodes);
  const r4 = evaluateD10ContainmentRule(edges, nodes);
  return [...r1, ...r2, ...r3, ...r4];
}

/**
 * Layer 2: Path-Level Analysis (Rule 5)
 * Evaluates reachability across 2+ hops from untrusted ingress to egress/mutation.
 */
export function evaluatePathLevelRules(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  return evaluateRule5ComposedPath(edges, nodes);
}

/**
 * Layer 3: Control-Semantics Analysis (Rule 6)
 * Evaluates whether nominal security controls fail open or lack pre-execution enforcement.
 */
export function evaluateControlSemanticsRules(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  return evaluateRule6ControlSemantics(edges, nodes);
}

/**
 * Layer 4: Temporal Analysis (Rule 7)
 * Evaluates whether scalar limits lack time windows or cumulative volume caps.
 */
export function evaluateTemporalRules(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): CandidateFinding[] {
  return evaluateRule7TemporalConstraints(edges, nodes);
}

/**
 * Executes full 4-layer authority graph evaluation across edge, path, control, and temporal dimensions.
 */
export function executeFullAuthorityEvaluation(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): RuleExecutionResult {
  const executedAt = new Date().toISOString();

  const edgeFindings = evaluateEdgeLevelRules(edges, nodes);
  const pathFindings = evaluatePathLevelRules(edges, nodes);
  const controlFindings = evaluateControlSemanticsRules(edges, nodes);
  const temporalFindings = evaluateTemporalRules(edges, nodes);

  const allFindings = [...edgeFindings, ...pathFindings, ...controlFindings, ...temporalFindings];

  return {
    findings: allFindings,
    executedAt,
    rulesEvaluatedCount: 7,
    findingsCount: allFindings.length,
    layersEvaluated: {
      edgeLevel: edgeFindings.length,
      pathLevel: pathFindings.length,
      controlSemantics: controlFindings.length,
      temporal: temporalFindings.length
    }
  };
}

/**
 * Baseline deterministic rules evaluator.
 * Evaluates edge-level rules (Rules 1-4) by default, with opt-in support for path, control, and temporal layers.
 */
export function executeDeterministicRules(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[],
  options?: RuleExecutionOptions
): RuleExecutionResult {
  const executedAt = new Date().toISOString();

  const edgeFindings = evaluateEdgeLevelRules(edges, nodes);
  const pathFindings = options?.includePathLevel ? evaluatePathLevelRules(edges, nodes) : [];
  const controlFindings = options?.includeControlSemantics ? evaluateControlSemanticsRules(edges, nodes) : [];
  const temporalFindings = options?.includeTemporal ? evaluateTemporalRules(edges, nodes) : [];

  const allFindings = [...edgeFindings, ...pathFindings, ...controlFindings, ...temporalFindings];
  const rulesCount = 4 + 
    (options?.includePathLevel ? 1 : 0) + 
    (options?.includeControlSemantics ? 1 : 0) + 
    (options?.includeTemporal ? 1 : 0);

  return {
    findings: allFindings,
    executedAt,
    rulesEvaluatedCount: rulesCount,
    findingsCount: allFindings.length,
    layersEvaluated: {
      edgeLevel: edgeFindings.length,
      pathLevel: pathFindings.length,
      controlSemantics: controlFindings.length,
      temporal: temporalFindings.length
    }
  };
}
