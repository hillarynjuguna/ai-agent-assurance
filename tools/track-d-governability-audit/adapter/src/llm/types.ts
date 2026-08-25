/**
 * Phase 5 LLM types — structural contracts for all LLM-produced objects.
 * These mirror the JSON schemas in docs/assurance-mvp-spec/src/schemas/
 * for compile-time safety and runtime validation.
 */

export type LlmEvidenceLevel = 'E0_claimed' | 'E1_documented';
export type LlmSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type LlmConfidence = 'low' | 'moderate' | 'high';

/** A single candidate finding drafted by the LLM. */
export interface LlmCandidateFinding {
  title: string;
  description: string;
  severity: LlmSeverity;
  confidence: LlmConfidence;
  /** HARD CAP — schema prevents E2+. */
  evidence_level: LlmEvidenceLevel;
  framework_reference_code: string;
  authority_map_ref: {
    node_id?: string;
    edge_id?: string;
    /** True if the ref was proposed by LLM rather than derived deterministically. */
    is_llm_proposed?: boolean;
  };
  basis: string;
  self_assessed_certainty_note?: string;
}

/**
 * A contradiction surfaced by the LLM between two source material excerpts.
 * The LLM must NOT resolve it — resolution is a human reviewer task.
 */
export interface LlmContradiction {
  subject: string;
  source_a_excerpt: string;
  source_b_excerpt: string;
  status: 'unresolved';
}

/** The full finding-draft output from the LLM. */
export interface LlmFindingDraftOutput {
  findings: LlmCandidateFinding[];
  contradictions: LlmContradiction[];
  unknowns: string[];
}

/** A candidate Authority Map node proposed by the LLM. */
export interface LlmCandidateNode {
  temp_id: string;
  node_type: 'agent' | 'model' | 'memory' | 'tool' | 'api' | 'data_source' | 'external_agent' | 'identity';
  name: string;
  identity?: string;
  source_excerpt: string;
}

/** A candidate Authority Map edge proposed by the LLM. */
export interface LlmCandidateEdge {
  source_temp_id: string;
  target_temp_id: string;
  edge_type: 'reads' | 'writes' | 'calls' | 'delegates_to' | 'authenticates_as';
  permission_scope: string;
  requires_human_approval: boolean | null;
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted' | null;
  action_reversibility: 'reversible' | 'partially_reversible' | 'irreversible' | null;
  source_excerpt: string;
}

/** Full architecture extraction output. */
export interface LlmArchitectureExtractionOutput {
  nodes: LlmCandidateNode[];
  edges: LlmCandidateEdge[];
  extraction_confidence: LlmConfidence;
  unresolved_questions: string[];
  contradictions: LlmContradiction[];
}

/** Metadata recorded for every LLM run (Invariant: LLM run ≠ System Snapshot). */
export interface LlmRunMetadata {
  runId: string;             // UUID or unique execution identifier
  systemSnapshotId: string;  // References the System Snapshot being assessed
  sourceHash: string;        // Content hash of the source passed to the LLM
  modelProvider: string;     // e.g. "nvidia", "mock", "anthropic"
  modelId: string;           // e.g. "meta/llama-3.3-70b-instruct", "mock-deterministic-v1"
  promptVersion: string;     // e.g. "phase5-v1"
  executedAt: string;        // ISO 8601
  durationMs: number;
  isSimulated: boolean;      // true in tests; false in live API calls
}

/** The full result of one LLM-assisted assessment pass. */
export interface LlmAssessmentResult {
  runMetadata: LlmRunMetadata;
  architectureExtraction: LlmArchitectureExtractionOutput;
  findingDraft: LlmFindingDraftOutput;
}
