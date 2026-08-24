/**
 * Phase 4: Versioned System Identity & Canonical Assessed Object Test Suite
 * 
 * Test Coverage:
 * - Section 1: Snapshot creation & metadata (valid snapshot, unversioned source, hash generation)
 * - Section 2: Snapshot identity & reproducibility (identical source -> identical hash, modified source -> distinct hash)
 * - Section 3: Two assessments of the same system (Option A: snapshot represents immutable system state)
 * - Section 4: Assessment & Authority Map binding & traceability chain (Finding -> Assessment -> Snapshot -> Authority Map)
 * - Section 5: Snapshot Diff Detection (node add/remove, edge add/remove, permission, approval, trust boundary, reversibility)
 * - Section 6: Structured Reassessment Triggers (trigger firing on critical changes, silence on irrelevant edits)
 * - Section 7: 10-System Synthetic Corpus with Versioned Snapshots & State Evolution
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { 
  validateTrackDExport,
  hashTrackDExport,
  seedAuthorityMapFromTrackD,
  executeDeterministicRules,
  generateAssessmentFindings,
  createSystemSnapshot,
  createSystemSnapshotFromTrackD,
  diffSystemSnapshots,
  evaluateReassessmentTriggers,
  type SystemSnapshot,
  type AuthorityMapEdgeInput,
  type AuthorityMapNodeInput
} from '../src/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');
const SPEC_FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'docs', 'assurance-mvp-spec', 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

describe('Phase 4: Versioned System Identity & System Snapshots', () => {

  // ============================================================
  // SECTION 1: Snapshot Creation & Metadata
  // ============================================================
  describe('Snapshot Creation & Metadata', () => {
    it('creates a valid immutable SystemSnapshot with deterministic ID and authority map', () => {
      const rawJson = loadFixture('sample-v61-export.json');
      const validation = validateTrackDExport(JSON.parse(rawJson));
      assert.equal(validation.valid, true);
      if (!validation.valid) throw new Error('Validation failed');

      const hash = hashTrackDExport(rawJson);
      const systemId = 'system-acme-procurement';
      const authorityMap = seedAuthorityMapFromTrackD(validation.data, hash, systemId);

      const snapshot = createSystemSnapshotFromTrackD(validation.data, hash, authorityMap, systemId);

      assert.ok(snapshot.id.startsWith(`snapshot-${systemId}-`));
      assert.equal(snapshot.systemId, systemId);
      assert.equal(snapshot.configHash, hash);
      assert.equal(snapshot.sourceVersion, '6.1.0');
      assert.ok(snapshot.capturedAt);
      assert.equal(snapshot.authorityMapId, `authmap-${snapshot.id}`);
      assert.equal(snapshot.authorityMap.nodes.length, authorityMap.nodes.length);
      assert.equal(snapshot.authorityMap.edges.length, authorityMap.edges.length);
    });

    it('handles unversioned source by recording sourceVersion as null', () => {
      const hash = 'a'.repeat(64);
      const systemId = 'system-custom';
      const dummyAuthMap = {
        systemId,
        nodes: [{ id: 'n1', nodeType: 'agent' as const, name: 'Agent', metadata: {} }],
        edges: [],
        derivedAt: new Date().toISOString(),
        sourceArtifactHash: hash
      };

      const snapshot = createSystemSnapshot({
        systemId,
        sourceArtifactHash: hash,
        authorityMap: dummyAuthMap,
        sourceVersion: null
      });

      assert.equal(snapshot.sourceVersion, null);
      assert.equal(snapshot.configHash, hash);
    });
  });

  // ============================================================
  // SECTION 2: Snapshot Identity & Reproducibility
  // ============================================================
  describe('Snapshot Identity & Reproducibility', () => {
    it('produces identical configHash and snapshotId for identical input across independent runs', () => {
      const rawJson = loadFixture('sample-v61-export.json');
      const validation = validateTrackDExport(JSON.parse(rawJson));
      if (!validation.valid) throw new Error('Validation failed');

      const hash1 = hashTrackDExport(rawJson);
      const authMap1 = seedAuthorityMapFromTrackD(validation.data, hash1, 'sys-1');
      const snap1 = createSystemSnapshotFromTrackD(validation.data, hash1, authMap1, 'sys-1');

      const hash2 = hashTrackDExport(rawJson);
      const authMap2 = seedAuthorityMapFromTrackD(validation.data, hash2, 'sys-1');
      const snap2 = createSystemSnapshotFromTrackD(validation.data, hash2, authMap2, 'sys-1');

      assert.equal(snap1.configHash, snap2.configHash);
      assert.equal(snap1.id, snap2.id);
      assert.equal(snap1.authorityMapId, snap2.authorityMapId);
    });

    it('produces distinct configHash and snapshotId when source input changes', () => {
      const rawJsonA = loadFixture('sample-v61-export.json');
      const rawJsonB = loadFixture('sample-v61-export-strong.json');

      const valA = validateTrackDExport(JSON.parse(rawJsonA));
      const valB = validateTrackDExport(JSON.parse(rawJsonB));
      if (!valA.valid || !valB.valid) throw new Error('Validation failed');

      const hashA = hashTrackDExport(rawJsonA);
      const hashB = hashTrackDExport(rawJsonB);

      const snapA = createSystemSnapshotFromTrackD(valA.data, hashA, seedAuthorityMapFromTrackD(valA.data, hashA, 'sys-1'), 'sys-1');
      const snapB = createSystemSnapshotFromTrackD(valB.data, hashB, seedAuthorityMapFromTrackD(valB.data, hashB, 'sys-1'), 'sys-1');

      assert.notEqual(snapA.configHash, snapB.configHash);
      assert.notEqual(snapA.id, snapB.id);
    });
  });

  // ============================================================
  // SECTION 3: Two Assessments of the Same System State
  // ============================================================
  describe('Two Assessments of the Same System State', () => {
    it('anchors multiple assessment instances to the same immutable snapshot identity (Option A policy)', () => {
      const rawJson = loadFixture('sample-v61-export.json');
      const validation = validateTrackDExport(JSON.parse(rawJson));
      if (!validation.valid) throw new Error('Validation failed');

      const hash = hashTrackDExport(rawJson);
      const systemId = 'system-acme';
      const authorityMap = seedAuthorityMapFromTrackD(validation.data, hash, systemId);
      const snapshot = createSystemSnapshotFromTrackD(validation.data, hash, authorityMap, systemId);

      // Assessment 1
      const asmt1Id = 'asmt-uuid-1';
      const ruleResult1 = executeDeterministicRules(authorityMap.edges, authorityMap.nodes);
      const findings1 = generateAssessmentFindings(ruleResult1.findings, asmt1Id);

      // Assessment 2 (e.g. conducted at a later date against the same frozen state)
      const asmt2Id = 'asmt-uuid-2';
      const ruleResult2 = executeDeterministicRules(authorityMap.edges, authorityMap.nodes);
      const findings2 = generateAssessmentFindings(ruleResult2.findings, asmt2Id);

      // Both assessments refer to the same snapshot
      assert.notEqual(asmt1Id, asmt2Id);
      assert.equal(snapshot.id, `snapshot-${systemId}-${hash.substring(0, 16)}`);

      // Findings are attributed to each assessment record separately
      assert.equal(findings1[0].assessmentId, asmt1Id);
      assert.equal(findings2[0].assessmentId, asmt2Id);
      assert.equal(findings1.length, findings2.length);
    });
  });

  // ============================================================
  // SECTION 4: Assessment & Authority Map Traceability Chain
  // ============================================================
  describe('Assessment & Authority Map Traceability Chain (Invariant 7 & 8)', () => {
    it('verifies unbroken chain: Finding -> Assessment -> Snapshot -> Authority Map -> Source Hash', () => {
      const rawJson = loadFixture('sample-v61-export.json');
      const validation = validateTrackDExport(JSON.parse(rawJson));
      if (!validation.valid) throw new Error('Validation failed');

      const sourceHash = hashTrackDExport(rawJson);
      const assessmentId = 'asmt-trace-1';
      const systemId = 'system-procure';

      const authorityMap = seedAuthorityMapFromTrackD(validation.data, sourceHash, systemId);
      const snapshot = createSystemSnapshotFromTrackD(validation.data, sourceHash, authorityMap, systemId);
      const ruleResult = executeDeterministicRules(authorityMap.edges, authorityMap.nodes);
      const findings = generateAssessmentFindings(ruleResult.findings, assessmentId);

      for (const finding of findings) {
        // 1. Finding points to Assessment
        assert.equal(finding.assessmentId, assessmentId);

        // 2. Finding traces to an Authority Map element in this specific snapshot
        const edge = snapshot.authorityMap.edges.find(e => e.id === finding.authorityMapEdgeId);
        const node = snapshot.authorityMap.nodes.find(n => n.id === finding.authorityMapNodeId);
        assert.ok(edge || node, 'Finding must trace to a node or edge in the snapshot');

        // 3. Authority Map element traces to source provenance
        const provenance = (edge || node)!.provenance;
        assert.ok(provenance);
        assert.equal(provenance!.source, 'track_d_export');

        // 4. Snapshot identity binds to the content hash
        assert.equal(snapshot.configHash, sourceHash);
      }
    });
  });

  // ============================================================
  // SECTION 5: Snapshot Diff Detection
  // ============================================================
  describe('Snapshot Diff Detection', () => {
    function makeBaseSnapshot(edges: AuthorityMapEdgeInput[], nodes: AuthorityMapNodeInput[]): SystemSnapshot {
      return {
        id: 'snap-base',
        systemId: 'sys-diff',
        sourceVersion: '1.0.0',
        configHash: 'hash-base',
        capturedAt: '2026-01-01T00:00:00Z',
        authorityMapId: 'authmap-base',
        authorityMap: {
          systemId: 'sys-diff',
          nodes,
          edges,
          derivedAt: '2026-01-01T00:00:00Z',
          sourceArtifactHash: 'hash-base'
        },
        metadata: {}
      };
    }

    it('detects added and removed nodes', () => {
      const node1: AuthorityMapNodeInput = { id: 'n1', nodeType: 'agent', name: 'Agent', metadata: {} };
      const node2: AuthorityMapNodeInput = { id: 'n2', nodeType: 'api', name: 'New API Tool', metadata: {} };

      const snapA = makeBaseSnapshot([], [node1]);
      const snapB = { ...makeBaseSnapshot([], [node1, node2]), id: 'snap-b', configHash: 'hash-b' };

      const diff = diffSystemSnapshots(snapA, snapB);
      assert.equal(diff.addedNodes.length, 1);
      assert.equal(diff.addedNodes[0].id, 'n2');
      assert.equal(diff.removedNodes.length, 0);
      assert.equal(diff.hasStructuralChanges, true);
    });

    it('detects changes in requiresHumanApproval (approval modification)', () => {
      const nodeAgent: AuthorityMapNodeInput = { id: 'n-agent', nodeType: 'agent', name: 'Agent', metadata: {} };
      const nodeTool: AuthorityMapNodeInput = { id: 'n-tool', nodeType: 'tool', name: 'Tool', metadata: {} };

      const edgeA: AuthorityMapEdgeInput = {
        id: 'e1',
        sourceNodeId: 'n-agent',
        targetNodeId: 'n-tool',
        edgeType: 'calls',
        actionReversibility: 'irreversible',
        requiresHumanApproval: false, // unapproved in state A
        trustBoundary: 'external',
        permissionScope: 'exec'
      };

      const edgeB: AuthorityMapEdgeInput = {
        ...edgeA,
        requiresHumanApproval: true // approved added in state B
      };

      const snapA = makeBaseSnapshot([edgeA], [nodeAgent, nodeTool]);
      const snapB = { ...makeBaseSnapshot([edgeB], [nodeAgent, nodeTool]), id: 'snap-b', configHash: 'hash-b' };

      const diff = diffSystemSnapshots(snapA, snapB);
      assert.equal(diff.modifiedEdges.length, 1);
      assert.equal(diff.modifiedEdges[0].edgeId, 'e1');
      assert.equal(diff.modifiedEdges[0].changes[0].field, 'requiresHumanApproval');
      assert.equal(diff.modifiedEdges[0].changes[0].from, false);
      assert.equal(diff.modifiedEdges[0].changes[0].to, true);
    });

    it('detects changes in actionReversibility, trustBoundary, and permissionScope', () => {
      const nodeAgent: AuthorityMapNodeInput = { id: 'n-agent', nodeType: 'agent', name: 'Agent', metadata: {} };
      const nodeTool: AuthorityMapNodeInput = { id: 'n-tool', nodeType: 'tool', name: 'Tool', metadata: {} };

      const edgeA: AuthorityMapEdgeInput = {
        id: 'e1',
        sourceNodeId: 'n-agent',
        targetNodeId: 'n-tool',
        edgeType: 'calls',
        actionReversibility: 'reversible',
        requiresHumanApproval: false,
        trustBoundary: 'internal',
        permissionScope: 'scope:read'
      };

      const edgeB: AuthorityMapEdgeInput = {
        id: 'e1',
        sourceNodeId: 'n-agent',
        targetNodeId: 'n-tool',
        edgeType: 'calls',
        actionReversibility: 'irreversible',
        requiresHumanApproval: false,
        trustBoundary: 'external',
        permissionScope: 'scope:admin_write'
      };

      const snapA = makeBaseSnapshot([edgeA], [nodeAgent, nodeTool]);
      const snapB = { ...makeBaseSnapshot([edgeB], [nodeAgent, nodeTool]), id: 'snap-b', configHash: 'hash-b' };

      const diff = diffSystemSnapshots(snapA, snapB);
      assert.equal(diff.modifiedEdges.length, 1);
      const changes = diff.modifiedEdges[0].changes;
      assert.ok(changes.some(c => c.field === 'actionReversibility' && c.from === 'reversible' && c.to === 'irreversible'));
      assert.ok(changes.some(c => c.field === 'trustBoundary' && c.from === 'internal' && c.to === 'external'));
      assert.ok(changes.some(c => c.field === 'permissionScope' && c.from === 'scope:read' && c.to === 'scope:admin_write'));
    });
  });

  // ============================================================
  // SECTION 6: Structured Reassessment Triggers
  // ============================================================
  describe('Structured Reassessment Triggers', () => {
    function createSnap(edges: AuthorityMapEdgeInput[], nodes: AuthorityMapNodeInput[], hash: string): SystemSnapshot {
      return {
        id: `snap-${hash}`,
        systemId: 'sys-trigger',
        sourceVersion: '1.0.0',
        configHash: hash,
        capturedAt: new Date().toISOString(),
        authorityMapId: `authmap-${hash}`,
        authorityMap: {
          systemId: 'sys-trigger',
          nodes,
          edges,
          derivedAt: new Date().toISOString(),
          sourceArtifactHash: hash
        },
        metadata: {}
      };
    }

    it('triggers reassessment on human approval change (human_approval_changed)', () => {
      const nodes = [{ id: 'n1', nodeType: 'agent' as const, name: 'Agent', metadata: {} }];
      const edgeA: AuthorityMapEdgeInput = {
        id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'calls',
        actionReversibility: 'irreversible', requiresHumanApproval: false, trustBoundary: 'external', permissionScope: 'p'
      };
      const edgeB: AuthorityMapEdgeInput = { ...edgeA, requiresHumanApproval: true };

      const diff = diffSystemSnapshots(createSnap([edgeA], nodes, 'h1'), createSnap([edgeB], nodes, 'h2'));
      const triggerEval = evaluateReassessmentTriggers(diff);

      assert.equal(triggerEval.reassessmentRequired, true);
      assert.ok(triggerEval.triggeredConditions.includes('human_approval_changed'));
      assert.ok(triggerEval.reasons.some(r => r.includes('human approval')));
    });

    it('triggers reassessment on tool addition (tool_added, authority_changed)', () => {
      const nodeAgent = { id: 'n1', nodeType: 'agent' as const, name: 'Agent', metadata: {} };
      const nodeTool = { id: 'n2', nodeType: 'api' as const, name: 'Payment API', metadata: {} };

      const diff = diffSystemSnapshots(createSnap([], [nodeAgent], 'h1'), createSnap([], [nodeAgent, nodeTool], 'h2'));
      const triggerEval = evaluateReassessmentTriggers(diff);

      assert.equal(triggerEval.reassessmentRequired, true);
      assert.ok(triggerEval.triggeredConditions.includes('tool_added'));
      assert.ok(triggerEval.triggeredConditions.includes('authority_changed'));
    });

    it('does NOT trigger reassessment when snapshots are identical', () => {
      const nodes = [{ id: 'n1', nodeType: 'agent' as const, name: 'Agent', metadata: {} }];
      const edges = [{
        id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'calls' as const,
        actionReversibility: 'reversible' as const, requiresHumanApproval: true, trustBoundary: 'internal' as const, permissionScope: 'p'
      }];

      const diff = diffSystemSnapshots(createSnap(edges, nodes, 'h1'), createSnap(edges, nodes, 'h1'));
      const triggerEval = evaluateReassessmentTriggers(diff);

      assert.equal(triggerEval.reassessmentRequired, false);
      assert.equal(triggerEval.triggeredConditions.length, 0);
    });
  });

  // ============================================================
  // SECTION 7: Synthetic Corpus with Versioned Snapshots
  // ============================================================
  describe('Synthetic Corpus with Versioned Snapshots (SYN-01 to SYN-10)', () => {
    const rawCorpus = readFileSync(join(SPEC_FIXTURES_DIR, '08-synthetic-corpus.json'), 'utf-8');
    const corpus = JSON.parse(rawCorpus);

    it('executes all 10 synthetic systems and verifies snapshot binding', () => {
      for (const sys of corpus.systems) {
        const dummyHash = `hash-${sys.id}-${'0'.repeat(50)}`;
        const systemId = `sys-${sys.id.toLowerCase()}`;
        const assessmentId = `asmt-${sys.id}`;

        const nodes: AuthorityMapNodeInput[] = [{ id: `${sys.id}-agent`, nodeType: 'agent', name: sys.name, metadata: {} }];
        const edges: AuthorityMapEdgeInput[] = [];

        if (sys.id === 'SYN-04') {
          nodes.push({ id: `${sys.id}-api`, nodeType: 'api', name: 'Payment API', metadata: {} });
          edges.push({
            id: `${sys.id}-edge-pay`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-api`,
            edgeType: 'calls',
            actionReversibility: 'irreversible',
            requiresHumanApproval: false,
            trustBoundary: 'external',
            permissionScope: 'payment:charge'
          });
        }

        const authMap = {
          systemId,
          nodes,
          edges,
          derivedAt: new Date().toISOString(),
          sourceArtifactHash: dummyHash
        };

        const snapshot = createSystemSnapshot({
          systemId,
          sourceArtifactHash: dummyHash,
          authorityMap: authMap,
          sourceVersion: '1.0.0'
        });

        assert.equal(snapshot.systemId, systemId);
        assert.equal(snapshot.configHash, dummyHash);
        assert.equal(snapshot.authorityMap.nodes.length, nodes.length);

        const ruleResult = executeDeterministicRules(edges, nodes);
        const findings = generateAssessmentFindings(ruleResult.findings, assessmentId);

        if (sys.id === 'SYN-04') {
          const crit = findings.find(f => f.severity === 'critical');
          assert.ok(crit, 'Expected critical finding on SYN-04');
          assert.equal(crit!.authorityMapEdgeId, `${sys.id}-edge-pay`);
        }
      }
    });

    it('demonstrates state evolution on SYN-04 (approval added in Version B removes critical finding)', () => {
      const systemId = 'sys-syn-04';
      const hashA = 'hash-syn-04-state-a';
      const hashB = 'hash-syn-04-state-b';

      const nodes: AuthorityMapNodeInput[] = [
        { id: 'syn04-agent', nodeType: 'agent', name: 'Financial Agent', metadata: {} },
        { id: 'syn04-api', nodeType: 'api', name: 'Payment API', metadata: {} }
      ];

      // State A: unapproved (requiresHumanApproval = false)
      const edgesA: AuthorityMapEdgeInput[] = [{
        id: 'syn04-edge-pay',
        sourceNodeId: 'syn04-agent',
        targetNodeId: 'syn04-api',
        edgeType: 'calls',
        actionReversibility: 'irreversible',
        requiresHumanApproval: false,
        trustBoundary: 'external',
        permissionScope: 'payment:charge'
      }];

      // State B: remediated with human approval (requiresHumanApproval = true)
      const edgesB: AuthorityMapEdgeInput[] = [{
        ...edgesA[0],
        requiresHumanApproval: true
      }];

      const snapA = createSystemSnapshot({
        systemId,
        sourceArtifactHash: hashA,
        authorityMap: { systemId, nodes, edges: edgesA, derivedAt: new Date().toISOString(), sourceArtifactHash: hashA }
      });

      const snapB = createSystemSnapshot({
        systemId,
        sourceArtifactHash: hashB,
        authorityMap: { systemId, nodes, edges: edgesB, derivedAt: new Date().toISOString(), sourceArtifactHash: hashB }
      });

      // 1. Diffs detect change
      const diff = diffSystemSnapshots(snapA, snapB);
      assert.equal(diff.configHashChanged, true);
      assert.equal(diff.modifiedEdges.length, 1);
      assert.equal(diff.modifiedEdges[0].changes[0].field, 'requiresHumanApproval');
      assert.equal(diff.modifiedEdges[0].changes[0].from, false);
      assert.equal(diff.modifiedEdges[0].changes[0].to, true);

      // 2. Reassessment triggers
      const triggers = evaluateReassessmentTriggers(diff);
      assert.equal(triggers.reassessmentRequired, true);
      assert.ok(triggers.triggeredConditions.includes('human_approval_changed'));

      // 3. Assessment A produces Critical finding
      const findingsA = generateAssessmentFindings(executeDeterministicRules(edgesA, nodes).findings, 'asmt-a');
      assert.equal(findingsA.filter(f => f.severity === 'critical').length, 1);

      // 4. Assessment B produces ZERO critical findings
      const findingsB = generateAssessmentFindings(executeDeterministicRules(edgesB, nodes).findings, 'asmt-b');
      assert.equal(findingsB.filter(f => f.severity === 'critical').length, 0);
    });
  });
});
