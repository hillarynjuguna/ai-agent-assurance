import { ValidatedTrackDExport } from './track-d-types';
import { 
  AuthorityMapNodeInput, 
  AuthorityMapEdgeInput, 
  AuthorityNodeType, 
  AuthorityEdgeType, 
  Reversibility, 
  TrustBoundary 
} from './rules/types';

export interface AuthorityElementProvenance {
  source: 'track_d_export';
  dimension: string; // e.g. "D1", "D3", "D5", "D8", "D10"
  field: string;     // e.g. "cap", "evid", "notes"
  value: string;     // string value from export
  derivationRule: string;
}

export interface SeededAuthorityMapNode extends AuthorityMapNodeInput {
  provenance?: AuthorityElementProvenance;
}

export interface SeededAuthorityMapEdge extends AuthorityMapEdgeInput {
  provenance?: AuthorityElementProvenance;
}

export interface SeededAuthorityMap {
  systemId: string;
  nodes: SeededAuthorityMapNode[];
  edges: SeededAuthorityMapEdge[];
  derivedAt: string;
  sourceArtifactHash: string;
}

/**
 * Derives a minimal, deterministic Authority Map strictly from exported Track D data.
 * 
 * Epistemic Rules:
 * - Only derive facts from fields actually present in the export.
 * - Missing or ambiguous fields are represented as 'unknown', not inferred as false or safe.
 * - Every node and edge carries provenance metadata linking back to the Track D dimension.
 */
