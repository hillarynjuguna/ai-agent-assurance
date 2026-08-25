/**
 * Phase 5 LLM Assessment Orchestrator
 * 
 * Pipeline:
 *   System Snapshot
 *     ↓ (deterministic baseline already run by Phase 3 rules)
 *   LLM architecture extraction
 *     ↓ deterministic validation
 *   LLM finding drafts
 *     ↓ deterministic validation
 *   Comparison: deterministic baseline vs LLM-assisted
 *     ↓
 *   LlmAssessmentResult (snapshot-bound, never floating)
 */

import { createHash } from 'crypto';
import type { LlmRunMetadata, LlmCandidateFinding, LlmContradiction } from './types';
import type { LlmAdapter } from './adapter';
import { 
  validateLlmFindingDraft, 
  validateLlmArchitectureExtraction, 
  detectDeterministicConflicts, 
  type FindingValidationResult, 
  type ArchitectureValidationResult, 
  type DeterministicConflict 
} from './validate';
import { buildRunMetadata } from './adapter';
import type { SeededAuthorityMap } from '../authority-map-seed';
import type { CandidateFinding } from '../rules/types';
import type { SoftDimensionDraftBatch } from '../soft-dimensions';

/** The full result of a Phase 5 LLM-assisted assessment pass. */
export interface LlmAssessmentPass {
  runMetadata: LlmRunMetadata;
  architectureValidation: ArchitectureValidationResult;
  findingValidation: FindingValidationResult;
  deterministicConflicts: DeterministicConflict[];
  contradictions: LlmContradiction[];
  unknowns: string[];
  /** Summary metrics for the unsupported-claim pressure measurement. */
  pressureMetrics: {
    totalLlmFindingsOffered: number;
    totalLlmFindingsAccepted: number;
    totalLlmFindingsRejected: number;
    totalContradictions: number;
    totalUnknowns: number;
    deterministicConflictsFound: number;
    /** Findings that are pure LLM additions (not duplicating deterministic) */
    netNewFindings: number;
    /** Accepted LLM findings that are clearly supported by source evidence */
    supportedFindings: number;
    /** Accepted LLM findings with only weak or uncertain basis */
    uncertainFindings: number;
  };
}

/** Path A (deterministic) + Path B (LLM-assisted) comparison for one system. */
export interface SystemComparisonResult {
  systemId: string;
  snapshotId: string;
  pathA_deterministicFindings: CandidateFinding[];
  pathB_llmPass: LlmAssessmentPass | null;
  pathB_error: string | null;
  comparison: {
    baselineCount: number;
    llmAddedCount: number;
    llmContradictionsFound: number;
    llmUnknownsPreserved: number;
    deterministicConflicts: number;
    /** The LLM added useful analysis beyond the deterministic baseline */
    addedUsefulAnalysis: boolean;
    /** The LLM preserved uncertainty without inventing certainty */
    preservedEpistemicBounds: boolean;
    notes: string[];
  };
}

/**
 * Run the full Phase 5 LLM-assisted assessment pass for one system.
 * The deterministic baseline (Path A) must be pre-computed and passed in.
 */
