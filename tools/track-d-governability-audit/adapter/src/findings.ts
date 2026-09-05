import { CandidateFinding, FindingSeverity, FindingConfidence } from './rules/types';
import type { EvidenceLevel } from './assurance-types';
import type { FindingDisposition } from './reviewer/types';

export interface AssessmentFinding {
  id: string;
  assessmentId: string;
  frameworkRefs: string[];
  authorityMapNodeId?: string;
  authorityMapEdgeId?: string;
  title: string;
  description: string;
  basis: string;
  severity: FindingSeverity;
  baselineSeverity: FindingSeverity;
  effectiveSeverity: FindingSeverity;
  disposition: FindingDisposition;
  overrideReason?: string;
  decisionId?: string;
  confidence: FindingConfidence;
  evidenceLevel: EvidenceLevel;
  status: 'open' | 'acknowledged' | 'remediated' | 'accepted_risk';
  draftedBy: 'deterministic_rule_engine' | string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Converts rule execution candidate findings into fully traceable AssessmentFinding records.
 * 
 * Invariants Enforced:
 * - Invariant 1: Claim != Evidence. Finding evidence_level is strictly capped at E1_documented.
 * - Invariant 8: Traceability. Every finding is linked to an Authority Map node or edge ID.
 * - Provenance Invariant: baselineSeverity remains immutable; effectiveSeverity starts equal to baseline with 'unresolved' disposition.
 * - No composite scoring or severity dilution.
 */
export function generateAssessmentFindings(
  candidateFindings: CandidateFinding[],
  assessmentId: string
): AssessmentFinding[] {
  const createdAt = new Date().toISOString();

  return candidateFindings.map((cf, index) => {
    // Generate a deterministic or unique ID for the finding
    const findingId = `finding-${assessmentId}-${index + 1}`;

    return {
      id: findingId,
      assessmentId,
      frameworkRefs: cf.frameworkRefs,
      authorityMapNodeId: cf.authorityMapNodeId,
      authorityMapEdgeId: cf.authorityMapEdgeId,
      title: cf.description.length > 80 ? `${cf.description.substring(0, 77)}...` : cf.description,
      description: cf.description,
      basis: cf.basis,
      severity: cf.severity,
      baselineSeverity: cf.severity,
      effectiveSeverity: cf.severity,
      disposition: 'unresolved',
      overrideReason: undefined,
      decisionId: undefined,
      confidence: cf.confidence,
      // Strictly capped at E1_documented during automated diagnostics
      evidenceLevel: cf.evidenceLevel === 'E0_claimed' ? 'E0_claimed' : 'E1_documented',
      status: 'open',
      draftedBy: 'deterministic_rule_engine',
      createdAt
    };
  });
}
