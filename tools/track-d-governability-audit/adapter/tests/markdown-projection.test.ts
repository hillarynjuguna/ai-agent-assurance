/**
 * Test suite for Task 5: Deterministic Markdown Projection
 * 
 * Verifies:
 * - Projects CanonicalAssessment into complete 5-layer assurance report.
 * - Explicitly preserves deterministic baseline vs reviewer disposition vs effective severity.
 * - Renders the 5 trust layers for every finding.
 * - Renders contradiction resolutions and append-only reviewer decision log.
 * - Includes cryptographic attestation section with canonical SHA-256 hash.
 * - Determinism: identical canonical state generates byte-identical markdown.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { 
  renderAssessmentMarkdown,
  compileCanonicalAssessment,
  attestAssessment,
  createSystemSnapshot,
  type AssessmentFinding,
  type ReviewDecision,
  type ReviewerSession,
  type TrackDSelfAssessmentContext,
  type ContradictionDecision,
  type LlmContradiction
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
    dimensionScores: []
  };
}

const mockFinding: AssessmentFinding = {
  id: 'finding-syn04-1',
  assessmentId: 'asmt-syn04-01',
  frameworkRefs: ['ASI01', 'ACSC-ISM-AccessControl'],
  authorityMapEdgeId: 'edge-agent-payment',
  title: 'Agent can execute irreversible financial transactions without human authorization',
  description: 'Autonomous payment initiation detected with no approval checkpoint.',
  basis: 'edge.action_reversibility = irreversible AND edge.requires_human_approval = false',
  severity: 'medium',
  baselineSeverity: 'critical',
  effectiveSeverity: 'medium',
  disposition: 'downgraded',
  overrideReason: 'Downstream payment gateway enforces independent daily velocity cap of $50.',
  decisionId: 'dec-syn04-01',
  confidence: 'moderate',
  evidenceLevel: 'E3_validated',
  status: 'open',
  draftedBy: 'deterministic_rule_engine',
  createdAt: '2026-09-05T09:00:00Z'
};

const mockDecision: ReviewDecision = {
  id: 'dec-syn04-01',
  findingId: 'finding-syn04-1',
  reviewerId: 'rev-evan-01',
  reviewerRole: 'human_validator',
  decisionType: 'override_deterministic',
  disposition: 'downgraded',
  baselineSeverity: 'critical',
  effectiveSeverity: 'medium',
  reasoning: 'Downstream payment gateway enforces independent daily velocity cap of $50.',
  createdAt: '2026-09-05T09:30:00Z'
};

const mockContradiction: LlmContradiction = {
  subject: 'Database Access Scope',
  source_a_excerpt: 'Docs state read-only access',
  source_b_excerpt: 'Connection string grants db_owner',
  status: 'resolved_in_favor_of_source_b' as any
};

const mockContradictionDecision: ContradictionDecision = {
  id: 'cdec-001',
  contradictionSubject: 'Database Access Scope',
  reviewerId: 'rev-evan-01',
  reviewerRole: 'human_validator',
  disposition: 'resolved_in_favor_of_source_b',
  reasoning: 'Verified live RDS credentials match source B.',
  createdAt: '2026-09-05T09:35:00Z'
};

const mockSession: ReviewerSession = {
  reviewerId: 'rev-evan-01',
  reviewerName: 'Evan Security Auditor',
  role: 'human_validator',
  sessionStartedAt: '2026-09-05T09:00:00Z',
  isDevMock: true
};

describe('Phase 6: Deterministic Markdown Projection', () => {
  it('renders complete assurance report with baseline, disposition, effective severity, and 5 trust layers', () => {
    const authorityMap = {
      systemId: 'sys-acme-01',
      derivedAt: '2026-09-05T08:10:00Z',
      sourceArtifactHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      nodes: [{ id: 'node-1', nodeType: 'agent' as const, name: 'Payment Bot', metadata: {}, source: 'track_d_dimension' as const, sourceDimensionId: 1 }],
      edges: [{ id: 'edge-agent-payment', sourceNodeId: 'node-1', targetNodeId: 'node-2', edgeType: 'calls' as const, requiresHumanApproval: false, trustBoundary: 'external' as const, permissionScope: 'write', source: 'track_d_dimension' as const, sourceDimensionId: 1 }]
    };

    const snapshot = createSystemSnapshot({
      systemId: 'sys-acme-01',
      sourceArtifactHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      authorityMap,
      sourceVersion: 'v1.0.0'
    });

    const canonical = compileCanonicalAssessment({
      assessmentId: 'asmt-syn04-01',
      systemSnapshot: snapshot,
      authorityMap,
      selfAssessmentContext: getMockContext(),
      findings: [mockFinding],
      evidenceLedger: [],
      reviewDecisions: [mockDecision],
      contradictionDecisions: [mockContradictionDecision],
      unresolvedContradictions: [mockContradiction]
    });

    const attestation = attestAssessment(canonical, mockSession);
    const markdown = renderAssessmentMarkdown(canonical, attestation);

    // 1. Check Executive Summary & Scope
    assert.ok(markdown.includes('# AI Agent Assurance Report'));
    assert.ok(markdown.includes('sys-acme-01'));
    assert.ok(markdown.includes('snapshot-sys-acme-01'));

    // 2. Check Deterministic Override trail
    assert.ok(markdown.includes('Deterministic Baseline:** `critical`'));
    assert.ok(markdown.includes('Reviewer Disposition:** `downgraded`'));
    assert.ok(markdown.includes('Effective Severity:** `medium`'));
    assert.ok(markdown.includes('Downstream payment gateway enforces independent daily velocity cap of $50'));

    // 3. Check 5 Trust Layers
    assert.ok(markdown.includes('The Five Trust Layers'));
    assert.ok(markdown.includes('Self-Assessment Context'));
    assert.ok(markdown.includes('Client Claim'));
    assert.ok(markdown.includes('Claimed Evidence Level'));
    assert.ok(markdown.includes('Recognized Evidence Level'));
    assert.ok(markdown.includes('Reviewer Attestation'));

    // 4. Check Contradictions
    assert.ok(markdown.includes('Contradiction Register'));
    assert.ok(markdown.includes('Database Access Scope'));
    assert.ok(markdown.includes('resolved_in_favor_of_source_b'));

    // 5. Check Reviewer Decision Log
    assert.ok(markdown.includes('Reviewer Decision Log'));
    assert.ok(markdown.includes('dec-syn04-01'));
    assert.ok(markdown.includes('rev-evan-01'));

    // 6. Check Attestation Section
    assert.ok(markdown.includes('Cryptographic Attestation'));
    assert.ok(markdown.includes(attestation.canonicalAssessmentHash));
  });

  it('projection is strictly deterministic across multiple runs with identical canonical data', () => {
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
      assessmentId: 'asmt-003',
      systemSnapshot: snapshot,
      authorityMap,
      selfAssessmentContext: getMockContext(),
      findings: [mockFinding],
      evidenceLedger: [],
      reviewDecisions: [mockDecision],
      contradictionDecisions: [],
      unresolvedContradictions: [],
      compiledAt: '2026-09-05T10:00:00Z'
    });

    const attestation = {
      attestationId: 'attest-fixed',
      assessmentId: 'asmt-003',
      systemSnapshotId: snapshot.id,
      canonicalAssessmentHash: 'fixed-hash-1234',
      attestedBy: {
        reviewerId: 'rev-01',
        reviewerName: 'Evan',
        role: 'human_validator' as const
      },
      statement: 'Fixed attestation',
      attestedAt: '2026-09-05T10:05:00Z'
    };

    const run1 = renderAssessmentMarkdown(canonical, attestation);
    const run2 = renderAssessmentMarkdown(canonical, attestation);

    assert.equal(run1, run2);
  });
});
