/**
 * Canonical Assessment Compiler & Attestation Engine
 * 
 * Invariants:
 * 1. The Canonical Assessment JSON is the authoritative, versioned state of the assessment.
 * 2. Attestation hashes a canonicalized, property-order-invariant serialization of this state.
 * 3. Every finding explicitly preserves the 5 Trust Layers.
 */

import { createHash } from 'crypto';
import type { 
  CanonicalAssessment, 
  CanonicalFinding, 
  AttestationRecord, 
  ReviewDecision, 
  ContradictionDecision,
  ReviewerSession 
} from '../reviewer/types';
import type { AssessmentFinding } from '../findings';
import type { SystemSnapshot } from '../snapshots/types';
import type { SeededAuthorityMap } from '../authority-map-seed';
import type { TrackDSelfAssessmentContext, EpistemicEvidenceRecord } from '../assurance-types';
import type { LlmContradiction } from '../llm/types';

export interface CompileCanonicalParams {
  assessmentId: string;
  systemSnapshot: SystemSnapshot;
  authorityMap: SeededAuthorityMap;
  selfAssessmentContext: TrackDSelfAssessmentContext;
  findings: AssessmentFinding[];
  evidenceLedger: EpistemicEvidenceRecord[];
  reviewDecisions: ReviewDecision[];
  contradictionDecisions: ContradictionDecision[];
  unresolvedContradictions: LlmContradiction[];
  compiledAt?: string;
}

/**
 * Deterministically serializes any JavaScript object with recursively sorted keys.
 * Guaranteed to be invariant to property insertion order.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map(item => canonicalizeJson(item)).join(',') + ']';
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalizeJson(obj[key]);
  });

  return '{' + entries.join(',') + '}';
}

/**
 * Compiles an assessment's snapshot, graph, findings, and decisions into a CanonicalAssessment object.
 */
export function compileCanonicalAssessment(params: CompileCanonicalParams): CanonicalAssessment {
  const {
    assessmentId,
    systemSnapshot,
    authorityMap,
    selfAssessmentContext,
    findings,
    evidenceLedger,
    reviewDecisions,
    contradictionDecisions,
    unresolvedContradictions,
    compiledAt = new Date().toISOString()
  } = params;

  // Index decisions by finding ID
  const decisionsByFinding = new Map<string, ReviewDecision>();
  for (const dec of reviewDecisions) {
    decisionsByFinding.set(dec.findingId, dec);
  }

  const matrix = selfAssessmentContext.diligenceMatrix || {};
  const capPct = matrix.capabilityScore !== null && matrix.capabilityScore !== undefined ? matrix.capabilityScore : '?';
  const asrPct = matrix.assuranceScore !== null && matrix.assuranceScore !== undefined ? matrix.assuranceScore : '?';
  const quad = matrix.quadrant || 'unknown';

  const canonicalFindings: CanonicalFinding[] = findings.map(f => {
    const decision = decisionsByFinding.get(f.id);

    // Derive 5 Trust Layers
    // Layer 1: Self-assessment context
    const selfAssessmentLayer = `Client positioned at ${capPct}% capability, ${asrPct}% assurance (${quad} quadrant)`;

    // Layer 2: Client claim
    const clientClaim = f.basis || 'Client claimed baseline control posture in self-assessment';

    // Layer 3: Claimed evidence level
    const claimedLevel = `Client claimed E0-E4 self-assessment position`;

    // Layer 4: Recognized evidence level
    const recognizedLevel = `System recognizes ${f.evidenceLevel}`;

    // Layer 5: Reviewer attestation
    let reviewerAttestation = 'Pending reviewer assessment';
    if (decision) {
      if (decision.decisionType === 'override_deterministic') {
        reviewerAttestation = `Reviewer ${decision.reviewerId} (${decision.reviewerRole}): Downgraded to ${decision.effectiveSeverity}. Reason: ${decision.reasoning}`;
      } else if (decision.decisionType === 'accept') {
        reviewerAttestation = `Reviewer ${decision.reviewerId} (${decision.reviewerRole}): Confirmed ${decision.effectiveSeverity}. Reason: ${decision.reasoning}`;
      } else if (decision.decisionType === 'upgrade_evidence') {
        reviewerAttestation = `Reviewer ${decision.reviewerId} (${decision.reviewerRole}): Upgraded evidence to ${decision.newEvidence?.supportsLevel}. Reason: ${decision.reasoning}`;
      } else {
        reviewerAttestation = `Reviewer ${decision.reviewerId} (${decision.reviewerRole}): Disposition ${decision.disposition}. Reason: ${decision.reasoning}`;
      }
    }

    return {
      ...f,
      updatedAt: f.updatedAt || f.createdAt,
      trustLayers: {
        selfAssessmentContext: selfAssessmentLayer,
        clientClaim,
        claimedEvidenceLevel: claimedLevel,
        recognizedEvidenceLevel: recognizedLevel,
        reviewerAttestation
      }
    };
  });

  // Calculate summary counts
  let criticalFindings = 0;
  let highFindings = 0;
  let mediumFindings = 0;
  let lowFindings = 0;
  let overriddenCount = 0;
  let evidenceUpgradesCount = 0;

  for (const f of canonicalFindings) {
    if (f.effectiveSeverity === 'critical') criticalFindings++;
    else if (f.effectiveSeverity === 'high') highFindings++;
    else if (f.effectiveSeverity === 'medium') mediumFindings++;
    else if (f.effectiveSeverity === 'low') lowFindings++;

    if (f.disposition === 'downgraded' || f.disposition === 'upgraded') {
      overriddenCount++;
    }
  }

  for (const dec of reviewDecisions) {
    if (dec.decisionType === 'upgrade_evidence') {
      evidenceUpgradesCount++;
    }
  }

  return {
    schemaVersion: '1.0.0',
    assessmentId,
    systemId: systemSnapshot.systemId,
    systemSnapshotId: systemSnapshot.id,
    systemSnapshot,
    authorityMap,
    selfAssessmentContext,
    findings: canonicalFindings,
    evidenceLedger,
    reviewDecisions,
    contradictionDecisions,
    unresolvedContradictions,
    summary: {
      totalFindings: canonicalFindings.length,
      criticalFindings,
      highFindings,
      mediumFindings,
      lowFindings,
      overriddenCount,
      evidenceUpgradesCount
    },
    compiledAt
  };
}

/**
 * Attests a Canonical Assessment state by computing a SHA-256 hash of its canonicalized JSON.
 */
export function attestAssessment(
  canonical: CanonicalAssessment,
  session: ReviewerSession,
  statement: string = 'I attest that this assessment accurately represents the system governability state.',
  reportMarkdownHash?: string
): AttestationRecord {
  const canonicalJson = canonicalizeJson(canonical);
  const canonicalAssessmentHash = createHash('sha256').update(canonicalJson).digest('hex');

  const attestationId = `attest-${canonical.assessmentId}-${Date.now()}`;

  return {
    attestationId,
    assessmentId: canonical.assessmentId,
    systemSnapshotId: canonical.systemSnapshotId,
    canonicalAssessmentHash,
    reportMarkdownHash,
    attestedBy: {
      reviewerId: session.reviewerId,
      reviewerName: session.reviewerName,
      role: session.role
    },
    statement,
    attestedAt: new Date().toISOString()
  };
}
