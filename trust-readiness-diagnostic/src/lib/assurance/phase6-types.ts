import type { SeededAuthorityMap } from "../../../../tools/track-d-governability-audit/adapter/src/authority-map-seed";
import type { AssessmentFinding } from "../../../../tools/track-d-governability-audit/adapter/src/findings";
import type { LlmAssessmentPass } from "../../../../tools/track-d-governability-audit/adapter/src/llm/orchestrate";
import type { LlmArchitectureExtractionOutput } from "../../../../tools/track-d-governability-audit/adapter/src/llm/types";
import type {
  AssessmentLevel,
  AssessmentStatus,
  EvidenceLevel,
  EvidenceType,
  FindingConfidence,
  FindingSeverity,
  FindingStatus,
  ReviewerRole,
  ReviewDecisionType,
  SubmittedByType,
} from "../../../../docs/assurance-mvp-spec/src/domain/types";

export type FindingOrigin =
  | "deterministic_rule_engine"
  | "llm_proposal"
  | "reviewer"
  | "evidence_observation";

export type FindingDisposition =
  | "confirmed"
  | "rejected"
  | "needs_more_evidence"
  | "accepted_risk"
  | "remediated";

export type AuthorityMapState = "proposed" | "committed";

export interface ProposedAuthorityReference {
  nodeId?: string;
  edgeId?: string;
  isLlmProposed: true;
}

export interface Phase6Finding extends Omit<AssessmentFinding, "draftedBy" | "status" | "evidenceLevel"> {
  status: FindingStatus;
  evidenceLevel: EvidenceLevel;
  snapshotId: string;
  updatedAt?: string;
  draftedBy: string;
  origin: FindingOrigin;
  authorityMapState: AuthorityMapState;
  proposedAuthorityRef?: ProposedAuthorityReference;
  deterministicRule?: string;
  llmRationale?: string;
  evidenceIds: string[];
  reviewerDecisionIds: string[];
  contradictionIds: string[];
  disposition?: FindingDisposition;
}

export interface EvidenceMetadata {
  observationContext?: string;
  observedAt?: string;
  testName?: string;
  procedure?: string;
  expectedResult?: string;
  actualResult?: string;
  result?: "pass" | "fail" | "inconclusive";
  executedAt?: string;
  controlledConditions?: string;
  adversarialScenario?: string;
  authorization?: string;
  targetSnapshotId?: string;
  notes?: string;
}

export interface EvidenceRecord {
  id: string;
  findingId: string;
  evidenceType: EvidenceType;
  contentHash: string;
  storageRef: string;
  supportsLevel: EvidenceLevel;
  submittedByType: SubmittedByType;
  submittedById?: string;
  submittedAt: string;
  supersededBy?: string;
  snapshotId: string;
  metadata: EvidenceMetadata;
}

export type ContradictionState =
  | "unresolved"
  | "resolved_in_favor_of_source_a"
  | "resolved_in_favor_of_source_b"
  | "resolved_by_new_evidence"
  | "accepted_as_unknown";

export interface ContradictionRecord {
  id: string;
  findingId?: string;
  subject: string;
  sourceAExcerpt: string;
  sourceBExcerpt: string;
  state: ContradictionState;
  createdAt: string;
  resolvedAt?: string;
  resolvedByReviewerId?: string;
  resolutionReasoning?: string;
  supportingEvidenceIds: string[];
  sourceHash: string;
}

export interface FindingStateSnapshot {
  status: FindingStatus;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  evidenceLevel: EvidenceLevel;
  disposition?: FindingDisposition;
}

export interface ReviewerDecision {
  id: string;
  decisionVersion: number;
  scope: "authority_map" | "finding" | "contradiction";
  assessmentId: string;
  findingId?: string;
  contradictionId?: string;
  reviewerId: string;
  reviewerRole: ReviewerRole;
  reviewerAuthMode: "environment" | "development_fallback";
  decision: ReviewDecisionType;
  disposition?: FindingDisposition;
  previousFindingState?: FindingStateSnapshot;
  newFindingState?: FindingStateSnapshot;
  previousSeverity?: FindingSeverity;
  newSeverity?: FindingSeverity;
  previousConfidence?: FindingConfidence;
  newConfidence?: FindingConfidence;
  previousEvidenceLevel?: EvidenceLevel;
  newEvidenceLevel?: EvidenceLevel;
  previousStatus?: FindingStatus;
  newStatus?: FindingStatus;
  previousContradictionState?: ContradictionState;
  newContradictionState?: ContradictionState;
  evidenceReferences: string[];
  evidenceSnapshotHash: string;
  reasoning: string;
  createdAt: string;
  snapshotId: string;
  authorityMapElementRefs: string[];
}

