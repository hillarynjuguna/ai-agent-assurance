import { FindingSeverity } from './assurance-types';

export const MAPPING_VERSION = '1.0.0';

export interface DimensionMapping {
  frameworkRefs: string[];
  authorityMapImplication: string;
  hasDeterministicRule: boolean;
  isFloorRule?: boolean;
  findingSeverityWhenZero?: FindingSeverity;
  useLLMDraft?: boolean;
}

export const TRACK_D_DIMENSION_MAP: Record<number, DimensionMapping> = {
  1: { // Reversibility Classification
    frameworkRefs: ['ASI01', 'ACSC-ISM-AccessControl'],
    authorityMapImplication: 'edge_reversibility', // maps to edge.action_reversibility
    hasDeterministicRule: true,  // Rule 1 in 05-ASSESSMENT-ENGINE.md
    findingSeverityWhenZero: 'critical',
  },
  2: { // Audit Provenance
    frameworkRefs: [],  // No direct ASI mapping, maps to Evidence Ledger provenance
    authorityMapImplication: 'assessment_context', // D2 backstop is a floor rule, not a finding
    hasDeterministicRule: false,
    isFloorRule: true,  // D2 evid=0 triggers backstop
  },
  3: { // Human Override
    frameworkRefs: ['ASI01'],
    authorityMapImplication: 'edge_human_approval', // maps to edge.requires_human_approval
    hasDeterministicRule: true,  // Part of Rule 1
    isFloorRule: true,  // D3 cap=0 triggers floor rule
    findingSeverityWhenZero: 'critical',
  },
  4: { // Behavioral Verification
    frameworkRefs: [],  // No direct deterministic rule
    authorityMapImplication: 'assessment_context',
    hasDeterministicRule: false,
    useLLMDraft: true,  // Route through finding-draft path
  },
  5: { // Delegation Boundaries
    frameworkRefs: ['ASI07', 'ASI09'],
    authorityMapImplication: 'edge_delegation', // maps to delegates_to edges
    hasDeterministicRule: true,  // Rule 2
  },
  6: { // Counterparty Risk Profile
    frameworkRefs: [],
    authorityMapImplication: 'assessment_context',
    hasDeterministicRule: false,
    useLLMDraft: true,  // Build task 2: soft dimension
  },
  7: { // Institutional Legibility
    frameworkRefs: [],
    authorityMapImplication: 'assessment_context',
    hasDeterministicRule: false,
    useLLMDraft: true,  // Build task 2: soft dimension
  },
  8: { // Model Provenance
    frameworkRefs: [],  // No deterministic rule, but maps to node(model)
    authorityMapImplication: 'node_model', // seed a model node if provenance info exists
    hasDeterministicRule: false,
    useLLMDraft: true,
  },
  9: { // Incident Response
    frameworkRefs: [],
    authorityMapImplication: 'assessment_context',
    hasDeterministicRule: false,
    useLLMDraft: true,
  },
  10: { // Containment & Blast Radius
    frameworkRefs: ['ASI08'],
    authorityMapImplication: 'edge_containment', // maps to trust_boundary
    hasDeterministicRule: true,  // Build task 3: new D10 rule
    isFloorRule: true,  // D10 cap=0 triggers floor rule
    findingSeverityWhenZero: 'high',
  },
};
