// Core adapter
export { validateTrackDExport } from './validate';
export { hashTrackDExport } from './hash';
export { translateTrackDToAssurance } from './translate';
export { TRACK_D_DIMENSION_MAP, MAPPING_VERSION } from './dimension-map';
export type { DimensionMapping } from './dimension-map';
export type { TrackDExportV610, ValidatedTrackDExport } from './track-d-types';
export type { TrackDImportResult, TrackDSelfAssessmentContext, TrackDDimensionImport } from './assurance-types';

// Soft dimensions (D6/D7 LLM-assisted path)
export { prepareSoftDimensionDrafts, hasDraftableSoftDimensions, LLM_DRAFT_DIMENSIONS } from './soft-dimensions';
export type { SoftDimensionDraftInput, SoftDimensionDraftBatch } from './soft-dimensions';

// Report context section
export { generateTrackDReportContext, renderTrackDContextMarkdown } from './report-context';
export type { TrackDReportContextSection, TrackDDimensionSummary } from './report-context';

// Phase 3: Authority Map Seeder & Provenance
export { seedAuthorityMapFromTrackD } from './authority-map-seed';
export type { 
  SeededAuthorityMap, 
  SeededAuthorityMapNode, 
  SeededAuthorityMapEdge, 
  AuthorityElementProvenance 
} from './authority-map-seed';

// Phase 3: Deterministic Rules Engine
export { 
  executeDeterministicRules,
  evaluateRule1IrreversibleNoApproval,
  evaluateRule2ExternalDelegation,
  evaluateRule3SharedIdentity,
  evaluateD10ContainmentRule
} from './rules/index';
export type { 
  CandidateFinding, 
  AuthorityMapEdgeInput, 
  AuthorityMapNodeInput, 
  RuleExecutionResult 
} from './rules/index';

// Phase 3: Finding Generator
export { generateAssessmentFindings } from './findings';
export type { AssessmentFinding } from './findings';

// Phase 4: Versioned System Identity & System Snapshots
export { 
  createSystemSnapshot,
  createSystemSnapshotFromTrackD,
  diffSystemSnapshots,
  evaluateReassessmentTriggers
} from './snapshots/index';
export type {
  SystemSnapshot,
  SystemSnapshotDiff,
  FieldDiff,
  EdgeModification,
  NodeModification,
  ReassessmentTriggerCondition,
  ReassessmentTriggerEvaluation
} from './snapshots/index';

// Phase 5: LLM-Assisted Extraction & Finding Drafts
export * from './llm';

