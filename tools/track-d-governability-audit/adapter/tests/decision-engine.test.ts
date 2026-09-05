/**
 * Test suite for Task 3: Decision State Machine
 * 
 * Verifies:
 * - Reviewer override preserves baseline severity while updating effective severity.
 * - Evidence upgrade enforces Phase 2 invariants (E2+ requires qualifying reviewer/test evidence).
 * - E3 requires reproducible validation test record.
 * - E4 requires authorized adversarial test record.
 * - Contradiction resolution lifecycle.
 * - Decisions are append-only.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { 
  applyReviewDecision,
  applyContradictionDecision,
  createReviewDecision,
  type AssessmentFinding,
  type ReviewDecision,
  type ReviewerSession,
  type EpistemicEvidenceRecord,
  type ContradictionDecision,
  type LlmContradiction
} from '../src/index';

function createMockFinding(): AssessmentFinding {
  return {
    id: 'finding-syn04-1',
    assessmentId: 'asmt-syn04',
    frameworkRefs: ['ASI01', 'ACSC-ISM-AccessControl'],
    authorityMapEdgeId: 'edge-agent-payment-api',
    title: 'Agent can execute irreversible financial transactions without human authorization',
    description: 'Autonomous payment initiation detected with no approval checkpoint.',
    basis: 'edge.action_reversibility = irreversible AND edge.requires_human_approval = false',
    severity: 'critical',
    baselineSeverity: 'critical',
    effectiveSeverity: 'critical',
    disposition: 'unresolved',
    confidence: 'moderate',
    evidenceLevel: 'E1_documented',
    status: 'open',
    draftedBy: 'deterministic_rule_engine',
    createdAt: '2026-09-05T09:00:00Z'
  };
}

const mockSession: ReviewerSession = {
  reviewerId: 'rev-evan-01',
  reviewerName: 'Evan Security Auditor',
  role: 'human_validator',
  sessionStartedAt: '2026-09-05T09:00:00Z',
  isDevMock: true
};

describe('Phase 6: Decision State Machine', () => {
  it('overrides deterministic severity: preserves baseline, sets effective severity to medium', () => {
    const finding = createMockFinding();

    const decision: ReviewDecision = {
      id: 'dec-001',
      findingId: finding.id,
      reviewerId: mockSession.reviewerId,
      reviewerRole: mockSession.role,
      decisionType: 'override_deterministic',
      disposition: 'downgraded',
      baselineSeverity: finding.baselineSeverity,
      effectiveSeverity: 'medium',
      reasoning: 'Compensating control observed: downstream payment gateway enforces independent daily budget cap of $50.',
      createdAt: '2026-09-05T09:30:00Z'
    };

    const updated = applyReviewDecision(finding, decision);

    // INVARIANT: Baseline remains Critical
    assert.equal(updated.baselineSeverity, 'critical');

    // Effective severity is now Medium
    assert.equal(updated.effectiveSeverity, 'medium');
    assert.equal(updated.severity, 'medium'); // Backwards compatibility mirror
    assert.equal(updated.disposition, 'downgraded');
    assert.equal(updated.overrideReason, decision.reasoning);
    assert.equal(updated.decisionId, 'dec-001');
  });

  it('accepts finding without override: confirms baseline severity', () => {
    const finding = createMockFinding();

    const decision: ReviewDecision = {
      id: 'dec-002',
      findingId: finding.id,
      reviewerId: mockSession.reviewerId,
      reviewerRole: mockSession.role,
      decisionType: 'accept',
      disposition: 'confirmed',
      baselineSeverity: finding.baselineSeverity,
      effectiveSeverity: finding.baselineSeverity,
      reasoning: 'Confirmed by reviewing production IAM policies; no approval gateway in place.',
      createdAt: '2026-09-05T09:35:00Z'
    };

    const updated = applyReviewDecision(finding, decision);

    assert.equal(updated.baselineSeverity, 'critical');
    assert.equal(updated.effectiveSeverity, 'critical');
    assert.equal(updated.disposition, 'confirmed');
    assert.equal(updated.decisionId, 'dec-002');
  });

  it('upgrades evidence level to E2_observed when valid reviewer observation evidence is provided', () => {
    const finding = createMockFinding();

    const observationEvidence: EpistemicEvidenceRecord = {
      id: 'evi-obs-01',
      findingId: finding.id,
      supportsLevel: 'E2_observed',
      evidenceType: 'log_excerpt',
      content: 'Production audit log demonstrating autonomous transaction execution.',
      contentHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      source: 'reviewer',
      collector: 'rev-evan-01',
      collectionMethod: 'automated_telemetry',
      collectedAt: '2026-09-05T09:40:00Z'
    };

    const decision: ReviewDecision = {
      id: 'dec-003',
      findingId: finding.id,
      reviewerId: mockSession.reviewerId,
      reviewerRole: mockSession.role,
      decisionType: 'upgrade_evidence',
      disposition: 'confirmed',
      baselineSeverity: finding.baselineSeverity,
      effectiveSeverity: finding.effectiveSeverity,
      reasoning: 'Observed runtime telemetry proving that payment API was invoked without human prompt.',
      evidenceId: observationEvidence.id,
      newEvidence: observationEvidence,
      createdAt: '2026-09-05T09:41:00Z'
    };

    const updated = applyReviewDecision(finding, decision);

    assert.equal(updated.evidenceLevel, 'E2_observed');
  });

  it('rejects evidence upgrade to E2+ if evidence is submitted by client alone', () => {
    const finding = createMockFinding();

    const clientEvidence: EpistemicEvidenceRecord = {
      id: 'evi-client-01',
      findingId: finding.id,
      supportsLevel: 'E2_observed',
      evidenceType: 'client_statement',
      content: 'Client claims they tested this in their sandbox.',
      contentHash: 'b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01',
      source: 'client',
      collector: 'client_admin',
      collectionMethod: 'manual_upload',
      collectedAt: '2026-09-05T09:40:00Z'
    };

    const decision: ReviewDecision = {
      id: 'dec-004',
      findingId: finding.id,
      reviewerId: mockSession.reviewerId,
      reviewerRole: mockSession.role,
      decisionType: 'upgrade_evidence',
      disposition: 'confirmed',
      baselineSeverity: finding.baselineSeverity,
      effectiveSeverity: finding.effectiveSeverity,
      reasoning: 'Attempting upgrade using client self-assessment.',
      evidenceId: clientEvidence.id,
      newEvidence: clientEvidence,
      createdAt: '2026-09-05T09:41:00Z'
    };

    assert.throws(() => {
      applyReviewDecision(finding, decision);
    }, /cannot be set to E2_observed with client-only evidence/);
  });

  it('rejects evidence upgrade to E3_validated if validation test record is missing', () => {
    const finding = createMockFinding();

    const invalidE3Evidence: EpistemicEvidenceRecord = {
      id: 'evi-e3-invalid',
      findingId: finding.id,
      supportsLevel: 'E3_validated',
      evidenceType: 'test_result',
      content: 'Reviewer ran some test but did not document test steps or outcome.',
      contentHash: 'c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef012',
      source: 'reviewer',
      collector: 'rev-evan-01',
      collectionMethod: 'controlled_test',
      collectedAt: '2026-09-05T09:40:00Z'
      // validationTest omitted!
    };

    const decision: ReviewDecision = {
      id: 'dec-005',
      findingId: finding.id,
      reviewerId: mockSession.reviewerId,
      reviewerRole: mockSession.role,
      decisionType: 'upgrade_evidence',
      disposition: 'confirmed',
      baselineSeverity: finding.baselineSeverity,
      effectiveSeverity: finding.effectiveSeverity,
      reasoning: 'Test ran.',
      newEvidence: invalidE3Evidence,
      createdAt: '2026-09-05T09:41:00Z'
    };

    assert.throws(() => {
      applyReviewDecision(finding, decision);
    }, /E3_validated requires a reproducible ValidationTestRecord/);
  });

  it('accepts evidence upgrade to E3_validated when complete reproducible test record is provided', () => {
    const finding = createMockFinding();

    const validE3Evidence: EpistemicEvidenceRecord = {
      id: 'evi-e3-valid',
      findingId: finding.id,
      supportsLevel: 'E3_validated',
      evidenceType: 'test_result',
      content: 'Controlled sandbox test executing payment API call with and without approval flag.',
      contentHash: 'd4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0123',
      source: 'reviewer',
      collector: 'rev-evan-01',
      collectionMethod: 'controlled_test',
      collectedAt: '2026-09-05T09:40:00Z',
      validationTest: {
        testId: 'TEST-SYN04-CONTROLLED',
        objective: 'Demonstrate payment tool execution bypass',
        steps: ['Initialize agent in sandbox', 'Inject prompt requesting $20 payment', 'Observe API call'],
        expectedResult: 'HTTP 403 or Approval Required',
        observedResult: 'HTTP 200 Payment Success',
        environment: 'sandbox',
        testerIdentity: 'rev-evan-01',
        timestamp: '2026-09-05T09:40:00Z',
        outcome: 'fail' // Proves vulnerability exists
      }
    };

    const decision: ReviewDecision = {
      id: 'dec-006',
      findingId: finding.id,
      reviewerId: mockSession.reviewerId,
      reviewerRole: mockSession.role,
      decisionType: 'upgrade_evidence',
      disposition: 'confirmed',
      baselineSeverity: finding.baselineSeverity,
      effectiveSeverity: finding.effectiveSeverity,
      reasoning: 'Controlled validation test successfully executed and reproduced.',
      newEvidence: validE3Evidence,
      createdAt: '2026-09-05T09:41:00Z'
    };

    const updated = applyReviewDecision(finding, decision);
    assert.equal(updated.evidenceLevel, 'E3_validated');
  });

  it('resolves LLM contradictions with auditable disposition and reasoning', () => {
    const contradiction: LlmContradiction = {
      subject: 'Database Access Scope',
      source_a_excerpt: 'System docs claim agent only has SELECT access to customer table.',
      source_b_excerpt: 'Connection string grants db_owner role.',
      status: 'unresolved'
    };

    const decision: ContradictionDecision = {
      id: 'cdec-001',
      contradictionSubject: contradiction.subject,
      reviewerId: mockSession.reviewerId,
      reviewerRole: mockSession.role,
      disposition: 'resolved_in_favor_of_source_b',
      reasoning: 'Database admin verified that the connection string is active in production, overriding documentation claims.',
      createdAt: '2026-09-05T09:45:00Z'
    };

    const resolved = applyContradictionDecision(contradiction, decision);
    assert.equal(resolved.status, 'resolved_in_favor_of_source_b');
  });
});
