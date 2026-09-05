/**
 * Test suite for Task 4: Canonical Assessment Compiler & Attestation
 * 
 * Verifies:
 * - Aggregates snapshot, authority map, context, findings, evidence, decisions into CanonicalAssessment.
 * - Enriches each finding with the 5 trust layers.
 * - Computes reproducible canonical JSON serialization.
 * - Generates SHA-256 cryptographic attestation record.
 * - Reproducibility: Identical assessment state produces identical hash.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { 
  compileCanonicalAssessment,
  canonicalizeJson,
  attestAssessment,
  createSystemSnapshot,
  seedAuthorityMapFromTrackD,
  generateTrackDReportContext,
  type AssessmentFinding,
  type ReviewDecision,
  type ReviewerSession,
  type EpistemicEvidenceRecord,
  type TrackDSelfAssessmentContext
} from '../src/index';

function getMockContext(): TrackDSelfAssessmentContext {
  return {
    schemaVersion: '6.1.0',
    generatedAt: '2026-09-05T08:00:00Z',
    importedAt: '2026-09-05T08:05:00Z',
    sourceArtifactHash: 'mock-source-hash-1234',
    metadata: {
      criticality: 'financial',
      audience: 'investor',
      company: 'Acme AI Payments',
      assessor: 'Alice Consultant',
      confidence: 'medium',
      date: '2026-09-05'
    },
    diligenceMatrix: {
      capabilityScore: 21,
      assuranceScore: 9,
      quadrant: 'risk'
    },
    narrative: {
      relianceRecommendation: 'NO RELIANCE',
      relianceRationale: 'High-risk automated actions without verification'
    },
    floorRulesTriggered: ['D3 Floor Rule (No Override)'],
    regulatoryMapping: {
      D1: { title: 'Reversibility', tags: ['ASI01'] },
      D3: { title: 'Human Override', tags: ['ASI01'] }
    },
    dimensionScores: [
      {
        dimensionId: 3,
        title: 'Human Override',
        capabilityScore: 0,
        assuranceScore: 0,
        isNA: false,
        auditorNotes: 'No human override gate in place.',
        claimedAssuranceLevel: 0,
        gatedEvidenceLevel: 'E0_claimed',
        evidenceProvenance: 'track_d_self_assessment'
      }
    ]
  };
}

const mockFinding: AssessmentFinding = {
  id: 'finding-001',
  assessmentId: 'asmt-001',
  frameworkRefs: ['ASI01'],
  authorityMapEdgeId: 'edge-1',
  title: 'Agent can execute irreversible financial transactions without human authorization',
  description: 'No approval checkpoint before payment API call.',
  basis: 'edge.action_reversibility = irreversible AND edge.requires_human_approval = false',
  severity: 'medium',
  baselineSeverity: 'critical',
  effectiveSeverity: 'medium',
  disposition: 'downgraded',
  overrideReason: 'Downstream daily velocity cap of $50 limits exposure.',
  decisionId: 'dec-001',
  confidence: 'moderate',
  evidenceLevel: 'E2_observed',
  status: 'open',
  draftedBy: 'deterministic_rule_engine',
  createdAt: '2026-09-05T09:00:00Z'
};

const mockDecision: ReviewDecision = {
  id: 'dec-001',
  findingId: 'finding-001',
  reviewerId: 'rev-evan-01',
  reviewerRole: 'human_validator',
  decisionType: 'override_deterministic',
  disposition: 'downgraded',
  baselineSeverity: 'critical',
  effectiveSeverity: 'medium',
  reasoning: 'Downstream daily velocity cap of $50 limits exposure.',
  createdAt: '2026-09-05T09:30:00Z'
};

const mockSession: ReviewerSession = {
  reviewerId: 'rev-evan-01',
  reviewerName: 'Evan Security Auditor',
  role: 'human_validator',
  sessionStartedAt: '2026-09-05T09:00:00Z',
  isDevMock: true
};

describe('Phase 6: Canonical Assessment Compiler & Attestation', () => {
  it('compiles CanonicalAssessment and formats 5 trust layers per finding', () => {
    const authorityMap = {
      systemId: 'sys-acme-01',
      derivedAt: '2026-09-05T08:10:00Z',
      sourceArtifactHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      nodes: [{ id: 'node-1', nodeType: 'agent' as const, name: 'Payment Bot', metadata: {}, source: 'track_d_dimension' as const, sourceDimensionId: 1 }],
      edges: [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2', edgeType: 'calls' as const, requiresHumanApproval: false, trustBoundary: 'external' as const, permissionScope: 'write', source: 'track_d_dimension' as const, sourceDimensionId: 1 }]
    };

    const snapshot = createSystemSnapshot({
      systemId: 'sys-acme-01',
      sourceArtifactHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      authorityMap,
      sourceVersion: 'v1.0.0'
    });

    const canonical = compileCanonicalAssessment({
      assessmentId: 'asmt-001',
      systemSnapshot: snapshot,
      authorityMap,
      selfAssessmentContext: getMockContext(),
      findings: [mockFinding],
      evidenceLedger: [],
      reviewDecisions: [mockDecision],
      contradictionDecisions: [],
      unresolvedContradictions: []
    });

    assert.equal(canonical.schemaVersion, '1.0.0');
    assert.equal(canonical.findings.length, 1);
    assert.equal(canonical.summary.totalFindings, 1);
    assert.equal(canonical.summary.overriddenCount, 1);
    assert.equal(canonical.summary.criticalFindings, 0); // Effective is medium
    assert.equal(canonical.summary.mediumFindings, 1);

    // Verify 5 Trust Layers on the finding
    const f = canonical.findings[0];
    assert.ok(f.trustLayers.selfAssessmentContext.includes('risk'));
    assert.ok(f.trustLayers.clientClaim);
    assert.ok(f.trustLayers.claimedEvidenceLevel);
    assert.ok(f.trustLayers.recognizedEvidenceLevel.includes('E2_observed'));
    assert.ok(f.trustLayers.reviewerAttestation?.includes('Downgraded to medium'));
  });

  it('canonicalizeJson produces deterministic, property-order-invariant serialization', () => {
    const objA = { z: 1, a: 'hello', m: { y: 2, b: 3 } };
    const objB = { a: 'hello', m: { b: 3, y: 2 }, z: 1 };

    const strA = canonicalizeJson(objA);
    const strB = canonicalizeJson(objB);

    assert.equal(strA, strB);
  });

  it('attestAssessment generates SHA-256 content hash of canonical assessment', () => {
    const authorityMap = {
      systemId: 'sys-01',
      derivedAt: '2026-09-05T08:10:00Z',
      sourceArtifactHash: 'b2c3d4e5f60718293a4b5c6d7e8f9012',
      nodes: [],
      edges: []
    };
    const snapshot = createSystemSnapshot({
      systemId: 'sys-01',
      sourceArtifactHash: 'b2c3d4e5f60718293a4b5c6d7e8f9012',
      authorityMap
    });

    const canonical = compileCanonicalAssessment({
      assessmentId: 'asmt-002',
      systemSnapshot: snapshot,
      authorityMap,
      selfAssessmentContext: getMockContext(),
      findings: [mockFinding],
      evidenceLedger: [],
      reviewDecisions: [mockDecision],
      contradictionDecisions: [],
      unresolvedContradictions: []
    });

    const attestation = attestAssessment(canonical, mockSession, 'I attest this assessment accurately represents system governability.');

    assert.ok(attestation.attestationId.startsWith('attest-'));
    assert.equal(attestation.assessmentId, 'asmt-002');
    assert.equal(attestation.attestedBy.reviewerId, 'rev-evan-01');
    assert.equal(attestation.attestedBy.role, 'human_validator');
    assert.match(attestation.canonicalAssessmentHash, /^[0-9a-f]{64}$/);

    // Reproducibility check: Re-attesting identical state generates identical hash
    const attestation2 = attestAssessment(canonical, mockSession);
    assert.equal(attestation.canonicalAssessmentHash, attestation2.canonicalAssessmentHash);
  });
});
