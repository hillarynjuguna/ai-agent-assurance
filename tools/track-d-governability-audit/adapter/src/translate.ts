import { ValidatedTrackDExport } from './track-d-types';
import { 
  TrackDImportResult, 
  EvidenceLevel, 
  TrackDDimensionImport,
  TrackDSelfAssessmentContext,
  EvidenceType,
  SubmittedByType
} from './assurance-types';
import { TRACK_D_DIMENSION_MAP } from './dimension-map';

/**
 * Maps Track D's 0-4 evidence scale to Assurance MVP EvidenceLevel.
 * Per Settled Decision 2: The Evidence row's supports_level reflects what
 * Track D claimed. The SQL trigger `enforce_evidence_integrity` on the
 * findings table prevents upgrading a Finding's evidence_level to E2+
 * unless qualifying evidence from a 'reviewer' or 'test_harness' exists.
 */
function mapClaimedEvidenceLevel(evidNum: number): EvidenceLevel {
  switch (evidNum) {
    case 0: return 'E0_claimed';
    case 1: return 'E1_documented';
    case 2: return 'E2_observed';
    case 3: return 'E3_validated';
    case 4: return 'E4_adversarially_tested';
    default: return 'E0_claimed';
  }
}

/** Dimension titles by ID, matching Track D v6.1 DIMENSIONS constant */
const DIMENSION_TITLES: Record<number, string> = {
  1: 'Reversibility Classification',
  2: 'Audit Provenance',
  3: 'Human Override Capability',
  4: 'Behavioral Verification',
  5: 'Delegation Boundaries',
  6: 'Counterparty Risk Profile',
  7: 'Institutional Legibility',
  8: 'Model Provenance & Supply Chain',
  9: 'Incident Response',
  10: 'Containment & Blast Radius',
};

/**
 * Translates a validated Track D v6.1 export into Assurance MVP domain types.
 * 
 * @param validated - The validated Track D export with parsed numeric dimensions
 * @param sourceArtifactHash - SHA-256 of the raw JSON source
 * @param importTimestamp - ISO 8601 timestamp of when the import occurred
 */
export function translateTrackDToAssurance(
  validated: ValidatedTrackDExport,
  sourceArtifactHash: string,
  importTimestamp: string
): TrackDImportResult {
  const dimensionScores: TrackDDimensionImport[] = [];
  const evidenceClaims: TrackDImportResult['evidenceClaims'] = [];

  // Floor condition detection (from dimension scores, not from floorRulesTriggered strings)
  let d2Backstop = false;
  let d3NoOverride = false;
  let d10NoContainment = false;
  let naCount = 0;

  for (let i = 1; i <= 10; i++) {
    const dimKey = i.toString();
    const dim = validated.assessment.dimensions[dimKey];
    const notes = validated.assessment.notes[dimKey] || '';
    const regulatory = validated.regulatoryMapping[`D${i}`];

    if (!dim) continue;

    if (dim.na) {
      naCount++;
    }

    const claimedAssuranceLevel = dim.na ? -1 : dim.evid;
    // Finding evidence_level is CAPPED at E1_documented for client-submitted evidence
    const gatedEvidenceLevel: EvidenceLevel = (!dim.na && dim.evid > 0) ? 'E1_documented' : 'E0_claimed';
    // Evidence row supports_level reflects full Track D claim
    const supportsLevel: EvidenceLevel = dim.na ? 'E0_claimed' : mapClaimedEvidenceLevel(dim.evid);

    const title = regulatory?.title || DIMENSION_TITLES[i] || `Dimension ${i}`;

    dimensionScores.push({
      dimensionId: i,
      title,
      capabilityScore: dim.na ? -1 : dim.cap,
      assuranceScore: dim.na ? -1 : dim.evid,
      isNA: dim.na,
      auditorNotes: notes,
      claimedAssuranceLevel,
      gatedEvidenceLevel,
      evidenceProvenance: 'track_d_self_assessment'
    });

    if (!dim.na) {
      evidenceClaims.push({
        dimensionId: i,
        submittedByType: 'client',
        supportsLevel,
        evidenceType: 'client_statement',
        content: notes
          ? `[track_d_self_assessment] D${i} (${title}): ${notes}`
          : `[track_d_self_assessment] Client claims capability level ${dim.cap} and evidence level ${dim.evid} for D${i} (${title}).`,
        provenance: 'track_d_self_assessment'
      });

      // Floor condition detection from actual dimension scores
      if (i === 2 && dim.evid === 0) d2Backstop = true;
      if (i === 3 && dim.cap === 0) d3NoOverride = true;
      if (i === 10 && dim.cap === 0) d10NoContainment = true;
    }
  }

  const selfAssessmentContext: TrackDSelfAssessmentContext = {
    schemaVersion: validated.schemaVersion,
    generatedAt: validated.generatedAt,
    importedAt: importTimestamp,
    sourceArtifactHash,
    metadata: validated.assessment.metadata,
    diligenceMatrix: validated.diligenceMatrix,
    narrative: validated.narrative,
    floorRulesTriggered: validated.floorRulesTriggered,
    regulatoryMapping: validated.regulatoryMapping,
    dimensionScores
  };

  return {
    assessment: {
      level: 'L1_diagnostic',
      status: 'intake'
    },
    selfAssessmentContext,
    evidenceClaims,
    floorConditions: {
      d2Backstop,
      d3NoOverride,
      d10NoContainment,
      opacityPenalty: naCount > 2,
      opacityCount: naCount,
    },
    sourceArtifact: {
      hash: sourceArtifactHash,
      rawJson: JSON.stringify(validated)
    }
  };
}

