import { 
  SystemSnapshotDiff, 
  ReassessmentTriggerCondition, 
  ReassessmentTriggerEvaluation 
} from './types';

/**
 * Evaluates a SystemSnapshotDiff against structured reassessment trigger rules.
 * 
 * Rules:
 * - Edge actionReversibility changed -> 'irreversibility_changed'
 * - Edge requiresHumanApproval changed -> 'human_approval_changed'
 * - Edge trustBoundary changed -> 'trust_boundary_changed'
 * - Edge permissionScope changed -> 'permission_changed'
 * - Node of type 'api' | 'tool' added -> 'tool_added'
 * - Node of type 'external_agent' added OR edge trustBoundary changed to 'external' -> 'external_boundary_changed'
 * - Node of type 'model' added, removed, or modified -> 'model_changed'
 * - Any structural node/edge addition or removal -> 'authority_changed'
 */
export function evaluateReassessmentTriggers(diff: SystemSnapshotDiff): ReassessmentTriggerEvaluation {
  const evaluatedAt = new Date().toISOString();
  const triggeredConditions = new Set<ReassessmentTriggerCondition>();
  const reasons: string[] = [];

  // 1. Check added nodes
  for (const node of diff.addedNodes) {
    triggeredConditions.add('authority_changed');
    if (node.nodeType === 'api' || node.nodeType === 'tool') {
      triggeredConditions.add('tool_added');
      reasons.push(`New ${node.nodeType} node added: ${node.name} (${node.id})`);
    } else if (node.nodeType === 'external_agent') {
      triggeredConditions.add('external_boundary_changed');
      reasons.push(`New external agent node added: ${node.name} (${node.id})`);
    } else if (node.nodeType === 'model') {
      triggeredConditions.add('model_changed');
      reasons.push(`New foundation model node added: ${node.name} (${node.id})`);
    } else {
      reasons.push(`New node added: ${node.name} (${node.id})`);
    }
  }

  // 2. Check removed nodes
  for (const node of diff.removedNodes) {
    triggeredConditions.add('authority_changed');
    if (node.nodeType === 'model') {
      triggeredConditions.add('model_changed');
      reasons.push(`Foundation model node removed: ${node.name} (${node.id})`);
    } else {
      reasons.push(`Node removed: ${node.name} (${node.id})`);
    }
  }

  // 3. Check added edges
  for (const edge of diff.addedEdges) {
    triggeredConditions.add('authority_changed');
    if (edge.trustBoundary === 'external' || edge.trustBoundary === 'unknown') {
      triggeredConditions.add('external_boundary_changed');
      reasons.push(`New edge crossing ${edge.trustBoundary} boundary added (${edge.id})`);
    }
    if (edge.actionReversibility === 'irreversible') {
      triggeredConditions.add('irreversibility_changed');
      reasons.push(`New irreversible action edge added (${edge.id})`);
    }
  }

  // 4. Check removed edges
  for (const edge of diff.removedEdges) {
    triggeredConditions.add('authority_changed');
    reasons.push(`Edge removed: ${edge.id}`);
  }

  // 5. Check modified edges
  for (const mod of diff.modifiedEdges) {
    for (const change of mod.changes) {
      if (change.field === 'actionReversibility') {
        triggeredConditions.add('irreversibility_changed');
        reasons.push(`Edge ${mod.edgeId} action reversibility changed from '${change.from}' to '${change.to}'`);
      } else if (change.field === 'requiresHumanApproval') {
        triggeredConditions.add('human_approval_changed');
        reasons.push(`Edge ${mod.edgeId} human approval requirement changed from '${change.from}' to '${change.to}'`);
      } else if (change.field === 'trustBoundary') {
        triggeredConditions.add('trust_boundary_changed');
        reasons.push(`Edge ${mod.edgeId} trust boundary changed from '${change.from}' to '${change.to}'`);
      } else if (change.field === 'permissionScope') {
        triggeredConditions.add('permission_changed');
        reasons.push(`Edge ${mod.edgeId} permission scope changed from '${change.from}' to '${change.to}'`);
      }
    }
  }

  const conditionsArray = Array.from(triggeredConditions);
  const reassessmentRequired = conditionsArray.length > 0;

  return {
    reassessmentRequired,
    triggeredConditions: conditionsArray,
    reasons,
    evaluatedAt
  };
}
