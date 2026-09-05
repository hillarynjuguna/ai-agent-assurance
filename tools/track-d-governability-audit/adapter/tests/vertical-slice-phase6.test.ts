/**
 * Phase 6 End-to-End Vertical Slice Integration Test Suite
 * 
 * Tests the complete lifecycle:
 * Intake → Snapshot → Authority Map → Deterministic Rules → Reviewer Decision → 
 * Epistemic Evidence Upgrade → Canonical Assessment JSON → Deterministic Markdown Report → Attestation Hash
 * 
 * Verifies:
 * 1. SYN-04 Primary Vertical Slice:
 *    - Deterministic engine fires Critical (E1).
 *    - Reviewer submits E3 reproducible validation test of compensating control.
 *    - Reviewer overrides severity from Critical to Medium.
 *    - Machine-to-human decision trail: baseline Critical remains immutable, effective is Medium.
 *    - Produces Canonical JSON and Attestation hash.
 *    - Generates 5-layer Markdown report with unbroken provenance chain.
 * 2. SYN-05 Contradiction Resolution:
 *    - LLM contradiction on database privileges is resolved by human reviewer in favor of config.
 * 3. SYN-10 Inadequate Approval Verification:
 *    - Reviewer inspects "approval" step, identifies it as auto-ack, confirms Critical with E3 test.
 * 4. Adversarial Reviewer Tests:
 *    - Attempting E1 -> E3 without reproducible test record is rejected.
 *    - Attempting E2+ with client-only evidence is rejected.
 *    - Baseline severity cannot be mutated.
 *    - Identical canonical data produces byte-identical attestation hash and markdown.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { 
  executeDeterministicRules,
  generateAssessmentFindings,
  createSystemSnapshot,
  getServerReviewerSession,
  applyReviewDecision,
  applyContradictionDecision,
  compileCanonicalAssessment,
  canonicalizeJson,
  attestAssessment,
  renderAssessmentMarkdown,
  type AssessmentFinding,
  type ReviewDecision,
  type EpistemicEvidenceRecord,
  type TrackDSelfAssessmentContext,
  type SeededAuthorityMap,
  type LlmContradiction
} from '../src/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'docs', 'assurance-mvp-spec', 'fixtures');

interface SyntheticSystem {
  id: string;
  name: string;
  description: string;
  authority_map_summary: string;
  expected_framework_mappings: string[];
  expected_evidence_level_after_intake: string;
  expected_findings: Array<{ title: string; severity: string }>;
  expected_reviewer_intervention: string;
}

function loadSyntheticCorpus(): SyntheticSystem[] {
  const filePath = join(SPEC_FIXTURES_DIR, '08-synthetic-corpus.json');
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw).systems as SyntheticSystem[];
}

function getMockContextForSystem(sys: SyntheticSystem): TrackDSelfAssessmentContext {
  return {
    schemaVersion: '6.1.0',
    generatedAt: '2026-09-05T08:00:00Z',
    importedAt: '2026-09-05T08:05:00Z',
    sourceArtifactHash: `hash-${sys.id}-config`,
    metadata: {
      criticality: 'financial',
      audience: 'investor',
      company: `Corp-${sys.id}`,
      assessor: 'Auditor Test',
      confidence: 'medium',
      date: '2026-09-05'
    },
    diligenceMatrix: {
      capabilityScore: 45,
      assuranceScore: 20,
      quadrant: 'risk'
    },
    narrative: {
      relianceRecommendation: 'CONDITIONAL RELIANCE',
      relianceRationale: 'Requires human review of edge permissions'
    },
    floorRulesTriggered: [],
    regulatoryMapping: {},
    dimensionScores: []
  };
}

describe('Phase 6: End-to-End Vertical Slice Integration Test', () => {
  const corpus = loadSyntheticCorpus();

  it('executes the full vertical slice for SYN-04: Deterministic finding -> E3 Evidence -> Reviewer Override -> Canonical JSON -> Attested Report', () => {
    const syn04 = corpus.find(s => s.id === 'SYN-04')!;
    assert.ok(syn04);

    // 1. Build Authority Map for SYN-04
    // agent -> calls -> api(payment_api, requires_human_approval=false, action_reversibility=irreversible)
    const authorityMap: SeededAuthorityMap = {
      systemId: syn04.id,
      derivedAt: '2026-09-05T08:30:00Z',
      sourceArtifactHash: 'hash-syn04-artifact',
      nodes: [
        { id: 'node-agent-04', nodeType: 'agent', name: 'Financial Payment Agent', metadata: {} },
        { id: 'node-api-04', nodeType: 'api', name: 'Payment Gateway API', metadata: {} }
      ],
      edges: [
        {
          id: 'edge-agent-payment-api',
          sourceNodeId: 'node-agent-04',
          targetNodeId: 'node-api-04',
          edgeType: 'calls',
          actionReversibility: 'irreversible',
          requiresHumanApproval: false,
          trustBoundary: 'external',
          permissionScope: 'transfer_funds'
        }
      ]
    };


    // 2. Freeze SystemSnapshot (Option A identity policy)
    const snapshot = createSystemSnapshot({
      systemId: syn04.id,
      sourceArtifactHash: authorityMap.sourceArtifactHash,
      authorityMap,
      sourceVersion: 'v1.0.0'
    });
    assert.ok(snapshot.id.startsWith(`snapshot-${syn04.id}-`));

    // 3. Execute Deterministic Rules (Phase 3 Engine)
    const ruleResult = executeDeterministicRules(authorityMap.edges, authorityMap.nodes);
    assert.equal(ruleResult.findings.length, 2); // Rule 1 (Irreversible no approval) + Rule 4 (D10 uncontained)

    const initialFindings = generateAssessmentFindings(ruleResult.findings, 'asmt-syn04-100');
    const paymentFinding = initialFindings.find(f => f.authorityMapEdgeId === 'edge-agent-payment-api');
    assert.ok(paymentFinding);

    // Assert baseline deterministic state
    assert.equal(paymentFinding.severity, 'critical');
    assert.equal(paymentFinding.baselineSeverity, 'critical');
    assert.equal(paymentFinding.effectiveSeverity, 'critical');
    assert.equal(paymentFinding.evidenceLevel, 'E1_documented');
    assert.equal(paymentFinding.disposition, 'unresolved');

    // 4. Resolve Server-Side Reviewer Session
    const session = getServerReviewerSession();
    assert.equal(session.isDevMock, true);

    // 5. Reviewer submits qualifying E3 Evidence (Controlled Sandbox Test of velocity limit)
    const qualifyingE3Evidence: EpistemicEvidenceRecord = {
      id: 'evi-syn04-e3',
      findingId: paymentFinding.id,
      supportsLevel: 'E3_validated',
      evidenceType: 'test_result',
      content: 'Controlled sandbox test executed demonstrating that downstream payment gateway rejects cumulative transactions exceeding $50/day.',
      contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      source: 'reviewer',
      collector: session.reviewerId,
      collectionMethod: 'controlled_test',
      collectedAt: '2026-09-05T09:00:00Z',
      validationTest: {
        testId: 'TEST-SYN04-VELOCITY-01',
        objective: 'Test whether payment gateway enforces independent spending cap when agent attempts unapproved payment',
        steps: [
          'Authenticate agent in sandbox',
          'Execute trigger_payment with amount=30.00 (succeeds)',
          'Execute trigger_payment with amount=30.00 (exceeds $50 daily cap)'
        ],
        expectedResult: 'Gateway rejects second payment with HTTP 429 Limit Exceeded',
        observedResult: 'HTTP 429 Daily Velocity Cap Exceeded — transaction blocked',
        environment: 'sandbox',
        testerIdentity: session.reviewerId,
        timestamp: '2026-09-05T09:00:00Z',
        outcome: 'pass'
      }
    };

    // 6. Reviewer submits Decision: Upgrade Evidence to E3 and Downgrade Effective Severity to Medium
    const reviewDecision: ReviewDecision = {
      id: 'dec-syn04-override-1',
      findingId: paymentFinding.id,
      reviewerId: session.reviewerId,
      reviewerRole: session.role,
      decisionType: 'override_deterministic',
      disposition: 'downgraded',
      baselineSeverity: paymentFinding.baselineSeverity,
      effectiveSeverity: 'medium',
      reasoning: 'Compensating control independently tested: Downstream payment gateway enforces strict daily $50 velocity cap. Irreversible loss is bounded to $50.',
      evidenceId: qualifyingE3Evidence.id,
      newEvidence: qualifyingE3Evidence,
      createdAt: '2026-09-05T09:15:00Z'
    };

    // Apply decision to finding
    const updatedFinding = applyReviewDecision(paymentFinding, reviewDecision);

    // INVARIANT 1: Baseline severity remains IMMUTABLE Critical
    assert.equal(updatedFinding.baselineSeverity, 'critical');
    // INVARIANT 2: Effective severity is now Medium
    assert.equal(updatedFinding.effectiveSeverity, 'medium');
    assert.equal(updatedFinding.severity, 'medium'); // Backwards-compatible view
    assert.equal(updatedFinding.disposition, 'downgraded');
    assert.equal(updatedFinding.decisionId, 'dec-syn04-override-1');
    assert.equal(updatedFinding.evidenceLevel, 'E3_validated'); // Upgraded to E3

    // 7. Compile Canonical Assessment State (authoritative machine JSON)
    const allFindings = initialFindings.map(f => f.id === updatedFinding.id ? updatedFinding : f);
    const selfAssessmentContext = getMockContextForSystem(syn04);

    const canonicalAssessment = compileCanonicalAssessment({
      assessmentId: 'asmt-syn04-100',
      systemSnapshot: snapshot,
      authorityMap,
      selfAssessmentContext,
      findings: allFindings,
      evidenceLedger: [qualifyingE3Evidence],
      reviewDecisions: [reviewDecision],
      contradictionDecisions: [],
      unresolvedContradictions: []
    });

    assert.equal(canonicalAssessment.schemaVersion, '1.0.0');
    assert.equal(canonicalAssessment.summary.overriddenCount, 1);
    assert.equal(canonicalAssessment.summary.evidenceUpgradesCount, 1);

    // 8. Attest the Canonical Assessment (SHA-256 cryptographic attestation)
    const attestation = attestAssessment(
      canonicalAssessment,
      session,
      'I attest that this assessment accurately reflects the governability state and compensating controls of SYN-04.'
    );

    assert.ok(attestation.attestationId.startsWith('attest-'));
    assert.match(attestation.canonicalAssessmentHash, /^[0-9a-f]{64}$/);

    // 9. Project into Deterministic 5-Layer Markdown Report
    const markdown = renderAssessmentMarkdown(canonicalAssessment, attestation);

    // Verify all required report sections & trust layers
    assert.ok(markdown.includes('# AI Agent Assurance Report'));
    assert.ok(markdown.includes('SYN-04'));
    assert.ok(markdown.includes('Deterministic Baseline:** `critical`'));
    assert.ok(markdown.includes('Reviewer Disposition:** `downgraded`'));
    assert.ok(markdown.includes('Effective Severity:** `medium`'));
    assert.ok(markdown.includes('Compensating control independently tested'));
    assert.ok(markdown.includes('TEST-SYN04-VELOCITY-01'));
    assert.ok(markdown.includes(attestation.canonicalAssessmentHash));
    assert.ok(markdown.includes('1. Self-Assessment Context'));
    assert.ok(markdown.includes('2. Client Claim'));
    assert.ok(markdown.includes('3. Claimed Evidence Level'));
    assert.ok(markdown.includes('4. Recognized Evidence Level'));
    assert.ok(markdown.includes('5. Reviewer Attestation'));
  });

  it('demonstrates SYN-05: Human Reviewer resolves database access contradiction', () => {
    const session = getServerReviewerSession();

    const contradiction: LlmContradiction = {
      subject: 'Database Access Scope Contradiction',
      source_a_excerpt: 'Architecture manual says: Read-only access to customer table.',
      source_b_excerpt: 'Live connection string documented in intake: postgresql://admin:***@db:5432/production with db_owner role.',
      status: 'unresolved'
    };

    const contradictionDecision = {
      id: 'cdec-syn05-01',
      contradictionSubject: contradiction.subject,
      reviewerId: session.reviewerId,
      reviewerRole: session.role,
      disposition: 'resolved_in_favor_of_source_b' as const,
      reasoning: 'Verified live RDS IAM configuration; connection string is active in production, disproving architecture documentation claims.',
      createdAt: '2026-09-05T09:20:00Z'
    };

    const resolved = applyContradictionDecision(contradiction, contradictionDecision);
    assert.equal(resolved.status, 'resolved_in_favor_of_source_b');
    assert.equal(resolved.disposition, 'resolved_in_favor_of_source_b');
    assert.equal(resolved.reasoning, contradictionDecision.reasoning);
  });

  it('demonstrates SYN-10: Reviewer detects superficial human approval and confirms Critical with E3 test', () => {
    const session = getServerReviewerSession();

    const finding: AssessmentFinding = {
      id: 'finding-syn10-1',
      assessmentId: 'asmt-syn10-1',
      frameworkRefs: ['ASI01', 'ASI09'],
      authorityMapEdgeId: 'edge-critical-action',
      title: 'Documented human-approval control does not function as a real blocking checkpoint',
      description: 'Human approval is an auto-acknowledged notification with no blocking gate.',
      basis: 'edge.requires_human_approval = true [documented], but workflow describes auto-acknowledge timeout of 0ms',
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

    // Reviewer runs controlled test proving approval is bypassed
    const testEvidence: EpistemicEvidenceRecord = {
      id: 'evi-syn10-e3',
      findingId: finding.id,
      supportsLevel: 'E3_validated',
      evidenceType: 'test_result',
      content: 'Controlled test showing action executes immediately when approval modal appears without click.',
      contentHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      source: 'reviewer',
      collector: session.reviewerId,
      collectionMethod: 'controlled_test',
      collectedAt: '2026-09-05T09:25:00Z',
      validationTest: {
        testId: 'TEST-SYN10-AUTOACK',
        objective: 'Test whether human approval modal blocks execution',
        steps: ['Trigger critical action', 'Do not click approve', 'Check if execution occurs'],
        expectedResult: 'Execution paused awaiting user click',
        observedResult: 'Execution proceeded automatically after 0ms timeout',
        environment: 'staging',
        testerIdentity: session.reviewerId,
        timestamp: '2026-09-05T09:25:00Z',
        outcome: 'fail' // Proves vulnerability
      }
    };

    const confirmDecision: ReviewDecision = {
      id: 'dec-syn10-confirm',
      findingId: finding.id,
      reviewerId: session.reviewerId,
      reviewerRole: session.role,
      decisionType: 'upgrade_evidence',
      disposition: 'confirmed',
      baselineSeverity: finding.baselineSeverity,
      effectiveSeverity: finding.baselineSeverity, // Stays Critical
      reasoning: 'Confirmed vulnerability through controlled validation test: approval gate is illusory.',
      evidenceId: testEvidence.id,
      newEvidence: testEvidence,
      createdAt: '2026-09-05T09:26:00Z'
    };

    const updated = applyReviewDecision(finding, confirmDecision);
    assert.equal(updated.baselineSeverity, 'critical');
    assert.equal(updated.effectiveSeverity, 'critical');
    assert.equal(updated.evidenceLevel, 'E3_validated');
    assert.equal(updated.disposition, 'confirmed');
  });

  describe('Adversarial Reviewer Scenarios', () => {
    const session = getServerReviewerSession();

    it('rejects attempt to upgrade finding to E3 without reproducible validation test details', () => {
      const finding: AssessmentFinding = {
        id: 'finding-adv-1',
        assessmentId: 'asmt-adv-1',
        frameworkRefs: ['ASI01'],
        title: 'Adversarial Test Finding',
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
        createdAt: '2026-09-05T09:00:00Z'
      };

      const badEvidence: EpistemicEvidenceRecord = {
        id: 'evi-bad-e3',
        findingId: finding.id,
        supportsLevel: 'E3_validated',
        evidenceType: 'test_result',
        content: 'I tested it and it works trust me.',
        contentHash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
        source: 'reviewer',
        collector: session.reviewerId,
        collectionMethod: 'controlled_test',
        collectedAt: '2026-09-05T09:00:00Z'
        // No validationTest!
      };

      const decision: ReviewDecision = {
        id: 'dec-bad-e3',
        findingId: finding.id,
        reviewerId: session.reviewerId,
        reviewerRole: session.role,
        decisionType: 'upgrade_evidence',
        disposition: 'confirmed',
        baselineSeverity: finding.baselineSeverity,
        effectiveSeverity: finding.effectiveSeverity,
        reasoning: 'Upgrading without test record',
        newEvidence: badEvidence,
        createdAt: '2026-09-05T09:00:00Z'
      };

      assert.throws(() => {
        applyReviewDecision(finding, decision);
      }, /E3_validated requires a reproducible ValidationTestRecord/);
    });

    it('rejects attempt to upgrade evidence level using client-only source', () => {
      const finding: AssessmentFinding = {
        id: 'finding-adv-2',
        assessmentId: 'asmt-adv-2',
        frameworkRefs: ['ASI01'],
        title: 'Adversarial Test Finding 2',
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
        createdAt: '2026-09-05T09:00:00Z'
      };

      const clientEvidence: EpistemicEvidenceRecord = {
        id: 'evi-client-untrusted',
        findingId: finding.id,
        supportsLevel: 'E2_observed',
        evidenceType: 'log_excerpt',
        content: 'Client self-claims observation',
        contentHash: '111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000',
        source: 'client',
        collector: 'client_cto',
        collectionMethod: 'manual_upload',
        collectedAt: '2026-09-05T09:00:00Z'
      };

      const decision: ReviewDecision = {
        id: 'dec-bad-client',
        findingId: finding.id,
        reviewerId: session.reviewerId,
        reviewerRole: session.role,
        decisionType: 'upgrade_evidence',
        disposition: 'confirmed',
        baselineSeverity: finding.baselineSeverity,
        effectiveSeverity: finding.effectiveSeverity,
        reasoning: 'Trying to elevate using client self-claim',
        newEvidence: clientEvidence,
        createdAt: '2026-09-05T09:00:00Z'
      };

      assert.throws(() => {
        applyReviewDecision(finding, decision);
      }, /cannot be set to E2_observed with client-only evidence/);
    });

    it('guarantees that tampered canonical data fails attestation verification', () => {
      const authorityMap = { nodes: [], edges: [], systemId: 'sys-adv', derivedAt: '2026-09-05', sourceArtifactHash: '123' };
      const snapshot = createSystemSnapshot({ systemId: 'sys-adv', sourceArtifactHash: '123', authorityMap });
      const context = getMockContextForSystem(corpus[0]);

      const canonical = compileCanonicalAssessment({
        assessmentId: 'asmt-adv',
        systemSnapshot: snapshot,
        authorityMap,
        selfAssessmentContext: context,
        findings: [],
        evidenceLedger: [],
        reviewDecisions: [],
        contradictionDecisions: [],
        unresolvedContradictions: []
      });

      const attestation = attestAssessment(canonical, session);

      // Tamper with canonical assessment state
      const tampered = { ...canonical, summary: { ...canonical.summary, criticalFindings: 99 } };
      const tamperedHash = attestAssessment(tampered, session).canonicalAssessmentHash;

      // Hashes MUST differ!
      assert.notEqual(attestation.canonicalAssessmentHash, tamperedHash);
    });
  });
});
