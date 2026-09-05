/**
 * Test suite for Phase 6 domain types:
 * Provenance-aware findings, epistemic evidence metadata, and reviewer decisions.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { 
  generateAssessmentFindings,
  type AssessmentFinding,
  type CandidateFinding
} from '../src/index';

import type {
  EvidenceSourceType,
  CollectionMethodType,
  ValidationTestRecord,
  AdversarialTestRecord
} from '../src/assurance-types';

import type {
  ReviewerRole,
  FindingDisposition,
  ReviewDecisionType,
  ReviewerSession,
  ReviewDecision
} from '../src/reviewer/types';

describe('Phase 6: Provenance-Aware Domain Types', () => {
  it('generates findings with baselineSeverity, effectiveSeverity, and unresolved disposition', () => {
    const candidate: CandidateFinding = {
      frameworkRefs: ['ASI01'],
      severity: 'critical',
      confidence: 'moderate',
      evidenceLevel: 'E1_documented',
      description: 'Irreversible action without approval',
      basis: 'edge.requires_human_approval is false'
    };

    const findings: AssessmentFinding[] = generateAssessmentFindings([candidate], 'asmt-001');

    assert.equal(findings.length, 1);
    const finding = findings[0];

    // Preserves legacy severity
    assert.equal(finding.severity, 'critical');

    // Establishes immutable baseline
    assert.equal(finding.baselineSeverity, 'critical');

    // Establishes mutable effective severity initialized to baseline
    assert.equal(finding.effectiveSeverity, 'critical');

    // Establishes initial disposition
    assert.equal(finding.disposition, 'unresolved');
    assert.equal(finding.overrideReason, undefined);
    assert.equal(finding.decisionId, undefined);
  });

  it('supports structured epistemic evidence records (E3 validation & E4 adversarial)', () => {
    const validationRecord: ValidationTestRecord = {
      testId: 'TEST-VAL-01',
      objective: 'Verify payment approval modal blocks execution until authorized',
      preconditions: 'Agent session authenticated with valid payment tool permissions',
      steps: [
        'Invoke trigger_payment with amount=500.00',
        'Assert webhook intercepted and placed into pending_approval state',
        'Assert payment transaction is not broadcast without approval token'
      ],
      expectedResult: 'Transaction blocked pending approval',
      observedResult: 'Transaction blocked pending approval token',
      environment: 'sandbox',
      testerIdentity: 'reviewer_evan_01',
      timestamp: '2026-09-05T10:00:00Z',
      outcome: 'pass',
      artifacts: [{ name: 'audit_log.json', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }]
    };

    assert.equal(validationRecord.outcome, 'pass');
    assert.equal(validationRecord.environment, 'sandbox');

    const adversarialRecord: AdversarialTestRecord = {
      ...validationRecord,
      testId: 'TEST-ADV-01',
      authorizationScope: 'SOW-2026-08-AGY-SEC',
      attackClass: 'prompt_injection_bypass_guardrail',
      payloadMethod: 'Embedded Unicode override tag in supplier invoice field'
    };

    assert.equal(adversarialRecord.attackClass, 'prompt_injection_bypass_guardrail');
    assert.equal(adversarialRecord.authorizationScope, 'SOW-2026-08-AGY-SEC');
  });

  it('structures ReviewDecision with disposition, baseline, and effective severity', () => {
    const decision: ReviewDecision = {
      id: 'dec-101',
      findingId: 'finding-asmt-001-1',
      reviewerId: 'rev-internal-01',
      reviewerRole: 'internal_validator',
      decisionType: 'override_deterministic',
      disposition: 'downgraded',
      baselineSeverity: 'critical',
      effectiveSeverity: 'medium',
      reasoning: 'Compensating control observed: downstream gateway enforces independent daily cap of $100',
      createdAt: '2026-09-05T10:30:00Z'
    };

    assert.equal(decision.disposition, 'downgraded');
    assert.equal(decision.baselineSeverity, 'critical');
    assert.equal(decision.effectiveSeverity, 'medium');
  });
});