export function seedAuthorityMapFromTrackD(
  validated: ValidatedTrackDExport,
  sourceArtifactHash: string,
  systemId: string = 'system-default'
): SeededAuthorityMap {
  const nodes: SeededAuthorityMapNode[] = [];
  const edges: SeededAuthorityMapEdge[] = [];
  const derivedAt = new Date().toISOString();

  // 1. Primary Agent Node (derived from assessment metadata)
  const agentNodeId = `node-agent-${systemId}`;
  const companyName = validated.assessment.metadata.company || 'Assessed Organization';
  const criticality = validated.assessment.metadata.criticality || 'operational';

  nodes.push({
    id: agentNodeId,
    nodeType: 'agent',
    name: `${companyName} Autonomous Agent`,
    metadata: {
      criticality,
      audience: validated.assessment.metadata.audience,
      confidence: validated.assessment.metadata.confidence,
    },
    provenance: {
      source: 'track_d_export',
      dimension: 'metadata',
      field: 'company',
      value: companyName,
      derivationRule: 'metadata_to_primary_agent_node'
    }
  });

  const dimensions = validated.assessment.dimensions;
  const notes = validated.assessment.notes || {};

  // ------------------------------------------------------------
  // D1: Reversibility Classification -> Action Reversibility
  // ------------------------------------------------------------
  const d1 = dimensions['1'];
  const d1Notes = (notes['1'] || '').toLowerCase();
  const d3Notes = (notes['3'] || '').toLowerCase();
  let actionReversibility: Reversibility | 'unknown' = 'unknown';
  if (d1 && !d1.na) {
    const hasIrreversibleNotes = d1Notes.includes('irreversible') || 
                                 d3Notes.includes('order') || 
                                 d3Notes.includes('payment') || 
                                 d3Notes.includes('charge') ||
                                 d3Notes.includes('auto-approve');

    if (d1.cap === 0 || hasIrreversibleNotes) {
      actionReversibility = 'irreversible';
    } else if (d1.cap === 1) {
      actionReversibility = 'partially_reversible';
    } else if (d1.cap >= 2) {
      actionReversibility = 'reversible';
    }
  }

  // ------------------------------------------------------------
  // D3: Human Override -> requiresHumanApproval
  // false if cap=0; true if cap>=2; unknown (undefined) if cap=1 or NA
  // ------------------------------------------------------------
  const d3 = dimensions['3'];
  let requiresHumanApproval: boolean | undefined = undefined;
  if (d3 && !d3.na) {
    if (d3.cap === 0) requiresHumanApproval = false;
    else if (d3.cap >= 2) requiresHumanApproval = true;
    // cap=1 is partial/inadequate, remains undefined (unknown)
  }

  // ------------------------------------------------------------
  // D10: Containment & Blast Radius -> Trust Boundary & Containment metadata
  // ------------------------------------------------------------
  const d10 = dimensions['10'];
  const d10Notes = (notes['10'] || '').toLowerCase();
  let trustBoundary: TrustBoundary = 'unknown';
  let hasContainment = false;

  if (d10 && !d10.na) {
    if (d10Notes.includes('internal') || d10Notes.includes('vpc') || d10Notes.includes('isolated')) {
      trustBoundary = 'internal';
      hasContainment = true;
    } else if (d10Notes.includes('partner') || d10Notes.includes('vendor')) {
      trustBoundary = 'partner';
    } else if (d10.cap === 0 || d10Notes.includes('external') || d10Notes.includes('public') || d10Notes.includes('uncontained')) {
      trustBoundary = 'external';
      hasContainment = false;
    } else if (d10.cap >= 2) {
      hasContainment = true;
    }
  }

  // ------------------------------------------------------------
  // Create Target Action/API Node & Edge if D1 or D3 or D10 has data
  // ------------------------------------------------------------
  if (d1 && !d1.na) {
    const targetToolId = `node-tool-action-${systemId}`;
    nodes.push({
      id: targetToolId,
      nodeType: 'api',
      name: 'External Action Endpoint',
      metadata: {
        containment: hasContainment,
        d10Score: d10 ? d10.cap : null
      },
      provenance: {
        source: 'track_d_export',
        dimension: 'D10',
        field: 'cap',
        value: d10 ? d10.cap.toString() : 'na',
        derivationRule: 'd10_containment_to_tool_metadata'
      }
    });

    edges.push({
      id: `edge-call-${systemId}-1`,
      sourceNodeId: agentNodeId,
      targetNodeId: targetToolId,
      edgeType: 'calls',
      actionReversibility: actionReversibility === 'unknown' ? undefined : actionReversibility,
      requiresHumanApproval: requiresHumanApproval ?? false, // preserved as false when cap=0
      trustBoundary: trustBoundary,
      permissionScope: 'action:execute',
      description: notes['1'] || notes['3'] || notes['10'] || 'Agent automated action execution',
      provenance: {
        source: 'track_d_export',
        dimension: 'D1/D3',
        field: 'cap',
        value: `D1_cap=${d1.cap};D3_cap=${d3?.cap ?? 'na'}`,
        derivationRule: 'd1_reversibility_and_d3_approval_to_edge'
      }
    });
  }

  // ------------------------------------------------------------
  // D5: Delegation Boundaries -> delegates_to edge
  // Only when D5 is assessed and indicates external delegation
  // ------------------------------------------------------------
  const d5 = dimensions['5'];
  const d5Notes = (notes['5'] || '').toLowerCase();
  if (d5 && !d5.na) {
    const isExternalDelegation = d5.cap === 0 || 
                                 d5Notes.includes('external') || 
                                 d5Notes.includes('sub-agent') || 
                                 d5Notes.includes('third-party') || 
                                 d5Notes.includes('mcp');

    if (isExternalDelegation) {
      const subAgentNodeId = `node-external-agent-${systemId}`;
      nodes.push({
        id: subAgentNodeId,
        nodeType: 'external_agent',
        name: 'Downstream Delegated Sub-Agent',
        metadata: {
          delegationScore: d5.cap,
          notes: notes['5'] || ''
        },
        provenance: {
          source: 'track_d_export',
          dimension: 'D5',
          field: 'notes',
          value: notes['5'] || `cap=${d5.cap}`,
          derivationRule: 'd5_delegation_to_external_agent_node'
        }
      });

      edges.push({
        id: `edge-delegate-${systemId}-1`,
        sourceNodeId: agentNodeId,
        targetNodeId: subAgentNodeId,
        edgeType: 'delegates_to',
        requiresHumanApproval: false,
        trustBoundary: d5Notes.includes('internal') ? 'internal' : (d5Notes.includes('partner') ? 'partner' : 'external'),
        permissionScope: 'agent:delegate',
        description: notes['5'] || 'Delegation to downstream sub-agent',
        provenance: {
          source: 'track_d_export',
          dimension: 'D5',
          field: 'cap',
          value: d5.cap.toString(),
          derivationRule: 'd5_unbounded_delegation_to_edge'
        }
      });
    }
  }

  // ------------------------------------------------------------
  // D8: Model Provenance -> Model Node
  // Only when D8 notes mention a specific model or provenance
  // ------------------------------------------------------------
  const d8 = dimensions['8'];
  const d8Notes = notes['8'] || '';
  if (d8 && !d8.na && d8Notes.trim().length > 0) {
    const modelNodeId = `node-model-${systemId}`;
    nodes.push({
      id: modelNodeId,
      nodeType: 'model',
      name: d8Notes.length > 50 ? `${d8Notes.substring(0, 47)}...` : d8Notes,
      metadata: {
        provenanceScore: d8.cap,
        assuranceScore: d8.evid,
        notes: d8Notes
      },
      provenance: {
        source: 'track_d_export',
        dimension: 'D8',
        field: 'notes',
        value: d8Notes,
        derivationRule: 'd8_notes_to_model_node'
      }
    });

    edges.push({
      id: `edge-reads-model-${systemId}`,
      sourceNodeId: agentNodeId,
      targetNodeId: modelNodeId,
      edgeType: 'reads',
      requiresHumanApproval: false,
      trustBoundary: 'internal',
      permissionScope: 'model:inference',
      description: `Agent uses foundation model: ${d8Notes}`,
      provenance: {
        source: 'track_d_export',
        dimension: 'D8',
        field: 'notes',
        value: d8Notes,
        derivationRule: 'd8_model_inference_edge'
      }
    });
  }

  return {
    systemId,
    nodes,
    edges,
    derivedAt,
    sourceArtifactHash
  };
}