export async function runLlmAssessmentPass(
  adapter: LlmAdapter,
  systemId: string,
  systemSnapshotId: string,
  systemDescription: string,
  authorityMapSummary: string,
  authorityMap: SeededAuthorityMap,
  softDimensions: SoftDimensionDraftBatch,
  deterministicFindings: CandidateFinding[]
): Promise<LlmAssessmentPass> {
  const sourceHash = createHash('sha256')
    .update(systemId + systemDescription + authorityMapSummary)
    .digest('hex');
  const startTime = Date.now();

  // 1. Architecture extraction
  const rawExtraction = await adapter.extractArchitecture(
    systemId,
    systemDescription,
    authorityMapSummary,
    authorityMap
  );
  const architectureValidation = validateLlmArchitectureExtraction(rawExtraction, authorityMap);

  // 2. Finding drafts
  const rawDraftOutput = await adapter.draftFindings(
    systemSnapshotId,
    softDimensions,
    authorityMap,
    systemDescription,
    authorityMapSummary
  );

  // 3. Deterministic validation of findings
  const findingValidation = validateLlmFindingDraft(rawDraftOutput, authorityMap, systemSnapshotId);

  // 4. Detect deterministic conflicts
  const deterministicConflicts = detectDeterministicConflicts(
    deterministicFindings,
    findingValidation.accepted
  );

  // 5. Run metadata
  const endTime = Date.now();
  const runMetadata = buildRunMetadata(
    adapter,
    systemSnapshotId,
    sourceHash,
    new Date(startTime).toISOString(),
    endTime - startTime,
    adapter.modelId.startsWith('mock')
  );

  // Combine contradictions from both extraction and drafts
  const allContradictions = [
    ...architectureValidation.accepted.contradictions,
    ...rawDraftOutput.contradictions
  ];

  // Combine unknowns / unresolved questions
  const allUnknowns = [
    ...architectureValidation.accepted.unresolved_questions,
    ...rawDraftOutput.unknowns
  ];

  // 6. Pressure metrics
  const accepted = findingValidation.accepted;
  const netNewFindings = accepted.filter(f => {
    const sharedRef = deterministicFindings.some(d =>
      d.frameworkRefs.includes(f.framework_reference_code)
    );
    return !sharedRef;
  }).length;

  const uncertainFindings = accepted.filter(f =>
    f.confidence === 'low' ||
    (f.self_assessed_certainty_note !== undefined && f.self_assessed_certainty_note.length > 0)
  ).length;

  return {
    runMetadata,
    architectureValidation,
    findingValidation,
    deterministicConflicts,
    contradictions: allContradictions,
    unknowns: allUnknowns,
    pressureMetrics: {
      totalLlmFindingsOffered: findingValidation.validationSummary.totalOffered,
      totalLlmFindingsAccepted: findingValidation.validationSummary.totalAccepted,
      totalLlmFindingsRejected: findingValidation.validationSummary.totalRejected,
      totalContradictions: allContradictions.length,
      totalUnknowns: allUnknowns.length,
      deterministicConflictsFound: deterministicConflicts.length,
      netNewFindings,
      supportedFindings: accepted.length - uncertainFindings,
      uncertainFindings,
    },
  };
}

/** Produces a structured comparison between Path A and Path B. */
export function compareAssessmentPaths(
  systemId: string,
  snapshotId: string,
  pathA: CandidateFinding[],
  pathB: LlmAssessmentPass | null,
  error: string | null
): SystemComparisonResult {
  if (!pathB) {
    return {
      systemId,
      snapshotId,
      pathA_deterministicFindings: pathA,
      pathB_llmPass: null,
      pathB_error: error,
      comparison: {
        baselineCount: pathA.length,
        llmAddedCount: 0,
        llmContradictionsFound: 0,
        llmUnknownsPreserved: 0,
        deterministicConflicts: 0,
        addedUsefulAnalysis: false,
        preservedEpistemicBounds: false,
        notes: [`LLM pass failed: ${error}`],
      },
    };
  }

  const { pressureMetrics, contradictions, unknowns } = pathB;
  const addedUsefulAnalysis = pressureMetrics.netNewFindings > 0 || contradictions.length > 0;
  const preservedEpistemicBounds =
    pressureMetrics.totalLlmFindingsRejected === 0 ||
    pathB.findingValidation.rejected.every(r =>
      !r.failures.some(f => f.rule === 'evidence_level_cap')
    );

  const notes: string[] = [];
  if (pressureMetrics.deterministicConflictsFound > 0) {
    notes.push(`LLM attempted to lower severity of ${pressureMetrics.deterministicConflictsFound} deterministic finding(s) — override blocked.`);
  }
  if (contradictions.length > 0) {
    notes.push(`LLM surfaced ${contradictions.length} contradiction(s) rather than silently resolving them — correct behavior.`);
  }
  if (unknowns.length > 0) {
    notes.push(`LLM preserved ${unknowns.length} unknown(s) — correct epistemic behavior.`);
  }
  if (pressureMetrics.totalLlmFindingsRejected > 0) {
    notes.push(`Validation rejected ${pressureMetrics.totalLlmFindingsRejected} LLM finding(s) — invariants enforced.`);
  }

  return {
    systemId,
    snapshotId,
    pathA_deterministicFindings: pathA,
    pathB_llmPass: pathB,
    pathB_error: null,
    comparison: {
      baselineCount: pathA.length,
      llmAddedCount: pressureMetrics.netNewFindings,
      llmContradictionsFound: contradictions.length,
      llmUnknownsPreserved: unknowns.length,
      deterministicConflicts: pressureMetrics.deterministicConflictsFound,
      addedUsefulAnalysis,
      preservedEpistemicBounds,
      notes,
    },
  };
}
