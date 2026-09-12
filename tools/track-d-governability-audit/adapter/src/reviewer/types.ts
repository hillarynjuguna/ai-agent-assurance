/**
 * Phase 6: Human Assurance Decision Layer — Domain Types
 * 
 * Core Invariant: "Assessment state must be append-only in meaning, even if representations are mutable."
 * Reviewer decisions produce an explicit auditable trail without silently destroying machine provenance.
 */

import type { FindingSeverity, FindingConfidence, EvidenceLevel, EvidenceType, EpistemicEvidenceRecord } from '../assurance-types';
import type { SystemSnapshot } from '../snapshots/types';
import type { SeededAuthorityMap } from '../authority-map-seed';
import type { TrackDSelfAssessmentContext } from '../assurance-types';
import type { LlmContradiction } from '../llm/types';

export type ReviewerRole = 'operator' | 'human_validator' | 'specialist_partner' | 'internal_validator';

export type FindingDisposition = 
  | 'confirmed' 
  | 'downgraded' 
  | 'upgraded' 
  | 'rejected' 
  | 'accepted_with_exception' 
  | 'unresolved';

export type ReviewDecisionType = 
  | 'accept' 
  | 'reject' 
  | 'modify_severity' 
  | 'request_more_evidence' 
  | 'upgrade_evidence' 
  | 'downgrade_confidence' 
  | 'override_deterministic';

export type ContradictionDisposition = 
  | 'unresolved'
  | 'resolved_in_favor_of_source_a'
  | 'resolved_in_favor_of_source_b'
  | 'resolved_by_new_evidence'
  | 'accepted_as_unknown';

/**
 * Server-resolved reviewer session boundary.
 * Never trusted from client request body.
 */
export interface ReviewerSession {
  reviewerId: string;
  reviewerName: string;
  role: ReviewerRole;
  sessionStartedAt: string;
  isDevMock: boolean;
}

/**
 * An append-only reviewer decision record for a finding.
 */
export interface ReviewDecision {
  id: string;
  findingId: string;
  reviewerId: string;
  reviewerRole: ReviewerRole;
  decisionType: ReviewDecisionType;
  disposition: FindingDisposition;
  baselineSeverity: FindingSeverity;
  effectiveSeverity: FindingSeverity;
  reasoning: string;
  evidenceId?: string;
  newEvidence?: EpistemicEvidenceRecord;
  createdAt: string;
}

/**
 * An append-only reviewer decision record for resolving an LLM contradiction.
 */
export interface ContradictionDecision {
  id: string;
  contradictionSubject: string;
  reviewerId: string;
  reviewerRole: ReviewerRole;
  disposition: ContradictionDisposition;
  reasoning: string;
  supportingEvidenceId?: string;
  createdAt: string;
}

import type { PathReference, FindingStage } from '../paths/types';

/**
 * Finding representation within the Canonical Assessment Object.
 * Preserves the 5 trust layers explicitly.
 */
export interface CanonicalFinding {
  id: string;
  assessmentId: string;
  frameworkRefs: string[];
  authorityMapNodeId?: string;
  authorityMapEdgeId?: string;
  pathReference?: PathReference;
  findingStage?: FindingStage;
  title: string;
  description: string;
  basis: string;
  baselineSeverity: FindingSeverity;
  effectiveSeverity: FindingSeverity;
  severity: FindingSeverity; // For backward compatibility
  confidence: FindingConfidence;
  evidenceLevel: EvidenceLevel;
  disposition: FindingDisposition;
  overrideReason?: string;
  decisionId?: string;
  status: 'open' | 'acknowledged' | 'remediated' | 'accepted_risk';
  draftedBy: string;
  createdAt: string;
  updatedAt: string;

  // The 5 Trust Layers
  trustLayers: {
    selfAssessmentContext: string;
    clientClaim: string;
    claimedEvidenceLevel: string;
    recognizedEvidenceLevel: string;
    reviewerAttestation?: string;
  };
}

/**
 * Canonical Assessment State — the authoritative machine-readable assessment object.
 * This is the canonical object that is hashed for attestation.
 */
export interface CanonicalAssessment {
  schemaVersion: '1.0.0';
  assessmentId: string;
  systemId: string;
  systemSnapshotId: string;
  systemSnapshot: SystemSnapshot;
  authorityMap: SeededAuthorityMap;
  selfAssessmentContext: TrackDSelfAssessmentContext;
  findings: CanonicalFinding[];
  evidenceLedger: EpistemicEvidenceRecord[];
  reviewDecisions: ReviewDecision[];
  contradictionDecisions: ContradictionDecision[];
  unresolvedContradictions: LlmContradiction[];
  summary: {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    overriddenCount: number;
    evidenceUpgradesCount: number;
  };
  compiledAt: string;
}

/**
 * Cryptographic content-hash attestation of the Canonical Assessment.
 */
export interface AttestationRecord {
  attestationId: string;
  assessmentId: string;
  systemSnapshotId: string;
  canonicalAssessmentHash: string; // SHA-256 of CanonicalAssessment JSON
  reportMarkdownHash?: string;     // SHA-256 of rendered Markdown projection
  attestedBy: {
    reviewerId: string;
    reviewerName: string;
    role: ReviewerRole;
  };
  statement: string;
  attestedAt: string;
}
