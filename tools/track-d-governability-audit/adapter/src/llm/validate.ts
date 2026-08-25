/**
 * Deterministic validation layer for LLM output.
 * 
 * This module is the enforcement boundary for all LLM-generated candidates.
 * It runs AFTER the LLM call and BEFORE any output is accepted into the
 * assessment pipeline. Validation failures are represented explicitly, not silently
 * swallowed or overridden by the LLM.
 * 
 * Design principle: build enforcement into structure, not just prompts.
 */

import type { LlmCandidateFinding, LlmFindingDraftOutput, LlmArchitectureExtractionOutput } from './types';
import type { SeededAuthorityMap } from '../authority-map-seed';

export interface ValidationFailure {
  field: string;
  rule: string;
  message: string;
  index?: number;
}

export interface FindingValidationResult {
  accepted: LlmCandidateFinding[];
  rejected: Array<{ finding: LlmCandidateFinding; failures: ValidationFailure[] }>;
  validationSummary: {
    totalOffered: number;
    totalAccepted: number;
    totalRejected: number;
    rejectionReasons: string[];
  };
}

export interface ArchitectureValidationResult {
  accepted: LlmArchitectureExtractionOutput;
  nodeRejections: Array<{ nodeId: string; reason: string }>;
  edgeRejections: Array<{ edgeId: string; reason: string }>;
  validationSummary: {
    totalNodesOffered: number;
    totalNodesAccepted: number;
    totalEdgesOffered: number;
    totalEdgesAccepted: number;
  };
}

const DISALLOWED_EVIDENCE_LEVELS = ['E2_observed', 'E3_validated', 'E4_adversarially_tested'];

/**
 * Validates a batch of LLM-drafted findings against all deterministic invariants.
 * 
 * Rules enforced:
 * 1. evidence_level MUST be E0_claimed or E1_documented (Invariant 4 + 5)
 * 2. basis MUST be non-empty (Traceability)
 * 3. authority_map_ref MUST reference at least one of node_id or edge_id (Invariant 8)
 * 4. authority_map_ref.node_id / edge_id MUST exist in the current snapshot Authority Map,
 *    UNLESS is_llm_proposed=true (then it's marked as unverified candidate)
 * 5. system_snapshot_id binding is verified by the caller (passed in)
 */
export function validateLlmFindingDraft(
  output: LlmFindingDraftOutput,
  authorityMap: SeededAuthorityMap,
  systemSnapshotId: string
): FindingValidationResult {
  const accepted: LlmCandidateFinding[] = [];
  const rejected: Array<{ finding: LlmCandidateFinding; failures: ValidationFailure[] }> = [];

  const knownNodeIds = new Set(authorityMap.nodes.map(n => n.id));
  const knownEdgeIds = new Set(authorityMap.edges.map(e => e.id));

  for (let i = 0; i < output.findings.length; i++) {
    const finding = output.findings[i];
    const failures: ValidationFailure[] = [];

    // Rule 1: Evidence level cap (Invariants 4 & 5)
    if (DISALLOWED_EVIDENCE_LEVELS.includes(finding.evidence_level as string)) {
      failures.push({
        field: 'evidence_level',
        rule: 'evidence_level_cap',
        message: `LLM attempted to set evidence_level="${finding.evidence_level}". Max allowed: E1_documented. (Invariant 4+5)`,
        index: i,
      });
    }

    // Rule 2: Basis must be non-empty (Traceability Invariant 8)
    if (!finding.basis || finding.basis.trim().length === 0) {
      failures.push({
        field: 'basis',
        rule: 'traceability_basis_required',
        message: 'Finding basis is empty. Every LLM finding requires an explicit evidentiary basis. (Invariant 8)',
        index: i,
      });
    }

    // Rule 3: Authority map ref must exist (Invariant 8)
    const hasNodeRef = !!finding.authority_map_ref?.node_id;
    const hasEdgeRef = !!finding.authority_map_ref?.edge_id;
    if (!hasNodeRef && !hasEdgeRef) {
      failures.push({
        field: 'authority_map_ref',
        rule: 'authority_map_traceability',
        message: 'Finding must reference an Authority Map node or edge. (Invariant 8)',
        index: i,
      });
    }

    // Rule 4: Verify authority map ref exists, unless LLM-proposed
    const isLlmProposed = finding.authority_map_ref?.is_llm_proposed === true;
    if (!isLlmProposed) {
      if (hasNodeRef && !knownNodeIds.has(finding.authority_map_ref.node_id!)) {
        failures.push({
          field: 'authority_map_ref.node_id',
          rule: 'authority_map_existence',
          message: `Node "${finding.authority_map_ref.node_id}" does not exist in snapshot ${systemSnapshotId}. (Invariant 6 + 8)`,
          index: i,
        });
      }
      if (hasEdgeRef && !knownEdgeIds.has(finding.authority_map_ref.edge_id!)) {
        failures.push({
          field: 'authority_map_ref.edge_id',
          rule: 'authority_map_existence',
          message: `Edge "${finding.authority_map_ref.edge_id}" does not exist in snapshot ${systemSnapshotId}. (Invariant 6 + 8)`,
          index: i,
        });
      }
    }

    if (failures.length === 0) {
      accepted.push(finding);
    } else {
      rejected.push({ finding, failures });
    }
  }

  return {
    accepted,
    rejected,
    validationSummary: {
      totalOffered: output.findings.length,
      totalAccepted: accepted.length,
      totalRejected: rejected.length,
      rejectionReasons: rejected.flatMap(r => r.failures.map(f => f.message)),
    },
  };
}

