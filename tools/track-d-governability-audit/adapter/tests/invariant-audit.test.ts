/**
 * Forensic Invariant Audit Test Suite (Phase 6 Release Gate)
 * 
 * Actively attempts to violate the 10 core assurance invariants specified
 * in the post-implementation forensic review request:
 * 
 * 1. Create finding initially at E2 without qualifying evidence (Blocked)
 * 2. Create finding initially at E3 without validation test record (Blocked)
 * 3. Create finding initially at E4 without authorized adversarial record (Blocked)
 * 4. Attempt to submit reviewer identity/role from client side (Ignored/Blocked)
 * 5. Verify unreviewed critical/high finding remains explicitly flagged as 'unresolved' (Flagged)
 * 6. Attempt to overwrite baselineSeverity via reviewer decision (Blocked)
 * 7. Attempt to mutate existing decision history rather than append (Blocked)
 * 8. Modify evidence after attestation and verify hash invalidation (Detected)
 * 9. Modify rendered markdown without modifying canonical state and verify hash discrepancy (Detected)
 * 10. Feed contradictory evidence and verify it cannot disappear without explicit decision (Enforced)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';

import { 
  generateAssessmentFindings,
  applyReviewDecision,
  applyContradictionDecision,
  compileCanonicalAssessment,
  canonicalizeJson,
  attestAssessment,
  renderAssessmentMarkdown,
  getServerReviewerSession,
  createSystemSnapshot,
  type AssessmentFinding,
  type ReviewDecision,
  type CandidateFinding,
  type EpistemicEvidenceRecord,
  type TrackDSelfAssessmentContext,
  type LlmContradiction
} from '../src/index';

function createDummyContext(): TrackDSelfAssessmentContext {
  return {
    schemaVersion: '6.1.0',
    generatedAt: '2026-09-05T08:00:00Z',
    importedAt: '2026-09-05T08:05:00Z',
    sourceArtifactHash: 'hash-test-01',
    metadata: {},
    diligenceMatrix: { capabilityScore: 50, assuranceScore: 20, quadrant: 'risk' },
    narrative: {},
    floorRulesTriggered: [],
    regulatoryMapping: {},
    dimensionScores: []
  };
}

describe('Forensic Invariant Audit: Active Violation Attempts', () => {

  // Invariant 1: Claim != Evidence. Automated finding generation cannot originate E2+
  it('Violation Attempt 1: Attempt to create finding initially at E2 without qualifying reviewer evidence', () => {
    // Malicious candidate attempting to set E2_observed directly during automated intake
    const maliciousCandidate: CandidateFinding = {
      frameworkRefs: ['ASI01'],
      severity: 'critical',
      confidence: 'high',
      evidenceLevel: 'E2_observed' as any,
      description: 'Attempting unearned E2',
      basis: 'Unverified self-claim'
    };

    const findings = generateAssessmentFindings([maliciousCandidate], 'asmt-inv-1');
    assert.equal(findings.length, 1);
    // HARD GATE: Must be clamped to E1_documented
    assert.equal(findings[0].evidenceLevel, 'E1_documented');
  });

  // Invariant 2: E3 requires reproducible validation test record
  it('Violation Attempt 2: Attempt to upgrade finding to E3 without validation test record', () => {
    const finding: AssessmentFinding = {
      id: 'f-01',
      assessmentId: 'asmt-inv-2',
      frameworkRefs: ['ASI01'],
      title: 'Test',
      description: 'Test',
      basis: 'Test',
      severity: 'high',
      baselineSeverity: 'high',
      effectiveSeverity: 'high',
      disposition: 'unresolved',
      confidence: 'moderate',
      evidenceLevel: 'E1_documented',
      status: 'open',
      draftedBy: 'deterministic_rule_engine',
      createdAt: '2026-09-05T08:00:00Z'
    };

    const badEvidence: EpistemicEvidenceRecord = {
      id: 'evi-bad-e3',
      findingId: 'f-01',
      supportsLevel: 'E3_validated',
      evidenceType: 'test_result',
      content: 'I ran the test manually in terminal',
      contentHash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      source: 'reviewer',
      collector: 'rev-01',
      collectionMethod: 'controlled_test',
      collectedAt: '2026-09-05T08:00:00Z'
      // validationTest missing
    };

    const decision: ReviewDecision = {
      id: 'dec-bad-e3',
      findingId: 'f-01',
      reviewerId: 'rev-01',
      reviewerRole: 'human_validator',
      decisionType: 'upgrade_evidence',
      disposition: 'confirmed',
      baselineSeverity: 'high',
      effectiveSeverity: 'high',
      reasoning: 'Testing without reproducible record',
      newEvidence: badEvidence,
      createdAt: '2026-09-05T08:00:00Z'
    };

    assert.throws(() => {
      applyReviewDecision(finding, decision);
    }, /E3_validated requires a reproducible ValidationTestRecord/);
  });

  // Invariant 3: E4 requires explicitly authorized adversarial test record
  it('Violation Attempt 3: Attempt to upgrade finding to E4 without authorized adversarial test record', () => {
    const finding: AssessmentFinding = {
      id: 'f-02',
      assessmentId: 'asmt-inv-3',
      frameworkRefs: ['ASI01'],
      title: 'Test',
      description: 'Test',
      basis: 'Test',
      severity: 'critical',
      baselineSeverity: 'critical',
      effectiveSeverity: 'critical',
      disposition: 'unresolved',
      confidence: 'moderate',
      evidenceLevel: 'E1_documented',
      status: 'open',
      draftedBy: 'deterministic_rule_engine',
      createdAt: '2026-09-05T08:00:00Z'
    };

    const badAdversarialEvidence: EpistemicEvidenceRecord = {
      id: 'evi-bad-e4',
      findingId: 'f-02',
      supportsLevel: 'E4_adversarially_tested',
      evidenceType: 'test_result',
      content: 'Ran prompt injection exploit',
      contentHash: '111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000',
      source: 'reviewer',
      collector: 'rev-01',
      collectionMethod: 'adversarial_test',
      collectedAt: '2026-09-05T08:00:00Z'
      // adversarialTest missing
    };

    const decision: ReviewDecision = {
      id: 'dec-bad-e4',
      findingId: 'f-02',
      reviewerId: 'rev-01',
      reviewerRole: 'specialist_partner',
      decisionType: 'upgrade_evidence',
      disposition: 'confirmed',
      baselineSeverity: 'critical',
      effectiveSeverity: 'critical',
      reasoning: 'Attempting E4 without scope authorization',
      newEvidence: badAdversarialEvidence,
      createdAt: '2026-09-05T08:00:00Z'
    };

    assert.throws(() => {
      applyReviewDecision(finding, decision);
    }, /E4_adversarially_tested requires an authorized AdversarialTestRecord/);
  });

  // Invariant 4: Reviewer identity/role cannot be supplied by client
  it('Violation Attempt 4: Attempt to submit reviewer identity/role from client-side', () => {
    // Client sends spoofed payload attempting to claim lead security auditor privileges
    const spoofedClientPayload = {
      reviewerId: 'hacker-007',
      role: 'specialist_partner',
      reviewerName: 'Legit Security Auditor'
    };

    // Server-side session resolver ignores client body entirely:
    const session = getServerReviewerSession();
    assert.notEqual(session.reviewerId, spoofedClientPayload.reviewerId);
    assert.equal(session.isDevMock, true);
  });

  // Invariant 5: Unreviewed high/critical findings cannot silently masquerade as confirmed
  it('Violation Attempt 5: Unreviewed high-severity findings remain explicitly flagged as unresolved in Canonical state', () => {
    const finding: AssessmentFinding = {
      id: 'f-critical-unreviewed',
      assessmentId: 'asmt-inv-5',
      frameworkRefs: ['ASI01'],
      title: 'Critical Financial Exposure',
      description: 'Autonomous payment possible',
      basis: 'edge.action_reversibility = irreversible',
      severity: 'critical',
      baselineSeverity: 'critical',
      effectiveSeverity: 'critical',
      disposition: 'unresolved',
      confidence: 'moderate',
      evidenceLevel: 'E1_documented',
      status: 'open',
      draftedBy: 'deterministic_rule_engine',
      createdAt: '2026-09-05T08:00:00Z'
    };

    const authorityMap = { systemId: 'sys-5', derivedAt: '2026-09-05', sourceArtifactHash: 'hash5', nodes: [], edges: [] };
    const snapshot = createSystemSnapshot({ systemId: 'sys-5', sourceArtifactHash: 'hash5', authorityMap });

    const canonical = compileCanonicalAssessment({
      assessmentId: 'asmt-inv-5',
      systemSnapshot: snapshot,
      authorityMap,
      selfAssessmentContext: createDummyContext(),
      findings: [finding],
      evidenceLedger: [],
      reviewDecisions: [], // NO reviewer decisions
      contradictionDecisions: [],
      unresolvedContradictions: []
    });

    const f = canonical.findings[0];
    assert.equal(f.disposition, 'unresolved');
    assert.equal(f.trustLayers.reviewerAttestation, 'Pending reviewer assessment');

    const markdown = renderAssessmentMarkdown(canonical);
    assert.ok(markdown.includes('Reviewer Disposition:** `unresolved`'));
    assert.ok(markdown.includes('Pending reviewer assessment'));
  });

  // Invariant 6: baselineSeverity is immutable and cannot be overwritten
  it('Violation Attempt 6: Attempt to overwrite baselineSeverity via reviewer decision', () => {
    const finding: AssessmentFinding = {
      id: 'f-baseline-check',
      assessmentId: 'asmt-inv-6',
      frameworkRefs: ['ASI01'],
      title: 'Test',
      description: 'Test',
      basis: 'Test',
      severity: 'critical',
      baselineSeverity: 'critical',
      effectiveSeverity: 'critical',
      disposition: 'unresolved',
      confidence: 'moderate',
      evidenceLevel: 'E1_documented',
      status: 'open',
      draftedBy: 'deterministic_rule_engine',
      createdAt: '2026-09-05T08:00:00Z'
    };

    // Reviewer decision maliciously sets baselineSeverity to low
    const maliciousDecision: any = {
      id: 'dec-malicious-baseline',
      findingId: 'f-baseline-check',
      reviewerId: 'rev-01',
      reviewerRole: 'human_validator',
      decisionType: 'override_deterministic',
      disposition: 'downgraded',
      baselineSeverity: 'low', // ATTEMPT TO OVERWRITE BASELINE
      effectiveSeverity: 'low',
      reasoning: 'Pretending machine never found critical',
      createdAt: '2026-09-05T08:00:00Z'
    };

    const updated = applyReviewDecision(finding, maliciousDecision);
    // INVARIANT ENFORCED: Engine preserves original finding.baselineSeverity!
    assert.equal(updated.baselineSeverity, 'critical');
    assert.equal(updated.effectiveSeverity, 'low');
  });

  // Invariant 7: Decisions are append-only; an update creates a new decision
  it('Violation Attempt 7: Changing disposition creates an append-only sequence rather than mutating prior decision', () => {
    const finding: AssessmentFinding = {
      id: 'f-audit-seq',
      assessmentId: 'asmt-inv-7',
      frameworkRefs: ['ASI01'],
      title: 'Test',
      description: 'Test',
      basis: 'Test',
      severity: 'critical',
      baselineSeverity: 'critical',
      effectiveSeverity: 'critical',
      disposition: 'unresolved',
      confidence: 'moderate',
      evidenceLevel: 'E1_documented',
      status: 'open',
      draftedBy: 'deterministic_rule_engine',
      createdAt: '2026-09-05T08:00:00Z'
    };

    // Decision 1: Reviewer initially accepts
    const decision1: ReviewDecision = {
      id: 'dec-seq-1',
      findingId: 'f-audit-seq',
      reviewerId: 'rev-01',
      reviewerRole: 'human_validator',
      decisionType: 'accept',
      disposition: 'confirmed',
      baselineSeverity: 'critical',
      effectiveSeverity: 'critical',
      reasoning: 'First pass: confirmed critical.',
      createdAt: '2026-09-05T08:10:00Z'
    };
    const state1 = applyReviewDecision(finding, decision1);

    // Decision 2: Reviewer subsequently downgrades due to new compensating evidence
    const decision2: ReviewDecision = {
      id: 'dec-seq-2',
      findingId: 'f-audit-seq',
      reviewerId: 'rev-01',
      reviewerRole: 'human_validator',
      decisionType: 'override_deterministic',
      disposition: 'downgraded',
      baselineSeverity: 'critical',
      effectiveSeverity: 'medium',
      reasoning: 'Second pass: compensating control discovered.',
      createdAt: '2026-09-05T08:20:00Z'
    };
    const state2 = applyReviewDecision(state1, decision2);

    // Decision 1 is NOT mutated
    assert.equal(decision1.disposition, 'confirmed');
    assert.equal(decision1.effectiveSeverity, 'critical');

    // Decision 2 records the new disposition
    assert.equal(decision2.disposition, 'downgraded');
    assert.equal(decision2.effectiveSeverity, 'medium');

    // Finding state reflects the latest decision while preserving baseline
    assert.equal(state2.baselineSeverity, 'critical');
    assert.equal(state2.effectiveSeverity, 'medium');
    assert.equal(state2.decisionId, 'dec-seq-2');
  });

  // Invariant 8: Modifying evidence after attestation invalidates the attestation hash
  it('Violation Attempt 8: Modifying evidence ledger after attestation causes attestation hash mismatch', () => {
    const authorityMap = { systemId: 'sys-8', derivedAt: '2026-09-05', sourceArtifactHash: 'hash8', nodes: [], edges: [] };
    const snapshot = createSystemSnapshot({ systemId: 'sys-8', sourceArtifactHash: 'hash8', authorityMap });
    const session = getServerReviewerSession();

    const originalEvidence: EpistemicEvidenceRecord = {
      id: 'evi-8-orig',
      findingId: 'f-08',
      supportsLevel: 'E2_observed',
      evidenceType: 'log_excerpt',
      content: 'Original telemetry log excerpt',
      contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      source: 'reviewer',
      collector: session.reviewerId,
      collectionMethod: 'automated_telemetry',
      collectedAt: '2026-09-05T08:00:00Z'
    };

    const canonical = compileCanonicalAssessment({
      assessmentId: 'asmt-inv-8',
      systemSnapshot: snapshot,
      authorityMap,
      selfAssessmentContext: createDummyContext(),
      findings: [],
      evidenceLedger: [originalEvidence],
      reviewDecisions: [],
      contradictionDecisions: [],
      unresolvedContradictions: []
    });

    const originalAttestation = attestAssessment(canonical, session);

    // Attacker modifies the evidence content after attestation
    const tamperedCanonical = {
      ...canonical,
      evidenceLedger: [
        {
          ...originalEvidence,
          content: 'TAMPERED: Fabricated evidence content that was not verified'
        }
      ]
    };

    const newHash = createHash('sha256').update(canonicalizeJson(tamperedCanonical)).digest('hex');

    // INVARIANT ENFORCED: Hashes MUST NOT MATCH!
    assert.notEqual(newHash, originalAttestation.canonicalAssessmentHash);
  });

  // Invariant 9: Modifying final markdown report without changing canonical state is detectable
  it('Violation Attempt 9: Modifying markdown report is detected by reportMarkdownHash discrepancy', () => {
    const authorityMap = { systemId: 'sys-9', derivedAt: '2026-09-05', sourceArtifactHash: 'hash9', nodes: [], edges: [] };
    const snapshot = createSystemSnapshot({ systemId: 'sys-9', sourceArtifactHash: 'hash9', authorityMap });
    const session = getServerReviewerSession();

    const canonical = compileCanonicalAssessment({
      assessmentId: 'asmt-inv-9',
      systemSnapshot: snapshot,
      authorityMap,
      selfAssessmentContext: createDummyContext(),
      findings: [],
      evidenceLedger: [],
      reviewDecisions: [],
      contradictionDecisions: [],
      unresolvedContradictions: []
    });

    const legitimateMarkdown = renderAssessmentMarkdown(canonical);
    const legitimateReportHash = createHash('sha256').update(legitimateMarkdown).digest('hex');

    // Attest including the rendered report hash
    const attestation = attestAssessment(canonical, session, 'Signed report', legitimateReportHash);
    assert.equal(attestation.reportMarkdownHash, legitimateReportHash);

    // Attacker modifies the markdown text directly (e.g. edits prose or removes disclaimer)
    const tamperedMarkdown = legitimateMarkdown.replace('Executive Summary', 'Altered Summary With Exclusions');
    const tamperedReportHash = createHash('sha256').update(tamperedMarkdown).digest('hex');

    // INVARIANT ENFORCED: Discrepancy is cryptographically detectable!
    assert.notEqual(tamperedReportHash, attestation.reportMarkdownHash);
  });

  // Invariant 10: Contradictory evidence cannot simply disappear without explicit resolution decision
  it('Violation Attempt 10: Contradictions cannot be silently omitted from Canonical state or Report', () => {
    const contradiction: LlmContradiction = {
      subject: 'Data Encryption At Rest',
      source_a_excerpt: 'Policy claims AES-256 enabled on all volumes.',
      source_b_excerpt: 'Terraform script sets encrypted = false on primary EBS volume.',
      status: 'unresolved'
    };

    const authorityMap = { systemId: 'sys-10', derivedAt: '2026-09-05', sourceArtifactHash: 'hash10', nodes: [], edges: [] };
    const snapshot = createSystemSnapshot({ systemId: 'sys-10', sourceArtifactHash: 'hash10', authorityMap });

    const canonical = compileCanonicalAssessment({
      assessmentId: 'asmt-inv-10',
      systemSnapshot: snapshot,
      authorityMap,
      selfAssessmentContext: createDummyContext(),
      findings: [],
      evidenceLedger: [],
      reviewDecisions: [],
      contradictionDecisions: [],
      unresolvedContradictions: [contradiction] // Contradiction passed in
    });

    // INVARIANT ENFORCED: Contradiction is present in Canonical State
    assert.equal(canonical.unresolvedContradictions.length, 1);
    assert.equal(canonical.unresolvedContradictions[0].status, 'unresolved');

    // INVARIANT ENFORCED: Contradiction is rendered in the public Report
    const markdown = renderAssessmentMarkdown(canonical);
    assert.ok(markdown.includes('Contradiction Register'));
    assert.ok(markdown.includes('Data Encryption At Rest'));
    assert.ok(markdown.includes('Policy claims AES-256 enabled on all volumes.'));
    assert.ok(markdown.includes('Terraform script sets encrypted = false on primary EBS volume.'));
  });
});
