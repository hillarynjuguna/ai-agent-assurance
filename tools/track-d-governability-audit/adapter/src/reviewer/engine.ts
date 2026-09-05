/**
 * Decision State Machine for Reviewer Actions
 * 
 * Invariants Enforced:
 * 1. "Assessment state must be append-only in meaning, even if representations are mutable."
 * 2. Never overwrite baselineSeverity — overrides modify effectiveSeverity and disposition.
 * 3. Evidence Integrity Trigger — E2+ cannot be qualified with client-only evidence.
 * 4. E3 Validated requires a reproducible ValidationTestRecord.
 * 5. E4 Adversarially Tested requires an authorized AdversarialTestRecord.
 * 6. Every decision requires recorded reasoning (auditability invariant).
 */

import type { AssessmentFinding } from '../findings';
import type { 
  ReviewDecision, 
  ContradictionDecision, 
  ReviewDecisionType, 
  FindingDisposition,
  ReviewerSession
} from './types';
import type { LlmContradiction } from '../llm/types';
import type { EpistemicEvidenceRecord, FindingSeverity } from '../assurance-types';

/**
 * Applies a reviewer decision to an existing assessment finding.
 * Returns an updated finding copy while preserving all baseline provenance.
 */
export function applyReviewDecision(
  finding: AssessmentFinding,
  decision: ReviewDecision
): AssessmentFinding {
  if (!decision.reasoning || decision.reasoning.trim().length === 0) {
    throw new Error(`ReviewDecision ${decision.id} requires non-empty reasoning.`);
  }

  // Clone finding to maintain immutability of input
  const updated: AssessmentFinding = {
    ...finding,
    updatedAt: decision.createdAt || new Date().toISOString(),
    decisionId: decision.id
  };

  // Evidence Upgrade Invariant Check (Mirrors Phase 2 SQL triggers)
  if (decision.decisionType === 'upgrade_evidence') {
    if (!decision.newEvidence) {
      throw new Error(`ReviewDecision ${decision.id} with type upgrade_evidence must supply newEvidence.`);
    }

    const newEvidence = decision.newEvidence;
    const targetLevel = newEvidence.supportsLevel;

    if (targetLevel === 'E2_observed' || targetLevel === 'E3_validated' || targetLevel === 'E4_adversarially_tested') {
      if (newEvidence.source === 'client') {
        throw new Error(
          `Finding ${finding.id} cannot be set to ${targetLevel} with client-only evidence. Invariant: E2+ requires reviewer or test_harness source.`
        );
      }
    }

    if (targetLevel === 'E3_validated') {
      if (!newEvidence.validationTest || 
          !newEvidence.validationTest.testId || 
          !newEvidence.validationTest.steps || 
          newEvidence.validationTest.steps.length === 0) {
        throw new Error(
          `Finding ${finding.id} upgrade to E3_validated requires a reproducible ValidationTestRecord with testId and steps.`
        );
      }
    }

    if (targetLevel === 'E4_adversarially_tested') {
      if (!newEvidence.adversarialTest || 
          !newEvidence.adversarialTest.authorizationScope || 
          !newEvidence.adversarialTest.attackClass) {
        throw new Error(
          `Finding ${finding.id} upgrade to E4_adversarially_tested requires an authorized AdversarialTestRecord with authorizationScope and attackClass.`
        );
      }
    }

    updated.evidenceLevel = targetLevel;
  }

  // Disposition & Severity Transitions
  switch (decision.decisionType) {
    case 'override_deterministic':
    case 'modify_severity': {
      // INVARIANT: Baseline remains immutable!
      updated.effectiveSeverity = decision.effectiveSeverity;
      updated.severity = decision.effectiveSeverity; // Backwards-compatible mirror
      updated.disposition = decision.disposition;
      updated.overrideReason = decision.reasoning;
      break;
    }

    case 'accept': {
      updated.disposition = 'confirmed';
      updated.effectiveSeverity = finding.baselineSeverity;
      updated.severity = finding.baselineSeverity;
      break;
    }

    case 'reject': {
      updated.disposition = 'rejected';
      updated.status = 'accepted_risk';
      updated.effectiveSeverity = 'informational';
      updated.severity = 'informational';
      updated.overrideReason = decision.reasoning;
      break;
    }

    case 'downgrade_confidence': {
      updated.confidence = 'low';
      updated.disposition = decision.disposition;
      updated.overrideReason = decision.reasoning;
      break;
    }

    case 'request_more_evidence': {
      updated.disposition = 'unresolved';
      updated.overrideReason = decision.reasoning;
      break;
    }

    case 'upgrade_evidence': {
      updated.disposition = decision.disposition || 'confirmed';
      break;
    }
  }

  return updated;
}

/**
 * Applies a reviewer decision to resolve or disposition an LLM contradiction.
 */
export function applyContradictionDecision(
  contradiction: LlmContradiction,
  decision: ContradictionDecision
): LlmContradiction & { 
  disposition: ContradictionDecision['disposition'];
  reasoning: string;
  decisionId: string;
  resolvedAt: string;
} {
  if (!decision.reasoning || decision.reasoning.trim().length === 0) {
    throw new Error(`ContradictionDecision ${decision.id} requires non-empty reasoning.`);
  }

  return {
    ...contradiction,
    status: decision.disposition as any,
    disposition: decision.disposition,
    reasoning: decision.reasoning,
    decisionId: decision.id,
    resolvedAt: decision.createdAt || new Date().toISOString()
  };
}

/**
 * Factory helper for creating a validated ReviewDecision from a session.
 */
export function createReviewDecision(
  session: ReviewerSession,
  finding: AssessmentFinding,
  decisionType: ReviewDecisionType,
  disposition: FindingDisposition,
  effectiveSeverity: FindingSeverity,
  reasoning: string,
  newEvidence?: EpistemicEvidenceRecord
): ReviewDecision {
  const id = `decision-${finding.id}-${Date.now()}`;
  return {
    id,
    findingId: finding.id,
    reviewerId: session.reviewerId,
    reviewerRole: session.role,
    decisionType,
    disposition,
    baselineSeverity: finding.baselineSeverity,
    effectiveSeverity,
    reasoning,
    evidenceId: newEvidence?.id,
    newEvidence,
    createdAt: new Date().toISOString()
  };
}