export interface IntakeSubmission {
  id: string;
  assessmentId: string;
  contentHash: string;
  contentType: string;
  sourceRef?: string;
  receivedAt: string;
  status: "proposed";
  snapshotId: string;
  architectureExtraction?: LlmArchitectureExtractionOutput;
  extractionModel?: { provider: string; modelId: string; promptVersion: string };
}

export interface DiagnosticsRun {
  id: string;
  assessmentId: string;
  snapshotId: string;
  sourceHash: string;
  executedAt: string;
  llmMode: "mock" | "live";
  llmPass: LlmAssessmentPass;
  deterministicFindingIds: string[];
  llmFindingIds: string[];
  contradictionIds: string[];
  unknowns: string[];
  deterministicConflicts: number;
}

export interface AuthorityMapCommit {
  state: AuthorityMapState;
  committedAt?: string;
  committedByReviewerId?: string;
  decisionId?: string;
  map?: SeededAuthorityMap;
}

export interface Attestation {
  id: string;
  assessmentId: string;
  reviewerId: string;
  reviewerRole: ReviewerRole;
  reviewerAuthMode: "environment" | "development_fallback";
  snapshotId: string;
  reportVersion: string;
  reportHash: string;
  decision: "attested" | "attested_with_residual_risk" | "not_attested";
  scope: string;
  timestamp: string;
  isCryptographicSignature: false;
}

export interface ReportArtifact {
  id: string;
  assessmentId: string;
  snapshotId: string;
  reportVersion: string;
  generatedAt: string;
  substantiveHash: string;
  reportHash: string;
  markdown: string;
  sourceStateFingerprint: string;
}

export interface Phase6State {
  assessmentId: string;
  level: AssessmentLevel;
  status: AssessmentStatus;
  authorityMap: AuthorityMapCommit;
  intakeSubmissions: IntakeSubmission[];
  findings: Phase6Finding[];
  evidence: EvidenceRecord[];
  reviewDecisions: ReviewerDecision[];
  contradictions: ContradictionRecord[];
  diagnosticsRuns: DiagnosticsRun[];
  attestations: Attestation[];
  reports: ReportArtifact[];
  assignedReviewerId?: string;
  assignedReviewerRole?: ReviewerRole;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewerActor {
  reviewerId: string;
  reviewerRole: ReviewerRole;
  authMode: "environment" | "development_fallback";
  submittedByType?: SubmittedByType;
}

export interface EvidenceSubmissionInput {
  evidenceType: EvidenceType;
  contentHash: string;
  storageRef: string;
  supportsLevel: EvidenceLevel;
  snapshotId: string;
  metadata: EvidenceMetadata;
}

export interface ReviewSubmissionInput {
  decision: ReviewDecisionType;
  reasoning: string;
  evidenceSnapshotHash: string;
  evidenceId?: string;
  newSeverity?: FindingSeverity;
  newConfidence?: FindingConfidence;
  disposition?: FindingDisposition;
  contradictionId?: string;
  contradictionState?: ContradictionState;
  contradictionEvidenceIds?: string[];
}

export function phase6FindingFromDeterministic(
  finding: AssessmentFinding,
  snapshotId: string,
): Phase6Finding {
  return {
    ...finding,
    snapshotId,
    draftedBy: finding.draftedBy,
    origin: "deterministic_rule_engine",
    authorityMapState: "committed",
    evidenceIds: [],
    reviewerDecisionIds: [],
    contradictionIds: [],
    llmRationale: undefined,
    deterministicRule: finding.frameworkRefs.join(","),
    disposition: undefined,
  };
}
