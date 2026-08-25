import type { LlmArchitectureExtractionOutput, LlmFindingDraftOutput } from './types';
import type { LlmAdapter } from './adapter';
import type { SeededAuthorityMap } from '../authority-map-seed';
import type { SoftDimensionDraftBatch } from '../soft-dimensions';

export type MockScenario =
  | 'valid_minimal'
  | 'valid_with_contradiction_syn05'
  | 'valid_with_contradiction_syn10'
  | 'invalid_e2_attempt'
  | 'invalid_e3_attempt'
  | 'invalid_missing_basis'
  | 'invalid_missing_authority_ref'
  | 'hallucination_invented_node'
  | 'valid_memory_risk_syn08'
  | 'valid_pii_boundary_syn09'
  | 'deterministic_override_attempt';

/**
 * Fully deterministic mock adapter for testing the validation and orchestration layers.
 * Does NOT make HTTP calls. Each scenario produces a predictable, inspectable output.
 */
export class MockLlmAdapter implements LlmAdapter {
  readonly modelProvider = 'mock';
  readonly modelId = 'mock-deterministic-v1';
  readonly promptVersion = 'phase5-v1';

  constructor(private readonly scenario: MockScenario = 'valid_minimal') {}

  async extractArchitecture(
    _systemId: string,
    _systemDescription: string,
    _authorityMapSummary: string,
    _existingMap: SeededAuthorityMap
  ): Promise<LlmArchitectureExtractionOutput> {
    switch (this.scenario) {
      case 'valid_with_contradiction_syn05':
        return {
          nodes: [{
            temp_id: 'n1',
            node_type: 'data_source',
            name: 'customer_table',
            source_excerpt: 'documentation says read customer table'
          }],
          edges: [{
            source_temp_id: 'n1',
            target_temp_id: 'n1',
            edge_type: 'reads',
            permission_scope: 'read:customer',
            requires_human_approval: null,
            data_classification: 'confidential',
            action_reversibility: null,
            source_excerpt: 'documentation says read customer table'
          }],
          extraction_confidence: 'low',
          unresolved_questions: ['Which source is correct: read-only customer table or full schema access?'],
          contradictions: [{
            subject: 'database access scope',
            source_a_excerpt: 'documentation says read customer table only',
            source_b_excerpt: 'connection string in config extract grants full schema access',
            status: 'unresolved',
          }],
        };

      case 'valid_with_contradiction_syn10':
        return {
          nodes: [],
          edges: [],
          extraction_confidence: 'low',
          unresolved_questions: ['Is the human approval a real blocking step or an auto-acknowledged notification?'],
          contradictions: [{
            subject: 'human approval effectiveness',
            source_a_excerpt: 'requires_human_approval=true documented in intake',
            source_b_excerpt: 'workflow description shows approval is auto-acknowledged notification with no blocking step',
            status: 'unresolved',
          }],
        };

      case 'hallucination_invented_node':
        return {
          nodes: [{
            temp_id: 'n-invented',
            node_type: 'tool',
            name: 'InferredTool',
            source_excerpt: '' // intentionally empty: violates Invariant 6
          }],
          edges: [],
          extraction_confidence: 'low',
          unresolved_questions: [],
          contradictions: [],
        };

      default:
        return {
          nodes: [],
          edges: [],
          extraction_confidence: 'moderate',
          unresolved_questions: [],
          contradictions: [],
        };
    }
  }