/**
 * Validates LLM architecture extraction output.
 * 
 * Rules enforced:
 * 1. Every node MUST have a non-empty source_excerpt (Invariant 6 — no invention)
 * 2. Every edge MUST have source_temp_id and target_temp_id resolvable to the accepted nodes list
 * 3. Every edge MUST have a non-empty source_excerpt
 */
export function validateLlmArchitectureExtraction(
  output: LlmArchitectureExtractionOutput,
  _authorityMap: SeededAuthorityMap
): ArchitectureValidationResult {
  const validNodes = [];
  const validEdges = [];
  const nodeRejections: Array<{ nodeId: string; reason: string }> = [];
  const edgeRejections: Array<{ edgeId: string; reason: string }> = [];

  const validNodeTempIds = new Set<string>();

  for (const node of output.nodes) {
    if (!node.source_excerpt || node.source_excerpt.trim().length === 0) {
      nodeRejections.push({
        nodeId: node.temp_id,
        reason: `Node "${node.name}" has no source_excerpt. Cannot be accepted — this would invent a node without evidence. (Invariant 6)`,
      });
    } else {
      validNodes.push(node);
      validNodeTempIds.add(node.temp_id);
    }
  }

  for (const edge of output.edges) {
    const edgeLabel = `${edge.source_temp_id}->${edge.target_temp_id}`;
    const issues: string[] = [];

    if (!validNodeTempIds.has(edge.source_temp_id)) {
      issues.push(`source_temp_id "${edge.source_temp_id}" is not a valid accepted node`);
    }
    if (!validNodeTempIds.has(edge.target_temp_id)) {
      issues.push(`target_temp_id "${edge.target_temp_id}" is not a valid accepted node`);
    }
    if (!edge.source_excerpt || edge.source_excerpt.trim().length === 0) {
      issues.push('Missing source_excerpt — cannot establish evidence for this edge (Invariant 6)');
    }

    if (issues.length > 0) {
      edgeRejections.push({ edgeId: edgeLabel, reason: issues.join('; ') });
    } else {
      validEdges.push(edge);
    }
  }

  return {
    accepted: {
      ...output,
      nodes: validNodes,
      edges: validEdges,
    },
    nodeRejections,
    edgeRejections,
    validationSummary: {
      totalNodesOffered: output.nodes.length,
      totalNodesAccepted: validNodes.length,
      totalEdgesOffered: output.edges.length,
      totalEdgesAccepted: validEdges.length,
    },
  };
}

/**
 * Checks whether an LLM candidate finding conflicts with an existing deterministic finding.
 * The LLM candidate is NEVER allowed to lower severity of a deterministic finding.
 * The disagreement is recorded but does not suppress the deterministic finding.
 */
export interface DeterministicConflict {
  deterministicFinding: { frameworkRefs: string[]; severity: string; basis: string };
  llmProposal: LlmCandidateFinding;
  conflict: 'llm_proposes_lower_severity' | 'llm_proposes_informational_override';
  resolution: 'deterministic_finding_preserved';
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  informational: 0,
};

export function detectDeterministicConflicts(
  deterministicFindings: Array<{ frameworkRefs: string[]; severity: string; basis: string }>,
  llmFindings: LlmCandidateFinding[]
): DeterministicConflict[] {
  const conflicts: DeterministicConflict[] = [];

  for (const detFinding of deterministicFindings) {
    for (const llmFinding of llmFindings) {
      // Check for same framework ref — potential overlap
      const sharedRef = detFinding.frameworkRefs.some(ref =>
        llmFinding.framework_reference_code === ref
      );
      if (!sharedRef) continue;

      const detRank = SEVERITY_RANK[detFinding.severity] ?? 0;
      const llmRank = SEVERITY_RANK[llmFinding.severity] ?? 0;

      if (llmRank < detRank) {
        conflicts.push({
          deterministicFinding: detFinding,
          llmProposal: llmFinding,
          conflict: llmFinding.severity === 'informational'
            ? 'llm_proposes_informational_override'
            : 'llm_proposes_lower_severity',
          resolution: 'deterministic_finding_preserved',
        });
      }
    }
  }

  return conflicts;
}
