export type AuthorityNodeType = "agent" | "model" | "memory" | "tool" | "api" | "data_source" | "external_agent" | "identity";
export type AuthorityEdgeType = "reads" | "writes" | "calls" | "delegates_to" | "authenticates_as";
export type Reversibility = "reversible" | "partially_reversible" | "irreversible";
export type TrustBoundary = "internal" | "partner" | "external" | "unknown";
export type AssessmentLevel = "L1_diagnostic" | "L2_validated" | "L3_partnered";
export type AssessmentStatus = "intake" | "mapping" | "diagnostics" | "human_review" | "report_ready" | "delivered";
export type FindingSeverity = "critical" | "high" | "medium" | "low" | "informational";
export type FindingConfidence = "low" | "moderate" | "high";
export type EvidenceLevel = "E0_claimed" | "E1_documented" | "E2_observed" | "E3_validated" | "E4_adversarially_tested";
export type EvidenceType = "document" | "log_excerpt" | "test_result" | "screenshot" | "config_extract" | "client_statement";
export type SubmittedByType = "client" | "operator" | "reviewer" | "test_harness";

export interface TrackDDimensionImport {
  dimensionId: number;
  title: string;
  capabilityScore: number;   // 0-3
  assuranceScore: number;    // 0-4
  isNA: boolean;
  auditorNotes: string;
  /** What the Track D user claimed as evidence level (0-4 scale) */
  claimedAssuranceLevel: number;
  /** The Assurance-system evidence level: always E0 or E1 at import */
  gatedEvidenceLevel: EvidenceLevel;
  evidenceProvenance: 'track_d_self_assessment';
}

/** Track D diagnostic context stored as JSONB on the assessment.
 * This is the self_assessment_context field per Settled Decision 1.
 * It preserves the complete Track D positioning as diagnostic context,
 * never feeding into Finding severity, confidence, or evidence_level. */
export interface TrackDSelfAssessmentContext {
  schemaVersion: string;
  generatedAt: string;
  importedAt: string;
  sourceArtifactHash: string;
  metadata: Record<string, any>;
  diligenceMatrix: Record<string, any>;
  narrative: Record<string, any>;
  floorRulesTriggered: string[];
  regulatoryMapping: Record<string, { title: string; tags: string[] }>;
  dimensionScores: TrackDDimensionImport[];
}

export interface TrackDImportResult {
  assessment: {
    level: AssessmentLevel;
    status: AssessmentStatus;
  };
  selfAssessmentContext: TrackDSelfAssessmentContext;
  evidenceClaims: Array<{
    dimensionId: number;
    submittedByType: SubmittedByType;
    supportsLevel: EvidenceLevel;
    evidenceType: EvidenceType;
    content: string;
    provenance: string;
  }>;
  floorConditions: {
    d2Backstop: boolean;
    d3NoOverride: boolean;
    d10NoContainment: boolean;
    opacityPenalty: boolean;
    opacityCount: number;
  };
  sourceArtifact: {
    hash: string;
    rawJson: string;
  };
}

/**
 * Phase 6 Epistemic Evidence Types
 * Separates what happened epistemically (evidence level) from who/how it was collected.
 */
export type EvidenceSourceType = 'client' | 'system' | 'reviewer' | 'authorized_tester';
export type CollectionMethodType = 'manual_upload' | 'automated_telemetry' | 'controlled_test' | 'adversarial_test';

export interface ValidationTestRecord {
  testId: string;
  objective: string;
  preconditions?: string;
  steps: string[];
  inputs?: Record<string, unknown>;
  expectedResult: string;
  observedResult: string;
  environment: 'sandbox' | 'staging' | 'production' | 'simulated';
  testerIdentity: string;
  timestamp: string;
  outcome: 'pass' | 'fail' | 'indeterminate';
  artifacts?: Array<{ name: string; hash: string; uri?: string }>;
}

export interface AdversarialTestRecord extends ValidationTestRecord {
  authorizationScope: string;
  attackClass: string;
  payloadMethod: string;
}

export interface EpistemicEvidenceRecord {
  id: string;
  findingId: string;
  supportsLevel: EvidenceLevel;
  evidenceType: EvidenceType;
  content: string;
  contentHash: string;
  source: EvidenceSourceType;
  collector: string;
  collectionMethod: CollectionMethodType;
  collectedAt: string;
  validationTest?: ValidationTestRecord;
  adversarialTest?: AdversarialTestRecord;
  supersededBy?: string;
}

