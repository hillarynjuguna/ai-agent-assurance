/**
 * Phase 7 Test Suite: Authority Path Evaluation, Control Semantics, 
 * Temporal Constraints, and Path-Aware Provenance
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'crypto';

import {
  findSecurityRelevantPaths,
  createPathReference,
  TRAVERSAL_ALGORITHM_VERSION,
  evaluateEdgeLevelRules,
  evaluatePathLevelRules,
  evaluateControlSemanticsRules,
  evaluateTemporalRules,
  executeFullAuthorityEvaluation,
  executeDeterministicRules,
  generateAssessmentFindings,
  createSystemSnapshot,
  getServerReviewerSession,
  applyReviewDecision,
  compileCanonicalAssessment,
  canonicalizeJson,
  attestAssessment,
  renderAssessmentMarkdown,
  type AuthorityMapEdgeInput,
  type AuthorityMapNodeInput,
  type SeededAuthorityMap,
  type EpistemicEvidenceRecord,
  type ReviewDecision
} from '../src/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf-8'));
}

describe('Phase 7: Authority Path Evaluation & Generalized Rules', () => {

  // ============================================================
  // SECTION 1: Path Traversal Engine & Cycle Protection
  // ============================================================
  describe('1. Bounded-Depth Traversal & Cycle Protection', () => {
    it('traverses multi-hop path and computes deterministic pathHash', () => {
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-ext-user', nodeType: 'external_agent', name: 'External Client', metadata: { trust_boundary: 'external' } },
        { id: 'node-agent', nodeType: 'agent', name: 'Core Agent', metadata: { trust_boundary: 'internal' } },
        { id: 'node-tool', nodeType: 'tool', name: 'Query Tool', metadata: { trust_boundary: 'internal' } },
        { id: 'node-egress-api', nodeType: 'api', name: 'External Partner API', metadata: { trust_boundary: 'external' } }
      ];

      const edges: AuthorityMapEdgeInput[] = [
        { id: 'e1', sourceNodeId: 'node-ext-user', targetNodeId: 'node-agent', edgeType: 'calls', requiresHumanApproval: false, trustBoundary: 'external', permissionScope: 'agent:invoke', dataFlow: 'ingress' },
        { id: 'e2', sourceNodeId: 'node-agent', targetNodeId: 'node-tool', edgeType: 'calls', requiresHumanApproval: false, trustBoundary: 'internal', permissionScope: 'tool:query' },
        { id: 'e3', sourceNodeId: 'node-tool', targetNodeId: 'node-egress-api', edgeType: 'calls', requiresHumanApproval: false, trustBoundary: 'external', permissionScope: 'api:post', dataFlow: 'egress', actionReversibility: 'irreversible' }
      ];

      const paths = findSecurityRelevantPaths(edges, nodes);
      assert.ok(paths.length >= 1, 'Must find at least 1 security-relevant path');

      const fullPath = paths.find(p => p.hopCount === 3);
      assert.ok(fullPath, 'Must discover 3-hop complete path');
      assert.equal(fullPath!.startNodeId, 'node-ext-user');
      assert.equal(fullPath!.terminalNodeId, 'node-egress-api');
      assert.equal(fullPath!.hasUntrustedIngress, true);
      assert.equal(fullPath!.hasExternalEgress, true);
      assert.equal(fullPath!.hasIrreversibleAction, true);

      const ref = createPathReference(fullPath!);
      assert.ok(ref.pathHash.length === 64);
      assert.equal(ref.algorithmVersion, TRAVERSAL_ALGORITHM_VERSION);
      assert.deepEqual(ref.nodeIds, ['node-ext-user', 'node-agent', 'node-tool', 'node-egress-api']);
    });

    it('safely handles circular graphs without infinite recursion', () => {
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-ext-ingress', nodeType: 'data_source', name: 'Ingress', metadata: { trust_boundary: 'external' } },
        { id: 'node-a', nodeType: 'agent', name: 'Agent A', metadata: { trust_boundary: 'internal' } },
        { id: 'node-b', nodeType: 'agent', name: 'Agent B', metadata: { trust_boundary: 'internal' } },
        { id: 'node-sink', nodeType: 'api', name: 'Sink API', metadata: { trust_boundary: 'external' } }
      ];

      // Circular loop: Ingress -> A -> B -> A, plus B -> Sink
      const edges: AuthorityMapEdgeInput[] = [
        { id: 'e-in', sourceNodeId: 'node-ext-ingress', targetNodeId: 'node-a', edgeType: 'reads', requiresHumanApproval: false, trustBoundary: 'external', permissionScope: 'read', dataFlow: 'ingress' },
        { id: 'e-ab', sourceNodeId: 'node-a', targetNodeId: 'node-b', edgeType: 'delegates_to', requiresHumanApproval: false, trustBoundary: 'internal', permissionScope: 'delegate' },
        { id: 'e-ba', sourceNodeId: 'node-b', targetNodeId: 'node-a', edgeType: 'delegates_to', requiresHumanApproval: false, trustBoundary: 'internal', permissionScope: 'loopback' },
        { id: 'e-out', sourceNodeId: 'node-b', targetNodeId: 'node-sink', edgeType: 'calls', requiresHumanApproval: false, trustBoundary: 'external', permissionScope: 'write', actionReversibility: 'irreversible', dataFlow: 'egress' }
      ];

      // Must complete rapidly and not hang or throw RangeError: Maximum call stack size exceeded
      const paths = findSecurityRelevantPaths(edges, nodes, { maxDepth: 6 });
      assert.ok(Array.isArray(paths));
      assert.ok(paths.length > 0);
    });
  });

  // ============================================================
  // SECTION 2: Rule 5 (Composed Authority Path Violation)
  // ============================================================
  describe('2. Rule 5: Composed Authority Path Violation (SYN-11 vs SYN-11-safe)', () => {
    it('SYN-11: Detects composed uncontained exfiltration path (Email -> Agent -> CRM -> SendGrid)', () => {
      const fixture = loadFixture('syn-11-composed-exfiltration.json');
      const findings = evaluatePathLevelRules(fixture.edges, fixture.nodes);

      assert.ok(findings.length >= 1, 'Rule 5 must detect ungated composed path');
      const rule5Finding = findings[0];

      assert.deepEqual(rule5Finding.frameworkRefs, ['ASI02', 'ASI08']);
      assert.equal(rule5Finding.severity, 'critical'); // Irreversible outbound SendGrid call
      assert.equal(rule5Finding.evidenceLevel, 'E1_documented');
      assert.ok(rule5Finding.pathReference, 'Must attach structured PathReference');
      assert.equal(rule5Finding.pathReference!.nodeIds.length, 3); // node-inbound-email -> node-agent -> node-sendgrid-api (or crm)

      // Epistemic state: generate findings
      const assessmentFindings = generateAssessmentFindings(findings, 'asmt-syn11');
      assert.equal(assessmentFindings[0].findingStage, 'candidate');
      assert.equal(assessmentFindings[0].baselineSeverity, 'critical');
      assert.equal(assessmentFindings[0].effectiveSeverity, 'critical');
    });

    it('SYN-11-safe (Negative Control): Produces 0 findings when sanitization and approval gates are enforced', () => {
      const fixture = loadFixture('syn-11-safe.json');
      const findings = evaluatePathLevelRules(fixture.edges, fixture.nodes);

      // FALSE POSITIVE PREVENTION TEST
      assert.equal(findings.length, 0, 'Rule 5 must NOT fire when pre-execution sanitization and fail-closed approval are present');
    });
  });

  // ============================================================
  // SECTION 3: Rule 6 (Control Semantics Deficiency)
  // ============================================================
  describe('3. Rule 6: Control Semantics Deficiency (SYN-12 vs SYN-12-safe)', () => {
    it('SYN-12: Flags nominal approval control that fails open (timeout_ms=0, default_action=allow)', () => {
      const fixture = loadFixture('syn-12-fail-open-webhook.json');
      const findings = evaluateControlSemanticsRules(fixture.edges, fixture.nodes);

      assert.equal(findings.length, 1, 'Rule 6 must flag fail-open control');
      const f = findings[0];
      assert.deepEqual(f.frameworkRefs, ['ASI01', 'ASI08']);
      assert.equal(f.severity, 'high');
      assert.equal(f.evidenceLevel, 'E1_documented');
      assert.ok(f.basis.includes("fail_mode='fail_open'"));
    });

    it('SYN-12-safe (Negative Control): Produces 0 findings on hardened fail-closed approval control', () => {
      const fixture = loadFixture('syn-12-safe.json');
      const findings = evaluateControlSemanticsRules(fixture.edges, fixture.nodes);

      // FALSE POSITIVE PREVENTION TEST
      assert.equal(findings.length, 0, 'Rule 6 must NOT fire on enforced fail-closed controls');
    });
  });

  // ============================================================
  // SECTION 4: Rule 7 (Temporal Constraints Deficiency)
  // ============================================================
  describe('4. Rule 7: Temporal Control Deficiency (SYN-13 vs SYN-13-safe)', () => {
    it('SYN-13: Flags static scalar limit lacking time-window or cumulative rate constraint', () => {
      const fixture = loadFixture('syn-13-temporal-split.json');
      const findings = evaluateTemporalRules(fixture.edges, fixture.nodes);

      assert.equal(findings.length, 1, 'Rule 7 must flag missing temporal window');
      const f = findings[0];
      assert.deepEqual(f.frameworkRefs, ['ASI01', 'ASI08']);
      assert.equal(f.severity, 'high');
      assert.equal(f.evidenceLevel, 'E1_documented');
      assert.ok(f.basis.includes('temporal_enforcement=false'));
    });

    it('SYN-13-safe (Negative Control): Produces 0 findings when cumulative temporal cap ($50 / 24h) is enforced', () => {
      const fixture = loadFixture('syn-13-safe.json');
      const findings = evaluateTemporalRules(fixture.edges, fixture.nodes);

      // FALSE POSITIVE PREVENTION TEST
      assert.equal(findings.length, 0, 'Rule 7 must NOT fire on properly configured temporal volume limits');
    });
  });

  // ============================================================
  // SECTION 5: Full 4-Layer Authority Evaluation Orchestration
  // ============================================================
  describe('5. Full 4-Layer Authority Evaluation', () => {
    it('evaluates all 4 layers (Edge, Path, Control, Temporal) and aggregates structured counts', () => {
      // Create system with edge, path, control, and temporal issues simultaneously
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-ext-user', nodeType: 'data_source', name: 'External Webhook Input', metadata: { trust_boundary: 'external' } },
        { id: 'node-agent', nodeType: 'agent', name: 'Ops Agent', metadata: { trust_boundary: 'internal' } },
        { id: 'node-stripe', nodeType: 'api', name: 'Stripe API', metadata: { trust_boundary: 'external' } }
      ];

      const edges: AuthorityMapEdgeInput[] = [
        {
          id: 'edge-in',
          sourceNodeId: 'node-ext-user',
          targetNodeId: 'node-agent',
          edgeType: 'reads',
          actionReversibility: 'reversible',
          requiresHumanApproval: false,
          trustBoundary: 'external',
          permissionScope: 'webhook:read',
          dataFlow: 'ingress'
        },
        {
          id: 'edge-out-stripe',
          sourceNodeId: 'node-agent',
          targetNodeId: 'node-stripe',
          edgeType: 'calls',
          actionReversibility: 'irreversible',
          requiresHumanApproval: false, // Triggers Rule 1 (Edge)
          trustBoundary: 'external',    // Triggers Rule 4 (Edge)
          permissionScope: 'refund:execute_under_50', // Triggers Rule 7 (Temporal)
          dataFlow: 'egress',           // Triggers Rule 5 (Path)
          controlSemantics: {           // Triggers Rule 6 (Control)
            controlId: 'ctrl-stripe-gate',
            controlPresent: true,
            controlEnforced: false,
            executionPoint: 'post_execution',
            failMode: 'fail_open',
            defaultAction: 'allow'
          }
        }
      ];

      const result = executeFullAuthorityEvaluation(edges, nodes);

      assert.equal(result.rulesEvaluatedCount, 7);
      assert.ok(result.layersEvaluated);
      assert.ok(result.layersEvaluated.edgeLevel >= 2); // Rule 1 + Rule 4
      assert.ok(result.layersEvaluated.pathLevel >= 1); // Rule 5
      assert.ok(result.layersEvaluated.controlSemantics >= 1); // Rule 6
      assert.ok(result.layersEvaluated.temporal >= 1); // Rule 7
      assert.equal(result.findingsCount, result.findings.length);
    });
  });

  // ============================================================
  // SECTION 6: Path Provenance Reconstruction & Attestation
  // ============================================================
  describe('6. Path Provenance Reconstruction & Attestation Invariants', () => {
    it('reconstructs path deterministically from SystemSnapshot authority map', () => {
      const fixture = loadFixture('syn-11-composed-exfiltration.json');
      const authorityMap: SeededAuthorityMap = {
        systemId: fixture.systemId,
        derivedAt: fixture.capturedAt,
        sourceArtifactHash: 'sha256-syn11-test',
        nodes: fixture.nodes,
        edges: fixture.edges
      };

      const snapshot = createSystemSnapshot({
        systemId: fixture.systemId,
        sourceArtifactHash: authorityMap.sourceArtifactHash,
        authorityMap
      });

      // Execute Path Rules
      const pathFindings = evaluatePathLevelRules(snapshot.authorityMap.edges, snapshot.authorityMap.nodes);
      assert.ok(pathFindings.length > 0);
      const finding = pathFindings[0];
      const pathRef = finding.pathReference!;

      // RECONSTRUCTION AUDIT:
      // Can an offline reviewer reconstruct the exact path using only snapshot.authorityMap and pathRef?
      const recomputedPaths = findSecurityRelevantPaths(snapshot.authorityMap.edges, snapshot.authorityMap.nodes);
      const matchedPath = recomputedPaths.find(p => p.id === pathRef.pathId);

      assert.ok(matchedPath, 'Must locate exact path in snapshot');
      const recomputedRef = createPathReference(matchedPath!);
      assert.equal(recomputedRef.pathHash, pathRef.pathHash);
      assert.deepEqual(recomputedRef.nodeIds, pathRef.nodeIds);
      assert.deepEqual(recomputedRef.edgeIds, pathRef.edgeIds);
    });

    it('attests CanonicalAssessment with path-derived findings and invalidates on tampering', () => {
      const fixture = loadFixture('syn-11-composed-exfiltration.json');
      const authorityMap: SeededAuthorityMap = {
        systemId: fixture.systemId,
        derivedAt: fixture.capturedAt,
        sourceArtifactHash: 'sha256-syn11-test',
        nodes: fixture.nodes,
        edges: fixture.edges
      };

      const snapshot = createSystemSnapshot({
        systemId: fixture.systemId,
        sourceArtifactHash: authorityMap.sourceArtifactHash,
        authorityMap
      });

      const session = getServerReviewerSession();
      const rawFindings = evaluatePathLevelRules(fixture.edges, fixture.nodes);
      const findings = generateAssessmentFindings(rawFindings, 'asmt-syn11-001');

      const canonical = compileCanonicalAssessment({
        assessmentId: 'asmt-syn11-001',
        systemSnapshot: snapshot,
        authorityMap,
        selfAssessmentContext: {
          schemaVersion: '6.1.0',
          generatedAt: fixture.capturedAt,
          importedAt: '2026-09-12T12:00:00Z',
          sourceArtifactHash: authorityMap.sourceArtifactHash,
          metadata: { company: 'QuickMerch', assessor: 'Assessor', confidence: 'high', date: '2026-09-12', valid: '2026-12-12', criticality: 'operational', audience: 'general' },
          diligenceMatrix: { capabilityScore: 50, assuranceScore: 40, quadrant: 'risk', maxCapabilityScore: 84, maxAssuranceScore: 112, totalWeight: 28 },
          narrative: { confidenceStatement: 'Test', priorityGaps: 'None', relianceRecommendation: 'NO RELIANCE', relianceRationale: 'Test', reassessmentTriggers: 'None' },
          floorRulesTriggered: [],
          regulatoryMapping: {},
          dimensionScores: []
        },
        findings,
        evidenceLedger: [],
        reviewDecisions: [],
        contradictionDecisions: [],
        unresolvedContradictions: [],
        compiledAt: '2026-09-12T12:30:00Z'
      });

      const attestation = attestAssessment(canonical, session, 'Phase 7 Attestation');
      assert.ok(attestation.canonicalAssessmentHash);

      // Markdown projection check
      const markdown = renderAssessmentMarkdown(canonical, attestation);
      assert.ok(markdown.includes('Authority Path Reference:'));
      assert.ok(markdown.includes('Finding Stage:** `candidate`'));

      // Tamper Check: Tampering with a node in the path sequence invalidates the attestation hash
      const tampered = {
        ...canonical,
        findings: [
          {
            ...canonical.findings[0],
            pathReference: {
              ...canonical.findings[0].pathReference!,
              nodeIds: ['node-inbound-email', 'node-agent', 'node-TAMPERED']
            }
          }
        ]
      };

      const tamperedHash = createHash('sha256').update(canonicalizeJson(tampered)).digest('hex');
      assert.notEqual(tamperedHash, attestation.canonicalAssessmentHash);
    });
  });

  // ============================================================
  // SECTION 7: Preserving "Path Exists" vs "Path Is Exploitable"
  // ============================================================
  describe('7. Epistemic Candidate Gating & Telemetry Upgrades', () => {
    it('gating invariant: graph-derived path findings start as candidate at E1_documented', () => {
      const fixture = loadFixture('syn-11-composed-exfiltration.json');
      const rawFindings = evaluatePathLevelRules(fixture.edges, fixture.nodes);
      const findings = generateAssessmentFindings(rawFindings, 'asmt-gating-1');

      for (const f of findings) {
        assert.equal(f.findingStage, 'candidate');
        assert.equal(f.evidenceLevel, 'E1_documented');
        assert.equal(f.disposition, 'unresolved');
      }
    });

    it('requires observed telemetry evidence to upgrade finding to E2_observed', () => {
      const fixture = loadFixture('syn-11-composed-exfiltration.json');
      const rawFindings = evaluatePathLevelRules(fixture.edges, fixture.nodes);
      const finding = generateAssessmentFindings(rawFindings, 'asmt-gating-2')[0];

      const session = getServerReviewerSession();

      const telemetryEvidence: EpistemicEvidenceRecord = {
        id: 'evi-telemetry-exfil',
        findingId: finding.id,
        supportsLevel: 'E2_observed',
        evidenceType: 'log_excerpt',
        content: 'Observed automated exfiltration of customer record in logs',
        contentHash: createHash('sha256').update('exfil-log').digest('hex'),
        source: 'system',
        collector: 'cloudwatch',
        collectionMethod: 'automated_telemetry',
        collectedAt: '2026-09-12T12:45:00Z'
      };

      const decision: ReviewDecision = {
        id: 'dec-promote-path',
        findingId: finding.id,
        reviewerId: session.reviewerId,
        reviewerRole: session.role,
        decisionType: 'upgrade_evidence',
        disposition: 'confirmed',
        baselineSeverity: finding.baselineSeverity,
        effectiveSeverity: finding.baselineSeverity,
        reasoning: 'Confirmed via observed runtime telemetry logs that email injection altered CRM record and triggered outbound dispatch.',
        evidenceId: telemetryEvidence.id,
        newEvidence: telemetryEvidence,
        createdAt: '2026-09-12T13:00:00Z'
      };

      const updated = applyReviewDecision(finding, decision);
      assert.equal(updated.evidenceLevel, 'E2_observed');
      assert.equal(updated.baselineSeverity, finding.baselineSeverity); // Immutable baseline
      assert.equal(updated.disposition, 'confirmed');
    });
  });
});
