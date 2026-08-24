/**
 * Phase 3: Authority Map Seeding, Deterministic Rules, and Synthetic Corpus Test Suite
 * 
 * Test Coverage:
 * - Section 1: Focused Rule 1 tests (Positive, Negative, UNKNOWN approval state)
 * - Section 2: Focused Rule 2 tests (External, Unknown, Internal, No delegation)
 * - Section 3: Focused Rule 3 tests (Shared identity differing scopes, Identical scopes, Single edge)
 * - Section 4: Focused Rule 4 / D10 tests (External irreversible uncontained, Sandboxed, Node containment, Internal)
 * - Section 5: Authority Map Seeding & Source Traceability (Metadata provenance, Conservative unknowns)
 * - Section 6: Single Weak Fixture End-to-End Execution (Rules 1 & 4 fire, E1 capped, Traceable findings)
 * - Section 7: Strong Fixture End-to-End Execution (No critical/high findings)
 * - Section 8: Full 10-System Synthetic Corpus Experiment (SYN-01 to SYN-10)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { 
  seedAuthorityMapFromTrackD,
  executeDeterministicRules,
  evaluateRule1IrreversibleNoApproval,
  evaluateRule2ExternalDelegation,
  evaluateRule3SharedIdentity,
  evaluateD10ContainmentRule,
  generateAssessmentFindings,
  validateTrackDExport,
  hashTrackDExport,
  translateTrackDToAssurance,
  type AuthorityMapEdgeInput,
  type AuthorityMapNodeInput
} from '../src/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');
const SPEC_FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', 'docs', 'assurance-mvp-spec', 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

describe('Phase 3: Authority Map & Deterministic Rules Engine', () => {

  // ============================================================
  // SECTION 1: Rule 1 Focused Tests (Irreversible action without approval)
  // ============================================================
  describe('Rule 1: Irreversible Action Without Human Approval', () => {
    it('fires Critical finding when action is irreversible and requiresHumanApproval is false', () => {
      const edges: AuthorityMapEdgeInput[] = [{
        id: 'edge-1',
        sourceNodeId: 'node-agent',
        targetNodeId: 'node-api',
        edgeType: 'calls',
        actionReversibility: 'irreversible',
        requiresHumanApproval: false,
        trustBoundary: 'external',
        permissionScope: 'payment:charge'
      }];
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-agent', nodeType: 'agent', name: 'Billing Agent', metadata: {} },
        { id: 'node-api', nodeType: 'api', name: 'Stripe API', metadata: {} }
      ];

      const findings = evaluateRule1IrreversibleNoApproval(edges, nodes);
      assert.equal(findings.length, 1);
      assert.equal(findings[0].severity, 'critical');
      assert.equal(findings[0].confidence, 'moderate');
      assert.equal(findings[0].evidenceLevel, 'E1_documented');
      assert.deepEqual(findings[0].frameworkRefs, ['ASI01']);
      assert.equal(findings[0].authorityMapEdgeId, 'edge-1');
    });

    it('does NOT fire when requiresHumanApproval is true', () => {
      const edges: AuthorityMapEdgeInput[] = [{
        id: 'edge-1',
        sourceNodeId: 'node-agent',
        targetNodeId: 'node-api',
        edgeType: 'calls',
        actionReversibility: 'irreversible',
        requiresHumanApproval: true,
        trustBoundary: 'external',
        permissionScope: 'payment:charge'
      }];
      const nodes: AuthorityMapNodeInput[] = [{ id: 'node-agent', nodeType: 'agent', name: 'Billing Agent', metadata: {} }];

      const findings = evaluateRule1IrreversibleNoApproval(edges, nodes);
      assert.equal(findings.length, 0);
    });

    it('does NOT fire when actionReversibility is reversible', () => {
      const edges: AuthorityMapEdgeInput[] = [{
        id: 'edge-1',
        sourceNodeId: 'node-agent',
        targetNodeId: 'node-api',
        edgeType: 'calls',
        actionReversibility: 'reversible',
        requiresHumanApproval: false,
        trustBoundary: 'external',
        permissionScope: 'cart:add'
      }];
      const nodes: AuthorityMapNodeInput[] = [{ id: 'node-agent', nodeType: 'agent', name: 'Cart Agent', metadata: {} }];

      const findings = evaluateRule1IrreversibleNoApproval(edges, nodes);
      assert.equal(findings.length, 0);
    });

    it('does NOT falsely fire when requiresHumanApproval is unknown (undefined)', () => {
      const edges: AuthorityMapEdgeInput[] = [{
        id: 'edge-1',
        sourceNodeId: 'node-agent',
        targetNodeId: 'node-api',
        edgeType: 'calls',
        actionReversibility: 'irreversible',
        requiresHumanApproval: undefined as any,
        trustBoundary: 'external',
        permissionScope: 'action:exec'
      }];
      const nodes: AuthorityMapNodeInput[] = [{ id: 'node-agent', nodeType: 'agent', name: 'Agent', metadata: {} }];

      const findings = evaluateRule1IrreversibleNoApproval(edges, nodes);
      assert.equal(findings.length, 0, 'Must not convert unknown approval to false');
    });
  });

  // ============================================================
  // SECTION 2: Rule 2 Focused Tests (External delegation)
  // ============================================================
  describe('Rule 2: Delegation to External Agent', () => {
    it('fires High finding when edge delegates_to an external_agent across external boundary', () => {
      const edges: AuthorityMapEdgeInput[] = [{
        id: 'edge-del-1',
        sourceNodeId: 'node-agent-1',
        targetNodeId: 'node-agent-ext',
        edgeType: 'delegates_to',
        requiresHumanApproval: false,
        trustBoundary: 'external',
        permissionScope: 'task:delegate'
      }];
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-agent-1', nodeType: 'agent', name: 'Coordinator', metadata: {} },
        { id: 'node-agent-ext', nodeType: 'external_agent', name: 'Third-Party Sub-Agent', metadata: {} }
      ];

      const findings = evaluateRule2ExternalDelegation(edges, nodes);
      assert.equal(findings.length, 1);
      assert.equal(findings[0].severity, 'high');
      assert.deepEqual(findings[0].frameworkRefs, ['ASI07', 'ASI09']);
      assert.equal(findings[0].authorityMapEdgeId, 'edge-del-1');
    });

    it('fires High finding when edge delegates_to an external_agent across unknown boundary', () => {
      const edges: AuthorityMapEdgeInput[] = [{
        id: 'edge-del-2',
        sourceNodeId: 'node-agent-1',
        targetNodeId: 'node-agent-ext',
        edgeType: 'delegates_to',
        requiresHumanApproval: false,
        trustBoundary: 'unknown',
        permissionScope: 'task:delegate'
      }];
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-agent-1', nodeType: 'agent', name: 'Coordinator', metadata: {} },
        { id: 'node-agent-ext', nodeType: 'external_agent', name: 'Unknown Vendor Agent', metadata: {} }
      ];

      const findings = evaluateRule2ExternalDelegation(edges, nodes);
      assert.equal(findings.length, 1);
    });

    it('does NOT fire when delegation is internal to internal sub-agent', () => {
      const edges: AuthorityMapEdgeInput[] = [{
        id: 'edge-del-3',
        sourceNodeId: 'node-agent-1',
        targetNodeId: 'node-agent-internal',
        edgeType: 'delegates_to',
        requiresHumanApproval: false,
        trustBoundary: 'internal',
        permissionScope: 'task:delegate'
      }];
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-agent-1', nodeType: 'agent', name: 'Coordinator', metadata: {} },
        { id: 'node-agent-internal', nodeType: 'agent', name: 'Internal Sub-Agent', metadata: {} }
      ];

      const findings = evaluateRule2ExternalDelegation(edges, nodes);
      assert.equal(findings.length, 0);
    });
  });

  // ============================================================
  // SECTION 3: Rule 3 Focused Tests (Shared identity)
  // ============================================================
  describe('Rule 3: Shared Identity with Differing Permission Scopes', () => {
    it('fires High finding when identity is shared across edges with differing scopes', () => {
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-id-1', nodeType: 'identity', name: 'Shared Service Account', metadata: {} },
        { id: 'node-agent-a', nodeType: 'agent', name: 'Public Agent', metadata: {} },
        { id: 'node-agent-b', nodeType: 'agent', name: 'Admin Agent', metadata: {} }
      ];
      const edges: AuthorityMapEdgeInput[] = [
        {
          id: 'edge-auth-1',
          sourceNodeId: 'node-id-1',
          targetNodeId: 'node-agent-a',
          edgeType: 'authenticates_as',
          requiresHumanApproval: false,
          trustBoundary: 'internal',
          permissionScope: 'read:public'
        },
        {
          id: 'edge-auth-2',
          sourceNodeId: 'node-id-1',
          targetNodeId: 'node-agent-b',
          edgeType: 'authenticates_as',
          requiresHumanApproval: false,
          trustBoundary: 'internal',
          permissionScope: 'admin:full_access'
        }
      ];

      const findings = evaluateRule3SharedIdentity(edges, nodes);
      assert.equal(findings.length, 1);
      assert.equal(findings[0].severity, 'high');
      assert.deepEqual(findings[0].frameworkRefs, ['ASI03']);
      assert.equal(findings[0].authorityMapNodeId, 'node-id-1');
    });

    it('does NOT fire when identity has multiple edges sharing identical scope', () => {
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-id-1', nodeType: 'identity', name: 'Readonly Service Account', metadata: {} },
        { id: 'node-agent-a', nodeType: 'agent', name: 'Reader 1', metadata: {} },
        { id: 'node-agent-b', nodeType: 'agent', name: 'Reader 2', metadata: {} }
      ];
      const edges: AuthorityMapEdgeInput[] = [
        {
          id: 'edge-auth-1',
          sourceNodeId: 'node-id-1',
          targetNodeId: 'node-agent-a',
          edgeType: 'authenticates_as',
          requiresHumanApproval: false,
          trustBoundary: 'internal',
          permissionScope: 'read:catalog'
        },
        {
          id: 'edge-auth-2',
          sourceNodeId: 'node-id-1',
          targetNodeId: 'node-agent-b',
          edgeType: 'authenticates_as',
          requiresHumanApproval: false,
          trustBoundary: 'internal',
          permissionScope: 'read:catalog'
        }
      ];

      const findings = evaluateRule3SharedIdentity(edges, nodes);
      assert.equal(findings.length, 0);
    });
  });

  // ============================================================
  // SECTION 4: Rule 4 / D10 Focused Tests (Containment & Blast Radius)
  // ============================================================
  describe('Rule 4: Inadequate Containment on External Irreversible Actions', () => {
    it('fires High finding when irreversible external action lacks containment', () => {
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-agent', nodeType: 'agent', name: 'Agent', metadata: { containment: false } },
        { id: 'node-ext-api', nodeType: 'api', name: 'Public API', metadata: { containment: false } }
      ];
      const edges: AuthorityMapEdgeInput[] = [{
        id: 'edge-d10-1',
        sourceNodeId: 'node-agent',
        targetNodeId: 'node-ext-api',
        edgeType: 'calls',
        actionReversibility: 'irreversible',
        requiresHumanApproval: false,
        trustBoundary: 'external',
        permissionScope: 'api:write',
        description: 'Direct uncontained API call'
      }];

      const findings = evaluateD10ContainmentRule(edges, nodes);
      assert.equal(findings.length, 1);
      assert.equal(findings[0].severity, 'high');
      assert.deepEqual(findings[0].frameworkRefs, ['ASI08', 'D10']);
      assert.equal(findings[0].authorityMapEdgeId, 'edge-d10-1');
    });

    it('does NOT fire when edge description contains containment measures (e.g. sandboxed)', () => {
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-agent', nodeType: 'agent', name: 'Agent', metadata: {} },
        { id: 'node-ext-api', nodeType: 'api', name: 'Public API', metadata: {} }
      ];
      const edges: AuthorityMapEdgeInput[] = [{
        id: 'edge-d10-2',
        sourceNodeId: 'node-agent',
        targetNodeId: 'node-ext-api',
        edgeType: 'calls',
        actionReversibility: 'irreversible',
        requiresHumanApproval: false,
        trustBoundary: 'external',
        permissionScope: 'api:write',
        description: 'Calls external API via sandboxed proxy with budget cap'
      }];

      const findings = evaluateD10ContainmentRule(edges, nodes);
      assert.equal(findings.length, 0);
    });

    it('does NOT fire when target node metadata specifies containment = true', () => {
      const nodes: AuthorityMapNodeInput[] = [
        { id: 'node-agent', nodeType: 'agent', name: 'Agent', metadata: {} },
        { id: 'node-ext-api', nodeType: 'api', name: 'Contained API', metadata: { containment: true } }
      ];
      const edges: AuthorityMapEdgeInput[] = [{
        id: 'edge-d10-3',
        sourceNodeId: 'node-agent',
        targetNodeId: 'node-ext-api',
        edgeType: 'calls',
        actionReversibility: 'irreversible',
        requiresHumanApproval: false,
        trustBoundary: 'external',
        permissionScope: 'api:write'
      }];

      const findings = evaluateD10ContainmentRule(edges, nodes);
      assert.equal(findings.length, 0);
    });
  });

  // ============================================================
  // SECTION 5: Authority Map Seeding & Provenance Metadata
  // ============================================================
  describe('Authority Map Seeding from Track D', () => {
    it('seeds primary agent node, target action node, and calls edge with source provenance', () => {
      const rawJson = loadFixture('sample-v61-export.json');
      const validation = validateTrackDExport(JSON.parse(rawJson));
      assert.equal(validation.valid, true);
      if (!validation.valid) throw new Error('Validation failed');

      const hash = hashTrackDExport(rawJson);
      const authorityMap = seedAuthorityMapFromTrackD(validation.data, hash, 'test-asmt-1');

      assert.ok(authorityMap.nodes.length >= 2, 'Expected at least agent and action nodes');
      assert.ok(authorityMap.edges.length >= 1, 'Expected at least calls edge');

      // Check agent node provenance
      const agentNode = authorityMap.nodes.find(n => n.nodeType === 'agent');
      assert.ok(agentNode);
      assert.equal(agentNode!.provenance?.source, 'track_d_export');
      assert.equal(agentNode!.provenance?.dimension, 'metadata');

      // Check edge provenance
      const callEdge = authorityMap.edges.find(e => e.edgeType === 'calls');
      assert.ok(callEdge);
      assert.equal(callEdge!.provenance?.source, 'track_d_export');
      assert.equal(callEdge!.provenance?.derivationRule, 'd1_reversibility_and_d3_approval_to_edge');
    });
  });

  // ============================================================
  // SECTION 6: Single Weak Fixture End-to-End Execution
  // ============================================================
  describe('Single Weak Fixture End-to-End Experiment', () => {
    it('processes weak-governance fixture end-to-end and fires Rules 1 and 4', () => {
      const rawJson = loadFixture('sample-v61-export.json');
      const validation = validateTrackDExport(JSON.parse(rawJson));
      assert.equal(validation.valid, true);
      if (!validation.valid) throw new Error('Validation failed');

      const hash = hashTrackDExport(rawJson);
      const asmtId = 'asmt-weak-1';

      // 1. Seed Authority Map
      const authorityMap = seedAuthorityMapFromTrackD(validation.data, hash, asmtId);

      // 2. Execute Deterministic Rules
      const ruleResult = executeDeterministicRules(authorityMap.edges, authorityMap.nodes);

      // 3. Generate Findings
      const findings = generateAssessmentFindings(ruleResult.findings, asmtId);

      // Weak fixture has D3 cap=0 (irreversible, no approval) and D10 cap=0 (uncontained external)
      assert.ok(findings.length >= 2, `Expected at least 2 findings, got ${findings.length}`);

      const rule1Finding = findings.find(f => f.frameworkRefs.includes('ASI01'));
      assert.ok(rule1Finding, 'Expected Rule 1 (ASI01) finding');
      assert.equal(rule1Finding!.severity, 'critical');
      assert.equal(rule1Finding!.evidenceLevel, 'E1_documented');

      const rule4Finding = findings.find(f => f.frameworkRefs.includes('D10'));
      assert.ok(rule4Finding, 'Expected Rule 4 (D10/ASI08) finding');
      assert.equal(rule4Finding!.severity, 'high');
      assert.equal(rule4Finding!.evidenceLevel, 'E1_documented');

      // Verify all findings trace to an authorityMapEdgeId or authorityMapNodeId
      for (const f of findings) {
        assert.ok(f.authorityMapEdgeId || f.authorityMapNodeId, 'Traceability invariant violated');
      }
    });
  });

  // ============================================================
  // SECTION 7: Strong Fixture End-to-End Execution
  // ============================================================
  describe('Strong Fixture End-to-End Experiment', () => {
    it('processes strong fixture and produces 0 critical/high findings from deterministic rules', () => {
      const rawJson = loadFixture('sample-v61-export-strong.json');
      const validation = validateTrackDExport(JSON.parse(rawJson));
      assert.equal(validation.valid, true);
      if (!validation.valid) throw new Error('Validation failed');

      const hash = hashTrackDExport(rawJson);
      const asmtId = 'asmt-strong-1';

      const authorityMap = seedAuthorityMapFromTrackD(validation.data, hash, asmtId);
      const ruleResult = executeDeterministicRules(authorityMap.edges, authorityMap.nodes);
      const findings = generateAssessmentFindings(ruleResult.findings, asmtId);

      assert.equal(findings.length, 0, 'Strong governance fixture should trigger 0 deterministic risk rules');
    });
  });

  // ============================================================
  // SECTION 8: 10-System Synthetic Corpus Experiment
  // ============================================================
  describe('Synthetic Corpus 10-System Experiment (08-synthetic-corpus.json)', () => {
    const rawCorpus = readFileSync(join(SPEC_FIXTURES_DIR, '08-synthetic-corpus.json'), 'utf-8');
    const corpus = JSON.parse(rawCorpus);

    it('loads and validates all 10 synthetic corpus definitions', () => {
      assert.equal(corpus.systems.length, 10);
    });

    // Helper to build Authority Map from synthetic corpus system profiles
    function buildSyntheticAuthorityMap(sys: any): { nodes: AuthorityMapNodeInput[]; edges: AuthorityMapEdgeInput[] } {
      const nodes: AuthorityMapNodeInput[] = [{ id: `${sys.id}-agent`, nodeType: 'agent', name: sys.name, metadata: {} }];
      const edges: AuthorityMapEdgeInput[] = [];

      switch (sys.id) {
        case 'SYN-01': // Read-only internal knowledge agent
          nodes.push({ id: `${sys.id}-wiki`, nodeType: 'data_source', name: 'Internal Wiki', metadata: {} });
          edges.push({
            id: `${sys.id}-edge-read`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-wiki`,
            edgeType: 'reads',
            requiresHumanApproval: false,
            trustBoundary: 'internal',
            permissionScope: 'wiki:read'
          });
          break;

        case 'SYN-02': // Customer-support CRM + draft email (human approved)
          nodes.push({ id: `${sys.id}-crm`, nodeType: 'data_source', name: 'CRM Database', metadata: {} });
          nodes.push({ id: `${sys.id}-email-tool`, nodeType: 'tool', name: 'Email Drafter', metadata: {} });
          edges.push({
            id: `${sys.id}-edge-crm`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-crm`,
            edgeType: 'reads',
            requiresHumanApproval: false,
            trustBoundary: 'internal',
            permissionScope: 'crm:read_write'
          });
          edges.push({
            id: `${sys.id}-edge-email`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-email-tool`,
            edgeType: 'calls',
            actionReversibility: 'reversible',
            requiresHumanApproval: true, // Human approves
            trustBoundary: 'internal',
            permissionScope: 'email:draft'
          });
          break;

        case 'SYN-03': // Autonomous email sender (irreversible, no approval)
          nodes.push({ id: `${sys.id}-send-email`, nodeType: 'tool', name: 'Autonomous Email Sender', metadata: {} });
          edges.push({
            id: `${sys.id}-edge-send`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-send-email`,
            edgeType: 'calls',
            actionReversibility: 'irreversible',
            requiresHumanApproval: false,
            trustBoundary: 'external',
            permissionScope: 'email:send_external'
          });
          break;

        case 'SYN-04': // Financial payment API (irreversible, no approval)
          nodes.push({ id: `${sys.id}-payment-api`, nodeType: 'api', name: 'Payment Settlement API', metadata: { dataClassification: 'restricted' } });
          edges.push({
            id: `${sys.id}-edge-pay`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-payment-api`,
            edgeType: 'calls',
            actionReversibility: 'irreversible',
            requiresHumanApproval: false,
            trustBoundary: 'external',
            permissionScope: 'stripe:charge:create'
          });
          break;

        case 'SYN-05': // Excessive DB privileges
          nodes.push({ id: `${sys.id}-db`, nodeType: 'data_source', name: 'Customer Database', metadata: {} });
          edges.push({
            id: `${sys.id}-edge-db`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-db`,
            edgeType: 'reads',
            requiresHumanApproval: false,
            trustBoundary: 'internal',
            permissionScope: 'db:full_admin_grant'
          });
          break;

        case 'SYN-06': // Third-party MCP server external delegation
          nodes.push({ id: `${sys.id}-ext-mcp`, nodeType: 'external_agent', name: 'Third-Party MCP Provider', metadata: {} });
          edges.push({
            id: `${sys.id}-edge-mcp`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-ext-mcp`,
            edgeType: 'delegates_to',
            requiresHumanApproval: false,
            trustBoundary: 'external',
            permissionScope: 'mcp:delegate'
          });
          break;

        case 'SYN-07': // Multi-agent delegation
          nodes.push({ id: `${sys.id}-sub1`, nodeType: 'external_agent', name: 'Sub-Agent 1', metadata: {} });
          nodes.push({ id: `${sys.id}-sub2`, nodeType: 'external_agent', name: 'Sub-Agent 2', metadata: {} });
          edges.push({
            id: `${sys.id}-edge-sub1`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-sub1`,
            edgeType: 'delegates_to',
            requiresHumanApproval: false,
            trustBoundary: 'unknown',
            permissionScope: 'delegate:task1'
          });
          edges.push({
            id: `${sys.id}-edge-sub2`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-sub2`,
            edgeType: 'delegates_to',
            requiresHumanApproval: false,
            trustBoundary: 'unknown',
            permissionScope: 'delegate:task2'
          });
          break;

        case 'SYN-08': // Persistent memory
          nodes.push({ id: `${sys.id}-mem`, nodeType: 'memory', name: 'Long Term Store', metadata: {} });
          edges.push({
            id: `${sys.id}-edge-mem`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-mem`,
            edgeType: 'writes',
            requiresHumanApproval: false,
            trustBoundary: 'internal',
            permissionScope: 'memory:write'
          });
          break;

        case 'SYN-09': // PII read + External call composition
          nodes.push({ id: `${sys.id}-pii`, nodeType: 'data_source', name: 'Customer PII Store', metadata: { dataClassification: 'restricted' } });
          nodes.push({ id: `${sys.id}-search`, nodeType: 'tool', name: 'External Search Tool', metadata: {} });
          edges.push({
            id: `${sys.id}-edge-pii`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-pii`,
            edgeType: 'reads',
            requiresHumanApproval: false,
            trustBoundary: 'internal',
            permissionScope: 'pii:read'
          });
          edges.push({
            id: `${sys.id}-edge-search`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-search`,
            edgeType: 'calls',
            actionReversibility: 'reversible',
            requiresHumanApproval: false,
            trustBoundary: 'external',
            permissionScope: 'search:query'
          });
          break;

        case 'SYN-10': // Auto-ack meaningless approval (irreversible action)
          nodes.push({ id: `${sys.id}-critical-tool`, nodeType: 'tool', name: 'Critical Action Tool', metadata: {} });
          edges.push({
            id: `${sys.id}-edge-crit`,
            sourceNodeId: `${sys.id}-agent`,
            targetNodeId: `${sys.id}-critical-tool`,
            edgeType: 'calls',
            actionReversibility: 'irreversible',
            requiresHumanApproval: false, // Discovered in intake as meaningless/false
            trustBoundary: 'external',
            permissionScope: 'tool:exec_critical'
          });
          break;
      }

      return { nodes, edges };
    }

    // Process all 10 systems
    for (const sys of corpus.systems) {
      it(`evaluates ${sys.id}: ${sys.name}`, () => {
        const { nodes, edges } = buildSyntheticAuthorityMap(sys);
        const result = executeDeterministicRules(edges, nodes);
        const findings = generateAssessmentFindings(result.findings, `asmt-${sys.id}`);

        // Specific assertions per system hypothesis
        if (sys.id === 'SYN-01') {
          // Read-only wiki: deterministic rules should NOT over-fire (0 critical findings)
          const criticals = findings.filter(f => f.severity === 'critical');
          assert.equal(criticals.length, 0, 'SYN-01 read-only agent must not trigger critical rule');
        } else if (sys.id === 'SYN-03' || sys.id === 'SYN-04' || sys.id === 'SYN-10') {
          // Irreversible unapproved external action: Rule 1 must fire
          const rule1 = findings.find(f => f.frameworkRefs.includes('ASI01'));
          assert.ok(rule1, `${sys.id} must trigger Rule 1 (ASI01)`);
          assert.equal(rule1!.severity, 'critical');
        } else if (sys.id === 'SYN-06' || sys.id === 'SYN-07') {
          // External/unknown delegation: Rule 2 must fire
          const rule2 = findings.find(f => f.frameworkRefs.includes('ASI07'));
          assert.ok(rule2, `${sys.id} must trigger Rule 2 (ASI07/ASI09)`);
          assert.equal(rule2!.severity, 'high');
        }

        // Invariant check: all generated findings have evidence_level <= E1
        for (const f of findings) {
          assert.ok(['E0_claimed', 'E1_documented'].includes(f.evidenceLevel));
          assert.ok(f.authorityMapEdgeId || f.authorityMapNodeId);
        }
      });
    }
  });
});
