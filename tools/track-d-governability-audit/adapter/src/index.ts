// Core adapter
export { validateTrackDExport } from './validate.js';
export { hashTrackDExport } from './hash.js';
export { translateTrackDToAssurance } from './translate.js';
export { TRACK_D_DIMENSION_MAP, MAPPING_VERSION } from './dimension-map.js';
export type { DimensionMapping } from './dimension-map.js';
export type { TrackDExportV610, ValidatedTrackDExport } from './track-d-types.js';
export type { TrackDImportResult, TrackDSelfAssessmentContext, TrackDDimensionImport } from './assurance-types.js';

// Soft dimensions (D6/D7 LLM-assisted path)
export { prepareSoftDimensionDrafts, hasDraftableSoftDimensions, LLM_DRAFT_DIMENSIONS } from './soft-dimensions.js';
export type { SoftDimensionDraftInput, SoftDimensionDraftBatch } from './soft-dimensions.js';

// Report context section
export { generateTrackDReportContext, renderTrackDContextMarkdown } from './report-context.js';
export type { TrackDReportContextSection, TrackDDimensionSummary } from './report-context.js';