  async draftFindings(
    _systemSnapshotId: string,
    _softDimensions: SoftDimensionDraftBatch,
    existingMap: SeededAuthorityMap,
    _systemDescription: string,
    _authorityMapSummary: string
  ): Promise<LlmFindingDraftOutput> {
    const firstNodeId = existingMap.nodes[0]?.id ?? 'node-unknown';
    const firstEdgeId = existingMap.edges[0]?.id;

    switch (this.scenario) {
      case 'valid_minimal':
        return {
          findings: [{
            title: 'Memory store lacks documented poisoning-detection mechanism',
            description: 'The agent reads/writes a long-term memory store. No control for detecting malicious memory entries is documented.',
            severity: 'medium',
            confidence: 'moderate',
            evidence_level: 'E1_documented',
            framework_reference_code: 'ASI06',
            authority_map_ref: { node_id: firstNodeId },
            basis: 'Auditor notes describe persistent memory but no purge or validation mechanism.',
          }],
          contradictions: [],
          unknowns: ["Whether poisoned entries can influence the agent's future responses"],
        };

      case 'invalid_e2_attempt':
        return {
          findings: [{
            title: 'Test finding with invalid evidence level',
            description: 'This should be caught and rejected by the validation layer.',
            severity: 'medium',
            confidence: 'moderate',
            evidence_level: 'E2_observed' as any, // intentionally invalid
            framework_reference_code: 'ASI06',
            authority_map_ref: { node_id: firstNodeId },
            basis: 'Some basis',
          }],
          contradictions: [],
          unknowns: [],
        };

      case 'invalid_e3_attempt':
        return {
          findings: [{
            title: 'Test finding with E3 attempt',
            description: 'E3 is not reachable by the LLM.',
            severity: 'low',
            confidence: 'high',
            evidence_level: 'E3_validated' as any,
            framework_reference_code: 'ASI06',
            authority_map_ref: { node_id: firstNodeId },
            basis: 'Some basis',
          }],
          contradictions: [],
          unknowns: [],
        };

      case 'invalid_missing_basis':
        return {
          findings: [{
            title: 'Finding with no basis',
            description: 'Missing basis field.',
            severity: 'medium',
            confidence: 'moderate',
            evidence_level: 'E1_documented',
            framework_reference_code: 'ASI06',
            authority_map_ref: { node_id: firstNodeId },
            basis: '', // empty basis violates traceability
          }],
          contradictions: [],
          unknowns: [],
        };

      case 'invalid_missing_authority_ref':
        return {
          findings: [{
            title: 'Finding with no authority map reference',
            description: 'No node_id or edge_id provided.',
            severity: 'medium',
            confidence: 'moderate',
            evidence_level: 'E1_documented',
            framework_reference_code: 'ASI06',
            authority_map_ref: {}, // neither node_id nor edge_id
            basis: 'Some basis',
          }],
          contradictions: [],
          unknowns: [],
        };

      case 'deterministic_override_attempt':
        return {
          findings: [{
            title: 'Reassuring narrative attempting to downplay critical risk',
            description: 'The organization has a policy that may mitigate the irreversible action risk.',
            severity: 'informational', // LLM tries to downplay deterministic critical finding
            confidence: 'moderate',
            evidence_level: 'E0_claimed',
            framework_reference_code: 'ASI01',
            authority_map_ref: firstEdgeId ? { edge_id: firstEdgeId } : { node_id: firstNodeId },
            basis: 'Organizational policy statement in auditor notes.',
            self_assessed_certainty_note: 'This may make the critical finding acceptable per organizational policy.',
          }],
          contradictions: [],
          unknowns: [],
        };

      case 'valid_memory_risk_syn08':
        return {
          findings: [{
            title: 'No documented mechanism to detect or purge poisoned memory entries',
            description: 'Agent has persistent memory across sessions. The existence of memory does not imply memory-poisoning resistance.',
            severity: 'medium',
            confidence: 'low',
            evidence_level: 'E1_documented',
            framework_reference_code: 'ASI06',
            authority_map_ref: { node_id: firstNodeId },
            basis: 'Auditor notes describe persistent memory store. No purge, validation, or anomaly-detection control is documented.',
            self_assessed_certainty_note: 'Existence of memory is established. Poisoning vulnerability requires additional testing evidence — cannot claim E2+.',
          }],
          contradictions: [],
          unknowns: [
            'Whether poisoned memory entries can influence future agent responses',
            'Whether memory entries have TTL or can be reviewed'
          ],
        };

      case 'valid_pii_boundary_syn09':
        return {
          findings: [{
            title: 'Restricted data reachable by external tool call — no outbound DLP control documented',
            description: 'The agent reads restricted PII and also calls an external search tool. The path from restricted data through the agent to the external boundary has no documented data-loss-prevention control. This is a composition risk: neither the data read alone nor the external call alone constitutes the risk — their combination does.',
            severity: 'critical',
            confidence: 'moderate',
            evidence_level: 'E1_documented',
            framework_reference_code: 'ASI02',
            authority_map_ref: { node_id: firstNodeId },
            basis: 'Authority map shows agent reads data_source(customer_pii, restricted) and calls tool(external_search, external). No DLP control is documented in auditor notes.',
            self_assessed_certainty_note: 'Cannot claim actual exfiltration occurred — this is a documented structural risk, not an observed event. Evidence remains E1.',
          }],
          contradictions: [],
          unknowns: [
            'Whether any outbound filtering exists at the network or application layer',
            'Whether the external search tool logs or retains any query content'
          ],
        };

      case 'valid_with_contradiction_syn05':
        return {
          findings: [{
            title: 'Documented access scope contradicts actual granted privileges',
            description: 'Source material contradicts itself on database access scope. This contradiction must be resolved before an access control finding can be rated.',
            severity: 'critical',
            confidence: 'low',
            evidence_level: 'E1_documented',
            framework_reference_code: 'ASI03',
            authority_map_ref: { node_id: firstNodeId },
            basis: 'Contradiction between documentation (read-only customer table) and config extract (full schema access).',
          }],
          contradictions: [{
            subject: 'database access scope',
            source_a_excerpt: 'documentation says agent has read access to customer table',
            source_b_excerpt: 'database connection string in config extract grants full schema access including write',
            status: 'unresolved',
          }],
          unknowns: ['Which access scope is actually enforced at runtime'],
        };

      case 'valid_with_contradiction_syn10':
        return {
          findings: [{
            title: 'Documented human-approval control appears to be non-blocking',
            description: 'Documentation states requires_human_approval=true, but workflow description indicates the approval is auto-acknowledged. This contradiction must be surfaced, not resolved.',
            severity: 'critical',
            confidence: 'low',
            evidence_level: 'E1_documented',
            framework_reference_code: 'ASI01',
            authority_map_ref: firstEdgeId ? { edge_id: firstEdgeId } : { node_id: firstNodeId },
            basis: 'Contradiction between requires_human_approval=true in documentation and auto-acknowledged notification described in workflow.',
          }],
          contradictions: [{
            subject: 'human approval effectiveness',
            source_a_excerpt: 'requires_human_approval=true documented in intake',
            source_b_excerpt: 'workflow description shows approval is auto-acknowledged with no actual blocking step',
            status: 'unresolved',
          }],
          unknowns: ['Whether any technical gate prevents the action from proceeding without human response'],
        };

      default:
        return { findings: [], contradictions: [], unknowns: [] };
    }
  }
}
