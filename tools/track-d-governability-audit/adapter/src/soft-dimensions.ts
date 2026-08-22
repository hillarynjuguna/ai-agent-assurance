/**
 * D6/D7 Soft Dimension → LLM-Assisted Finding Draft Path
 * 
 * Track D dimensions 6 (Counterparty Risk Profile) and 7 (Institutional Legibility)
 * have no deterministic rules — they can't fire against the Authority Map because
 * they describe organizational postures, not structural graph properties.
 * 
 * Instead, auditor notes from these dimensions are routed through the existing
 * LLM-assisted finding-draft pipeline. This module prepares the prompt payload
 * that the Assessment Engine's LLM call will consume.
 * 
 * INVARIANTS:
 * - Drafted findings always have drafted_by = 'llm'
 * - Evidence level is capped at E1_documented (enforced by finding-draft.schema.json)
 * - The LLM cannot mark its own findings as reviewed or validated
 * - submitted_by_type for any evidence created from these notes is 'client'
 */

import type { EvidenceLevel, FindingSeverity, FindingConfidence } from './assurance-types.js';
import { TRACK_D_DIMENSION_MAP } from './dimension-map.js';
import type { ValidatedTrackDExport } from './track-d-types.js';

/** The dimensions that use LLM-assisted finding drafts instead of deterministic rules */
export const LLM_DRAFT_DIMENSIONS = [4, 6, 7, 8, 9] as const;

/** Context payload for a single soft dimension, ready for the LLM finding-draft call */
export interface SoftDimensionDraftInput {
  dimensionId: number;
  dimensionTitle: string;
  capabilityScore: number;
  assuranceScore: number;
  auditorNotes: string;
  regulatoryTags: string[];
  /** Structured prompt context for the LLM */
  promptContext: string;
  /** Maximum evidence level the LLM can assign (always E1) */
  maxEvidenceLevel: 'E1_documented';
  /** Framework references to anchor the LLM's reasoning */
  relevantFrameworkRefs: string[];
}

/** Result of preparing soft dimensions for LLM draft */
export interface SoftDimensionDraftBatch {
  assessmentId?: string;
  dimensions: SoftDimensionDraftInput[];
  /** Number of dimensions that had substantive auditor notes */
  dimensionsWithNotes: number;
  /** Number of dimensions skipped (NA or no meaningful content) */
  dimensionsSkipped: number;
}

/**
 * Prepares soft-dimension auditor notes for the LLM finding-draft pipeline.
 * 
 * Only dimensions marked with `useLLMDraft: true` in the dimension map are included.
 * Dimensions that are N/A or have empty notes produce minimal prompt context.
 * 
 * @param validated - The validated Track D export
 * @param assessmentId - Optional assessment UUID for traceability
 * @returns A batch of structured inputs ready for the LLM finding-draft call
 */
export function prepareSoftDimensionDrafts(
  validated: ValidatedTrackDExport,
  assessmentId?: string
): SoftDimensionDraftBatch {
  const dimensions: SoftDimensionDraftInput[] = [];
  let dimensionsWithNotes = 0;
  let dimensionsSkipped = 0;

  for (const dimId of LLM_DRAFT_DIMENSIONS) {
    const mapping = TRACK_D_DIMENSION_MAP[dimId];
    if (!mapping || !mapping.useLLMDraft) continue;

    const dimKey = dimId.toString();
    const dim = validated.assessment.dimensions[dimKey];
    const notes = validated.assessment.notes[dimKey] || '';
    const regulatory = validated.regulatoryMapping[`D${dimId}`];

    if (!dim || dim.na) {
      dimensionsSkipped++;
      continue;
    }

    const hasSubstantiveNotes = notes.trim().length > 10;
    if (hasSubstantiveNotes) {
      dimensionsWithNotes++;
    } else {
      dimensionsSkipped++;
      continue;
    }

    const title = regulatory?.title || `Dimension ${dimId}`;
    const tags = regulatory?.tags || [];

    // Build structured prompt context for the LLM
    const promptContext = buildPromptContext(dimId, title, dim.cap, dim.evid, notes, tags);

    dimensions.push({
      dimensionId: dimId,
      dimensionTitle: title,
      capabilityScore: dim.cap,
      assuranceScore: dim.evid,
      auditorNotes: notes,
      regulatoryTags: tags,
      promptContext,
      maxEvidenceLevel: 'E1_documented',
      relevantFrameworkRefs: mapping.frameworkRefs,
    });
  }

  return {
    assessmentId,
    dimensions,
    dimensionsWithNotes,
    dimensionsSkipped,
  };
}

/**
 * Builds structured prompt context for a single soft dimension.
 * This context is consumed by the LLM finding-draft call, constrained by
 * the finding-draft.schema.json which caps evidence_level at E1.
 */
function buildPromptContext(
  dimId: number,
  title: string,
  cap: number,
  evid: number,
  notes: string,
  regulatoryTags: string[]
): string {
  const capDescriptions: Record<number, string> = {
    0: 'Absent — no controls exist',
    1: 'Minimal — ad hoc or informal controls',
    2: 'Partial — systematic but not enforced',
    3: 'Complete — comprehensive and enforced',
  };

  const evidDescriptions: Record<number, string> = {
    0: 'No evidence — verbal claim only',
    1: 'Statement/documentation — policies or stated intentions',
    2: 'Internal logs — system telemetry or internal tests',
    3: 'Automated verification — CI/CD or continuous monitoring',
    4: 'External proof — third-party audit or cryptographic attestation',
  };

  const lines = [
    `DIMENSION: D${dimId} — ${title}`,
    `CAPABILITY LEVEL: ${cap}/3 (${capDescriptions[cap] || 'Unknown'})`,
    `EVIDENCE LEVEL: ${evid}/4 (${evidDescriptions[evid] || 'Unknown'})`,
    `REGULATORY CONTEXT: ${regulatoryTags.length > 0 ? regulatoryTags.join(', ') : 'None mapped'}`,
    '',
    'AUDITOR NOTES (from Track D self-assessment):',
    notes,
    '',
    'INSTRUCTIONS:',
    '- Analyze the auditor notes for potential findings against the regulatory context.',
    '- Any finding you draft MUST have evidence_level = "E0_claimed" or "E1_documented".',
    '- You are reading self-reported notes, not observing a live system. Do not claim E2+.',
    '- If the notes describe sophisticated controls, note them but do not upgrade evidence.',
    '- Your findings will be reviewed by a human assessor before becoming official.',
    `- Mark your findings with drafted_by = "llm" and source_dimension = "D${dimId}".`,
  ];

  return lines.join('\n');
}

/**
 * Checks whether a Track D export has any soft dimensions worth sending to the LLM.
 * Use this to skip the LLM call entirely if there's nothing substantive to draft.
 */
export function hasDraftableSoftDimensions(validated: ValidatedTrackDExport): boolean {
  for (const dimId of LLM_DRAFT_DIMENSIONS) {
    const dimKey = dimId.toString();
    const dim = validated.assessment.dimensions[dimKey];
    const notes = validated.assessment.notes[dimKey] || '';

    if (dim && !dim.na && notes.trim().length > 10) {
      return true;
    }
  }
  return false;
}
