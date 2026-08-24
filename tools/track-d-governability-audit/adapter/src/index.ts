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
