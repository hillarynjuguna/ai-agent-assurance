import { CandidateFinding, AuthorityMapEdgeInput, AuthorityMapNodeInput } from './types';
import { evaluateRule1IrreversibleNoApproval } from './rule1-irreversible-no-approval';
import { evaluateRule2ExternalDelegation } from './rule2-external-delegation';
import { evaluateRule3SharedIdentity } from './rule3-shared-identity';
import { evaluateD10ContainmentRule } from './d10-containment-rule';

export interface RuleExecutionResult {
  findings: CandidateFinding[];
  executedAt: string;
  rulesEvaluatedCount: number;
  findingsCount: number;
}

/**
 * Runs all deterministic governance rules against an Authority Map.
 * 
 * Rules:
 * 1. Rule 1: Irreversible calls without human approval (ASI01) -> Critical
 * 2. Rule 2: Delegation to external agent across external/unknown boundary (ASI07, ASI09) -> High
 * 3. Rule 3: Shared identity with differing permission scopes (ASI03) -> High
 * 4. Rule 4: Irreversible action across external trust boundary without containment (ASI08, D10) -> High
 */
export function executeDeterministicRules(
  edges: AuthorityMapEdgeInput[],
  nodes: AuthorityMapNodeInput[]
): RuleExecutionResult {
  const executedAt = new Date().toISOString();

  const r1 = evaluateRule1IrreversibleNoApproval(edges, nodes);
  const r2 = evaluateRule2ExternalDelegation(edges, nodes);
  const r3 = evaluateRule3SharedIdentity(edges, nodes);
  const r4 = evaluateD10ContainmentRule(edges, nodes);

  const allFindings = [...r1, ...r2, ...r3, ...r4];

  return {
    findings: allFindings,
    executedAt,
    rulesEvaluatedCount: 4,
    findingsCount: allFindings.length
  };
}
