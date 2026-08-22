/**
 * Track D Diagnostic Context — Report Section Generator
 * 
 * Renders the Track D self-assessment context as a clearly labeled,
 * dated section in the Assurance Report. This is the "context" section
 * per Settled Decision 1: it shows where the client positioned themselves
 * before independent assessment, but it is explicitly NOT evidence.
 * 
 * The section includes a provenance disclaimer and is never averaged
 * with or blended into finding severity, confidence, or evidence levels.
 */

import type { TrackDSelfAssessmentContext, TrackDDimensionImport } from './assurance-types.js';

/** Structured report section for Track D diagnostic context */
export interface TrackDReportContextSection {
  sectionTitle: string;
  provenanceDisclaimer: string;
  assessmentDate: string;
  importDate: string;
  sourceHash: string;
  assessorName: string;
  assessorConfidence: string;
  companyName: string;
  diligencePositioning: {
    capabilityPercent: number | null;
    assurancePercent: number | null;
    quadrant: string;
    relianceRecommendation: string;
    relianceRationale: string;
  };
  floorRulesTriggered: string[];
  dimensionSummaries: TrackDDimensionSummary[];
  regulatoryMappingSummary: string;
}

export interface TrackDDimensionSummary {
  dimensionId: number;
  title: string;
  capabilityScore: number;
  assuranceScore: number;
  isNA: boolean;
  /** The self-assessment evidence level (Track D scale), not the Assurance MVP level */
  claimedAssuranceLevel: number;
  /** Assurance MVP gated level (always E0 or E1) */
  gatedEvidenceLevel: string;
  auditorNotes: string;
  regulatoryTags: string[];
}

/**
 * Generates the Track D diagnostic context section for inclusion in an
 * Assurance Report. This section is informational context, not evidence.
 */
export function generateTrackDReportContext(
  context: TrackDSelfAssessmentContext
): TrackDReportContextSection {
  const metadata = context.metadata as Record<string, string>;
  const matrix = context.diligenceMatrix as Record<string, unknown>;
  const narrative = context.narrative as Record<string, string>;

  const dimensionSummaries: TrackDDimensionSummary[] = context.dimensionScores.map(
    (dim: TrackDDimensionImport) => {
      const regMap = context.regulatoryMapping[`D${dim.dimensionId}`];
      return {
        dimensionId: dim.dimensionId,
        title: dim.title,
        capabilityScore: dim.capabilityScore,
        assuranceScore: dim.assuranceScore,
        isNA: dim.isNA,
        claimedAssuranceLevel: dim.claimedAssuranceLevel,
        gatedEvidenceLevel: dim.gatedEvidenceLevel,
        auditorNotes: dim.auditorNotes,
        regulatoryTags: regMap?.tags || [],
      };
    }
  );

  // Build regulatory mapping summary
  const regulatoryMappingSummary = Object.entries(context.regulatoryMapping)
    .map(([key, val]) => `${key} (${val.title}): ${val.tags.join(', ')}`)
    .join('\n');

  return {
    sectionTitle: 'Track D: Self-Assessment Diagnostic Context',
    provenanceDisclaimer: buildProvenanceDisclaimer(
      metadata.assessor || 'Unknown',
      metadata.date || 'Unknown',
      context.importedAt,
      metadata.confidence || 'unknown',
      context.sourceArtifactHash
    ),
    assessmentDate: metadata.date || '',
    importDate: context.importedAt,
    sourceHash: context.sourceArtifactHash,
    assessorName: metadata.assessor || '',
    assessorConfidence: metadata.confidence || '',
    companyName: metadata.company || '',
    diligencePositioning: {
      capabilityPercent: (matrix.capabilityScore as number | null) ?? null,
      assurancePercent: (matrix.assuranceScore as number | null) ?? null,
      quadrant: (matrix.quadrant as string) || 'unknown',
      relianceRecommendation: narrative.relianceRecommendation || '',
      relianceRationale: narrative.relianceRationale || '',
    },
    floorRulesTriggered: context.floorRulesTriggered,
    dimensionSummaries,
    regulatoryMappingSummary,
  };
}

/**
 * Builds the provenance disclaimer that MUST appear with the Track D context
 * section. This makes the source, date, and limitations explicit.
 */
function buildProvenanceDisclaimer(
  assessorName: string,
  assessmentDate: string,
  importDate: string,
  assessorConfidence: string,
  sourceHash: string
): string {
  const confidenceDescriptions: Record<string, string> = {
    high: 'full telemetry and code access',
    medium: 'partial access (staging only)',
    low: 'public documentation / black-box only',
  };

  const accessDesc = confidenceDescriptions[assessorConfidence] || 'unspecified access level';

  return [
    'PROVENANCE NOTICE',
    '',
    'This section contains self-assessment positioning data from the Track D',
    'Governability Diagnostic Protocol v6.1. It reflects the client\'s own',
    'evaluation of their governance posture and is NOT independently verified evidence.',
    '',
    `Assessed by: ${assessorName}`,
    `Assessment date: ${assessmentDate}`,
    `Imported into Assurance system: ${importDate}`,
    `Assessor access level: ${accessDesc}`,
    `Source artifact SHA-256: ${sourceHash}`,
    '',
    'This context is provided to give reviewers visibility into the client\'s',
    'self-reported governance position. It must not be treated as verified',
    'evidence or used to upgrade any Finding\'s severity, confidence, or',
    'evidence level. The Diligence Positioning Matrix scores shown here',
    'are weighted self-assessment scores, not Assurance MVP findings.',
  ].join('\n');
}

/**
 * Renders the Track D context as a markdown section for text-based reports.
 */
export function renderTrackDContextMarkdown(
  section: TrackDReportContextSection
): string {
  const lines: string[] = [];

  lines.push(`## ${section.sectionTitle}`);
  lines.push('');
  lines.push('> **' + section.provenanceDisclaimer.split('\n')[0] + '**');
  lines.push('>');
  for (const line of section.provenanceDisclaimer.split('\n').slice(1)) {
    lines.push(`> ${line}`);
  }
  lines.push('');

  // Diligence positioning
  lines.push('### Diligence Positioning Matrix');
  lines.push('');
  const dp = section.diligencePositioning;
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Capability Score | ${dp.capabilityPercent !== null ? dp.capabilityPercent + '%' : 'Incomplete'} |`);
  lines.push(`| Assurance Score | ${dp.assurancePercent !== null ? dp.assurancePercent + '%' : 'Incomplete'} |`);
  lines.push(`| Quadrant | ${dp.quadrant} |`);
  lines.push(`| Reliance Recommendation | ${dp.relianceRecommendation} |`);
  lines.push('');

  if (dp.relianceRationale) {
    lines.push(`**Rationale:** ${dp.relianceRationale}`);
    lines.push('');
  }

  // Floor rules
  if (section.floorRulesTriggered.length > 0) {
    lines.push('### ⚠️ Floor Rules Triggered');
    lines.push('');
    for (const rule of section.floorRulesTriggered) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
  }

  // Dimension table
  lines.push('### Dimension Scores (Self-Reported)');
  lines.push('');
  lines.push('| Dim | Title | Cap | Evid | Gated Level | Notes |');
  lines.push('|-----|-------|-----|------|-------------|-------|');
  for (const dim of section.dimensionSummaries) {
    if (dim.isNA) {
      lines.push(`| D${dim.dimensionId} | ${dim.title} | N/A | N/A | — | — |`);
    } else {
      const notesPreview = dim.auditorNotes.length > 60
        ? dim.auditorNotes.substring(0, 57) + '...'
        : dim.auditorNotes || '—';
      lines.push(
        `| D${dim.dimensionId} | ${dim.title} | ${dim.capabilityScore}/3 | ${dim.assuranceScore}/4 | ${dim.gatedEvidenceLevel} | ${notesPreview} |`
      );
    }
  }
  lines.push('');

  return lines.join('\n');
}
