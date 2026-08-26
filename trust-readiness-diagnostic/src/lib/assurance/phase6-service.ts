import crypto from "node:crypto";
import {
  executeDeterministicRules,
  generateAssessmentFindings,
  prepareSoftDimensionDrafts,
  validateTrackDExport,
  runLlmAssessmentPass,
  validateLlmArchitectureExtraction,
  MockLlmAdapter,
  OpenAiCompatibleLlmAdapter,
  type SeededAuthorityMap,
  type LlmAssessmentPass,
} from "../../../../tools/track-d-governability-audit/adapter/src/index";
import { canSetEvidenceLevel, EVIDENCE_LEVEL_RANK } from "../../../../docs/assurance-mvp-spec/src/domain/types";
import type { EvidenceType, ReviewerRole } from "../../../../docs/assurance-mvp-spec/src/domain/types";
import {
  getAssuranceAssessment,
  listAssuranceAssessments,
  saveAssuranceAssessment,
  type StoredAssuranceAssessment,
} from "./store";
import type {
  Attestation,
  AuthorityMapCommit,
  ContradictionRecord,
  ContradictionState,
  DiagnosticsRun,
  EvidenceRecord,
  EvidenceSubmissionInput,
  FindingDisposition,
  FindingStateSnapshot,
  Phase6Finding,
  Phase6State,
  ReviewSubmissionInput,
  ReviewerActor,
  ReviewerDecision,
} from "./phase6-types";
import { phase6FindingFromDeterministic } from "./phase6-types";

const REVIEWER_ROLES: ReviewerRole[] = [
  "operator",
  "human_validator",
  "specialist_partner",
  "internal_validator",
];
const EVIDENCE_TYPES: EvidenceType[] = [
  "document",
  "log_excerpt",
  "test_result",
  "screenshot",
  "config_extract",
  "client_statement",
];

export class Phase6Error extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code: string = "phase6_error",
  ) {
    super(message);
    this.name = "Phase6Error";
  }
}

export function phase6ErrorResponse(error: unknown): { error: string; code?: string } {
  if (error instanceof Phase6Error) return { error: error.message, code: error.code };
  return { error: error instanceof Error ? error.message : "Phase 6 operation failed" };
}

function now(): string {
  return new Date().toISOString();
}

function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Phase6Error(`${field} is required and must be non-empty`, 400, "invalid_input");
  }
  return value.trim();
}

function parseReviewerRole(value: string | undefined): ReviewerRole {
  if (value && REVIEWER_ROLES.includes(value as ReviewerRole)) return value as ReviewerRole;
  return "internal_validator";
}

/**
 * Development-grade actor boundary. There is no authentication system in the
 * existing app, so routes use an environment-provided identity or a clearly
 * named fallback. The role is never accepted from a request body.
 */
export function getReviewerActor(): ReviewerActor {
  const reviewerId = process.env.ASSURANCE_REVIEWER_ID?.trim() || "reviewer-dev-internal-validator";
  const reviewerRole = parseReviewerRole(process.env.ASSURANCE_REVIEWER_ROLE);
  return {
    reviewerId,
    reviewerRole,
    authMode: process.env.ASSURANCE_REVIEWER_ID ? "environment" : "development_fallback",
    submittedByType: "reviewer",
  };
}

export function getTestHarnessActor(request: Request): ReviewerActor {
  const expected = process.env.ASSURANCE_TEST_HARNESS_TOKEN?.trim();
  const supplied = request.headers.get("x-assurance-test-harness-token")?.trim();
  if (!expected || !supplied || supplied !== expected) {
    throw new Phase6Error("Test-harness evidence boundary is not authorized", 403, "test_harness_unauthorized");
  }
  return {
    reviewerId: "test-harness-phase6",
    reviewerRole: "internal_validator",
    authMode: "environment",
    submittedByType: "test_harness",
  };
}

function defaultPhase6State(record: StoredAssuranceAssessment): Phase6State {
  const snapshotId = record.snapshotId || record.systemSnapshot?.id;
  if (!snapshotId || !record.authorityMap) {
    throw new Phase6Error("Assessment is missing its immutable snapshot or Authority Map", 409, "missing_snapshot");
  }
  const createdAt = record.receivedAt;
  return {
    assessmentId: record.id,
    level: record.result.assessment.level,
    status: record.result.assessment.status,
    authorityMap: {
      state: "proposed",
      map: record.authorityMap,
    },
    intakeSubmissions: [],
    findings: (record.findings || []).map((finding) => phase6FindingFromDeterministic(finding, snapshotId)),
    evidence: [],
    reviewDecisions: [],
    contradictions: [],
    diagnosticsRuns: [],
    attestations: [],
    reports: [],
    createdAt,
    updatedAt: createdAt,
  };
}

function normalizeState(record: StoredAssuranceAssessment): Phase6State {
  const state = record.phase6 || defaultPhase6State(record);
  state.intakeSubmissions = state.intakeSubmissions || [];
  state.findings = state.findings || [];
  state.evidence = state.evidence || [];
  state.reviewDecisions = state.reviewDecisions || [];
  state.contradictions = state.contradictions || [];
  state.diagnosticsRuns = state.diagnosticsRuns || [];
  state.attestations = state.attestations || [];
  state.reports = state.reports || [];
  state.updatedAt = state.updatedAt || record.receivedAt;
  return state;
}

export async function findAssessmentForFinding(findingId: string): Promise<string> {
  const id = requireNonEmpty(findingId, "findingId");
  const records = await listAssuranceAssessments();
  for (const record of records) {
    const state = normalizeState(record);
    if (state.findings.some((finding) => finding.id === id)) return record.id;
  }
  throw new Phase6Error(`Finding ${id} not found`, 404, "finding_not_found");
}

export async function getAssessmentOrThrow(assessmentId: string): Promise<StoredAssuranceAssessment> {
  const id = requireNonEmpty(assessmentId, "assessmentId");
  const record = await getAssuranceAssessment(id);
  if (!record) throw new Phase6Error(`Assessment ${id} not found`, 404, "assessment_not_found");
  return record;
}

export async function submitAssessmentIntake(
  assessmentId: string,
  rawContentInput: unknown,
  contentTypeInput: unknown = "application/json",
  sourceRefInput?: unknown,
  mode: "mock" | "live" = "mock",
  scenario = "valid_minimal",
): Promise<{ state: Phase6State; submission: import("./phase6-types").IntakeSubmission }> {
  const rawContent = requireNonEmpty(rawContentInput, "content");
  const contentType = requireNonEmpty(contentTypeInput, "contentType");
  const { record, state } = await getPhase6State(assessmentId);
  const snapshotId = snapshotIdFor(record);
  const contentHash = stableHash(rawContent);
  const existing = state.intakeSubmissions.find((item) => item.contentHash === contentHash);
  if (existing) return { state, submission: existing };
  const map = assessmentMap(record, state);
  const adapter = mode === "live"
    ? new OpenAiCompatibleLlmAdapter()
    : new MockLlmAdapter(scenario as ConstructorParameters<typeof MockLlmAdapter>[0]);
  let architectureExtraction;
  try {
    const rawExtraction = await adapter.extractArchitecture(
      map.systemId,
      rawContent,
      JSON.stringify({ nodes: map.nodes, edges: map.edges }),
      map,
    );
    architectureExtraction = validateLlmArchitectureExtraction(rawExtraction, map);
  } catch (error) {
    throw new Phase6Error(error instanceof Error ? error.message : "Architecture extraction failed", 502, "architecture_extraction_failed");
  }
  const submission: import("./phase6-types").IntakeSubmission = {
    id: `intake-${contentHash.slice(0, 24)}`,
    assessmentId: record.id,
    contentHash,
    contentType,
    sourceRef: typeof sourceRefInput === "string" ? sourceRefInput.trim() || undefined : undefined,
    receivedAt: now(),
    status: "proposed",
    snapshotId,
    architectureExtraction: architectureExtraction.accepted,
    extractionModel: {
      provider: adapter.modelProvider,
      modelId: adapter.modelId,
      promptVersion: adapter.promptVersion,
    },
  };
  state.intakeSubmissions.push(submission);
  await saveState(record, state);
  return { state, submission };
}

export async function getPhase6State(assessmentId: string): Promise<{ record: StoredAssuranceAssessment; state: Phase6State }> {
  const record = await getAssessmentOrThrow(assessmentId);
  const state = normalizeState(record);
  if (!record.phase6) {
    record.phase6 = state;
    await saveAssuranceAssessment(record);
  }
  return { record, state };
}

async function saveState(record: StoredAssuranceAssessment, state: Phase6State): Promise<StoredAssuranceAssessment> {
  state.updatedAt = now();
  record.phase6 = state;
  await saveAssuranceAssessment(record);
  return record;
}

function snapshotIdFor(record: StoredAssuranceAssessment): string {
  const snapshotId = record.snapshotId || record.systemSnapshot?.id;
  if (!snapshotId) throw new Phase6Error("Assessment has no snapshot binding", 409, "missing_snapshot");
  return snapshotId;
}

function assessmentMap(record: StoredAssuranceAssessment, state: Phase6State): SeededAuthorityMap {
  const map = state.authorityMap.map || record.authorityMap;
  if (!map) throw new Phase6Error("Assessment has no Authority Map", 409, "missing_authority_map");
  return map;
}

function mapRefs(finding: Phase6Finding): string[] {
  return [finding.authorityMapNodeId, finding.authorityMapEdgeId].filter(
    (value): value is string => Boolean(value),
  );
}

function findingKey(finding: Pick<Phase6Finding, "frameworkRefs" | "authorityMapNodeId" | "authorityMapEdgeId" | "origin">): string {
  return JSON.stringify({
    refs: [...finding.frameworkRefs].sort(),
    node: finding.authorityMapNodeId || null,
    edge: finding.authorityMapEdgeId || null,
    origin: finding.origin,
  });
}

function currentFindingState(finding: Phase6Finding): FindingStateSnapshot {
  return {
    status: finding.status,
    severity: finding.severity,
    confidence: finding.confidence,
    evidenceLevel: finding.evidenceLevel,
    disposition: finding.disposition,
  };
}

export function evidenceSnapshotHash(state: Phase6State, findingId?: string): string {
  const evidence = state.evidence
    .filter((item) => !findingId || item.findingId === findingId)
    .map((item) => ({
      id: item.id,
      findingId: item.findingId,
      contentHash: item.contentHash,
      storageRef: item.storageRef,
      supportsLevel: item.supportsLevel,
      submittedByType: item.submittedByType,
      submittedById: item.submittedById || null,
      submittedAt: item.submittedAt,
      supersededBy: item.supersededBy || null,
      snapshotId: item.snapshotId,
      metadata: item.metadata,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return stableHash(evidence);
}

function validateEvidenceInput(input: EvidenceSubmissionInput, snapshotId: string): void {
  if (!EVIDENCE_TYPES.includes(input.evidenceType)) throw new Phase6Error("Unsupported evidence type", 400, "invalid_evidence_type");
  if (!/^[a-f0-9]{64}$/i.test(requireNonEmpty(input.contentHash, "contentHash"))) {
    throw new Phase6Error("contentHash must be a SHA-256 hex digest", 400, "invalid_content_hash");
  }
  requireNonEmpty(input.storageRef, "storageRef");
  if (input.snapshotId !== snapshotId) throw new Phase6Error("Evidence snapshot does not match the assessment snapshot", 409, "snapshot_mismatch");
  if (!EVIDENCE_LEVEL_RANK.includes(input.supportsLevel)) throw new Phase6Error("Unsupported evidence level", 400, "invalid_evidence_level");
  const metadata = input.metadata || {};
  if (input.supportsLevel === "E2_observed" && (!metadata.observationContext || !metadata.observedAt)) {
    throw new Phase6Error("E2 evidence requires observationContext and observedAt", 400, "incomplete_observation");
  }
  if (input.supportsLevel === "E3_validated") {
    const required = [metadata.testName, metadata.procedure, metadata.expectedResult, metadata.actualResult, metadata.result, metadata.executedAt];
    if (input.evidenceType !== "test_result" || required.some((value) => !value)) {
      throw new Phase6Error("E3 evidence requires a test_result with test context and outcome", 400, "incomplete_validation");
    }
  }
  if (input.supportsLevel === "E4_adversarially_tested") {
    const required = [metadata.adversarialScenario, metadata.controlledConditions, metadata.authorization, metadata.result, metadata.executedAt];
    if (input.evidenceType !== "test_result" || required.some((value) => !value) || !["pass", "fail", "inconclusive"].includes(metadata.result || "")) {
      throw new Phase6Error("E4 evidence requires an authorized adversarial test record", 400, "incomplete_adversarial_test");
    }
  }
}

export async function commitAuthorityMap(
  assessmentId: string,
  actor: ReviewerActor,
  reasoningInput: unknown,
): Promise<Phase6State> {
  const reasoning = requireNonEmpty(reasoningInput, "reasoning");
  const { record, state } = await getPhase6State(assessmentId);
  if (state.authorityMap.state === "committed") return state;
  const map = assessmentMap(record, state);
  const snapshotId = snapshotIdFor(record);
  const decision: ReviewerDecision = {
    id: crypto.randomUUID(),
    decisionVersion: state.reviewDecisions.length + 1,
    scope: "authority_map",
    assessmentId: record.id,
    reviewerId: actor.reviewerId,
    reviewerRole: actor.reviewerRole,
    reviewerAuthMode: actor.authMode,
    decision: "accept",
    evidenceReferences: [],
    evidenceSnapshotHash: evidenceSnapshotHash(state),
    reasoning,
    createdAt: now(),
    snapshotId,
    authorityMapElementRefs: [...map.nodes.map((node) => node.id), ...map.edges.map((edge) => edge.id)].sort(),
  };
  state.reviewDecisions.push(decision);
  const committed: AuthorityMapCommit = {
    state: "committed",
    committedAt: decision.createdAt,
    committedByReviewerId: actor.reviewerId,
    decisionId: decision.id,
    map,
  };
  state.authorityMap = committed;
  state.status = "mapping";
  await saveState(record, state);
  return state;
}

function addContradictions(state: Phase6State, pass: LlmAssessmentPass, sourceHash: string, findingIds: string[]): string[] {
  const ids: string[] = [];
  for (const contradiction of pass.contradictions) {
    const id = `contradiction-${stableHash({ sourceHash, subject: contradiction.subject, a: contradiction.source_a_excerpt, b: contradiction.source_b_excerpt }).slice(0, 24)}`;
    if (!state.contradictions.some((item) => item.id === id)) {
      state.contradictions.push({
        id,
        subject: contradiction.subject,
        sourceAExcerpt: contradiction.source_a_excerpt,
        sourceBExcerpt: contradiction.source_b_excerpt,
        state: "unresolved",
        createdAt: now(),
        supportingEvidenceIds: [],
        sourceHash,
      });
    }
    ids.push(id);
  }
  if (ids.length > 0 && findingIds.length > 0) {
    const targetFinding = state.findings.find((finding) => finding.id === findingIds[0]);
    if (targetFinding) targetFinding.contradictionIds = Array.from(new Set([...targetFinding.contradictionIds, ...ids]));
  }
  return ids;
}

function addLlmFindings(state: Phase6State, pass: LlmAssessmentPass, assessmentId: string, snapshotId: string): string[] {
  const createdIds: string[] = [];
  const knownNodeIds = new Set((state.authorityMap.map?.nodes || []).map((node) => node.id));
  const knownEdgeIds = new Set((state.authorityMap.map?.edges || []).map((edge) => edge.id));
  for (const candidate of pass.findingValidation.accepted) {
    const nodeId = candidate.authority_map_ref.node_id;
    const edgeId = candidate.authority_map_ref.edge_id;
    const isProposed = candidate.authority_map_ref.is_llm_proposed === true ||
      (nodeId ? !knownNodeIds.has(nodeId) : edgeId ? !knownEdgeIds.has(edgeId) : false);
    const finding: Phase6Finding = {
      id: `finding-llm-${stableHash({ assessmentId, snapshotId, title: candidate.title, framework: candidate.framework_reference_code, nodeId: nodeId || null, edgeId: edgeId || null }).slice(0, 24)}`,
      assessmentId,
      snapshotId,
      frameworkRefs: [candidate.framework_reference_code],
      authorityMapNodeId: isProposed ? undefined : nodeId,
      authorityMapEdgeId: isProposed ? undefined : edgeId,
      title: candidate.title,
      description: candidate.description,
      basis: candidate.basis,
      severity: candidate.severity,
      confidence: candidate.confidence,
      evidenceLevel: candidate.evidence_level,
      status: "open",
      draftedBy: "llm",
      origin: "llm_proposal",
      authorityMapState: isProposed ? "proposed" : "committed",
      proposedAuthorityRef: isProposed ? { nodeId, edgeId, isLlmProposed: true } : undefined,
      llmRationale: candidate.self_assessed_certainty_note,
      evidenceIds: [],
      reviewerDecisionIds: [],
      contradictionIds: [],
      disposition: undefined,
      createdAt: now(),
    };
    const key = findingKey(finding);
    const existing = state.findings.find((item) => findingKey(item) === key && item.status === "open");
    if (!existing) {
      state.findings.push(finding);
      createdIds.push(finding.id);
    } else {
      createdIds.push(existing.id);
    }
  }
  return createdIds;
}

export async function runDiagnostics(
  assessmentId: string,
  mode: "mock" | "live" = "mock",
  scenario: string = "valid_minimal",
): Promise<{ state: Phase6State; run: DiagnosticsRun }> {
  const { record, state } = await getPhase6State(assessmentId);
  if (state.authorityMap.state !== "committed") {
    throw new Phase6Error("Commit the proposed Authority Map before running diagnostics", 409, "authority_map_not_committed");
  }
  const snapshotId = snapshotIdFor(record);
  const map = assessmentMap(record, state);
  let parsed: unknown;
  try {
    parsed = JSON.parse(record.rawSubmission);
  } catch {
    throw new Phase6Error("Stored intake source is not valid JSON", 500, "stored_source_invalid");
  }
  const validation = validateTrackDExport(parsed);
  if (!validation.valid) throw new Phase6Error("Stored intake source no longer validates", 500, "stored_source_invalid");
  const ruleExecution = executeDeterministicRules(map.edges, map.nodes);
  const deterministicFindingRecords = generateAssessmentFindings(ruleExecution.findings, record.id);
  const deterministicCandidates = ruleExecution.findings;
  const softDimensions = prepareSoftDimensionDrafts(validation.data, record.id);
  const systemDescription = JSON.stringify({ metadata: validation.data.assessment.metadata, summary: validation.data.assessment.summary });
  const authorityMapSummary = JSON.stringify({ nodes: map.nodes, edges: map.edges });
  const adapter = mode === "live"
    ? new OpenAiCompatibleLlmAdapter()
    : new MockLlmAdapter((scenario || "valid_minimal") as ConstructorParameters<typeof MockLlmAdapter>[0]);
  let pass: LlmAssessmentPass;
  try {
    pass = await runLlmAssessmentPass(
      adapter,
      map.systemId,
      snapshotId,
      systemDescription,
      authorityMapSummary,
      map,
      softDimensions,
      deterministicCandidates,
    );
  } catch (error) {
    throw new Phase6Error(error instanceof Error ? error.message : "LLM diagnostics failed", 502, "llm_diagnostics_failed");
  }

  const existingKeys = new Set(state.findings.map((finding) => findingKey(finding)));
  const deterministicIds: string[] = [];
  for (const finding of deterministicFindingRecords) {
    const wrapped = phase6FindingFromDeterministic(finding, snapshotId);
    const key = findingKey(wrapped);
    const existing = state.findings.find((item) => findingKey(item) === key && item.origin === "deterministic_rule_engine");
    if (!existing) {
      state.findings.push(wrapped);
      deterministicIds.push(wrapped.id);
    } else {
      deterministicIds.push(existing.id);
    }
    existingKeys.add(key);
  }
  const llmIds = addLlmFindings(state, pass, record.id, snapshotId);
  const contradictionIds = addContradictions(state, pass, record.sourceHash, llmIds);
  const run: DiagnosticsRun = {
    id: `diagnostics-${stableHash({ assessmentId: record.id, snapshotId, sourceHash: record.sourceHash, run: state.diagnosticsRuns.length + 1 }).slice(0, 24)}`,
    assessmentId: record.id,
    snapshotId,
    sourceHash: record.sourceHash,
    executedAt: now(),
    llmMode: mode,
    llmPass: pass,
    deterministicFindingIds: deterministicIds,
    llmFindingIds: llmIds,
    contradictionIds,
    unknowns: pass.unknowns,
    deterministicConflicts: pass.deterministicConflicts.length,
  };
  state.diagnosticsRuns.push(run);
  state.status = "human_review";
  await saveState(record, state);
  return { state, run };
}

function applyDisposition(finding: Phase6Finding, disposition: FindingDisposition | undefined): void {
  if (!disposition) return;
  finding.disposition = disposition;
  if (disposition === "confirmed") finding.status = "acknowledged";
  if (disposition === "accepted_risk") finding.status = "accepted_risk";
  if (disposition === "remediated") finding.status = "remediated";
  if (disposition === "needs_more_evidence") finding.status = "open";
  // Rejection is represented as an audited disposition, not as deletion or an
  // invented status outside the existing Phase 1-5 finding state machine.
}

function validateReviewInput(input: ReviewSubmissionInput): void {
  requireNonEmpty(input.reasoning, "reasoning");
  requireNonEmpty(input.evidenceSnapshotHash, "evidenceSnapshotHash");
  const allowed = ["accept", "reject", "modify", "request_more_evidence", "downgrade_confidence", "upgrade_evidence"];
  if (!allowed.includes(input.decision)) throw new Phase6Error("Unsupported review decision", 400, "invalid_decision");
  if (input.decision === "modify" && !input.newSeverity && !input.newConfidence && !input.disposition) {
    throw new Phase6Error("modify requires a new severity, confidence, or disposition", 400, "incomplete_modification");
  }
  if (input.decision === "downgrade_confidence" && !input.newConfidence) {
    throw new Phase6Error("downgrade_confidence requires newConfidence", 400, "incomplete_modification");
  }
}

export async function reviewFinding(
  assessmentId: string,
  findingId: string,
  actor: ReviewerActor,
  input: ReviewSubmissionInput,
): Promise<{ state: Phase6State; decision: ReviewerDecision; finding: Phase6Finding }> {
  validateReviewInput(input);
  const { record, state } = await getPhase6State(assessmentId);
  const finding = state.findings.find((item) => item.id === findingId);
  if (!finding) throw new Phase6Error(`Finding ${findingId} not found`, 404, "finding_not_found");
  const expectedHash = evidenceSnapshotHash(state, findingId);
  if (input.evidenceSnapshotHash !== expectedHash) {
    throw new Phase6Error("Evidence changed since this finding was loaded; refresh before reviewing", 409, "stale_review");
  }
  const previous = currentFindingState(finding);
  const nextSeverity = input.newSeverity || finding.severity;
  const nextConfidence = input.newConfidence || finding.confidence;
  const nextEvidenceLevel = finding.evidenceLevel;
  const evidenceReferences = input.evidenceId ? [input.evidenceId] : [];
  if (input.evidenceId) {
    const evidence = state.evidence.find((item) => item.id === input.evidenceId);
    if (!evidence || evidence.findingId !== findingId) throw new Phase6Error("Referenced evidence does not belong to this finding", 400, "invalid_evidence_reference");
    if (evidence.supersededBy) throw new Phase6Error("Superseded evidence cannot qualify a review", 409, "superseded_evidence");
    if (evidence.snapshotId !== snapshotIdFor(record)) throw new Phase6Error("Referenced evidence is bound to another snapshot", 409, "snapshot_mismatch");
    if (input.decision === "upgrade_evidence" && evidence.supportsLevel === "E4_adversarially_tested" && evidence.submittedByType !== "test_harness") {
      throw new Phase6Error("E4 adversarial evidence must be submitted by the test harness", 403, "test_harness_required");
    }
    if (input.decision === "upgrade_evidence") {
      if (!canSetEvidenceLevel(evidence.supportsLevel, [evidence])) {
        throw new Phase6Error("Evidence provenance does not qualify for an evidence upgrade", 403, "insufficient_evidence_provenance");
      }
      if (      EVIDENCE_LEVEL_RANK.indexOf(evidence.supportsLevel as (typeof EVIDENCE_LEVEL_RANK)[number]) <= EVIDENCE_LEVEL_RANK.indexOf(finding.evidenceLevel as (typeof EVIDENCE_LEVEL_RANK)[number])) {
        throw new Phase6Error("Evidence upgrade must advance the finding evidence level", 400, "non_advancing_evidence");
      }
    }
  }
  const updated: Phase6Finding = {
    ...finding,
    severity: nextSeverity,
    confidence: nextConfidence,
    evidenceLevel: input.decision === "upgrade_evidence" && input.evidenceId
      ? state.evidence.find((item) => item.id === input.evidenceId)!.supportsLevel
      : nextEvidenceLevel,
    updatedAt: now(),
  };
  const disposition = input.disposition || (
    input.decision === "accept" ? "confirmed" :
    input.decision === "reject" ? "rejected" :
    input.decision === "request_more_evidence" ? "needs_more_evidence" :
    input.decision === "upgrade_evidence" ? "confirmed" : undefined
  );
  applyDisposition(updated, disposition);
  const decision: ReviewerDecision = {
    id: crypto.randomUUID(),
    decisionVersion: state.reviewDecisions.length + 1,
    scope: "finding",
    assessmentId: record.id,
    findingId,
    reviewerId: actor.reviewerId,
    reviewerRole: actor.reviewerRole,
    reviewerAuthMode: actor.authMode,
    decision: input.decision,
    disposition,
    previousFindingState: previous,
    newFindingState: currentFindingState(updated),
    previousSeverity: finding.severity,
    newSeverity: updated.severity,
    previousConfidence: finding.confidence,
    newConfidence: updated.confidence,
    previousEvidenceLevel: finding.evidenceLevel,
    newEvidenceLevel: updated.evidenceLevel,
    previousStatus: finding.status,
    newStatus: updated.status,
    evidenceReferences,
    evidenceSnapshotHash: expectedHash,
    reasoning: input.reasoning.trim(),
    createdAt: now(),
    snapshotId: snapshotIdFor(record),
    authorityMapElementRefs: mapRefs(finding),
  };
  state.findings = state.findings.map((item) => item.id === findingId ? updated : item);
  state.reviewDecisions.push(decision);
  updated.reviewerDecisionIds = [...updated.reviewerDecisionIds, decision.id];
  state.status = "human_review";
  await saveState(record, state);
  return { state, decision, finding: updated };
}

export async function attachEvidence(
  assessmentId: string,
  findingId: string,
  actor: ReviewerActor,
  input: EvidenceSubmissionInput,
): Promise<{ state: Phase6State; evidence: EvidenceRecord }> {
  const { record, state } = await getPhase6State(assessmentId);
  const finding = state.findings.find((item) => item.id === findingId);
  if (!finding) throw new Phase6Error(`Finding ${findingId} not found`, 404, "finding_not_found");
  validateEvidenceInput(input, snapshotIdFor(record));
  const evidence: EvidenceRecord = {
    id: crypto.randomUUID(),
    findingId,
    evidenceType: input.evidenceType,
    contentHash: input.contentHash.toLowerCase(),
    storageRef: input.storageRef,
    supportsLevel: input.supportsLevel,
    // This field is derived from the server-side reviewer actor, never body input.
    submittedByType: actor.submittedByType || "reviewer",
    submittedById: actor.reviewerId,
    submittedAt: now(),
    snapshotId: input.snapshotId,
    metadata: input.metadata || {},
  };
  state.evidence.push(evidence);
  finding.evidenceIds = [...finding.evidenceIds, evidence.id];
  await saveState(record, state);
  return { state, evidence };
}

export async function supersedeEvidence(
  assessmentId: string,
  findingId: string,
  evidenceId: string,
  actor: ReviewerActor,
  replacementId: string,
  reasoning: string,
): Promise<Phase6State> {
  const { record, state } = await getPhase6State(assessmentId);
  const current = state.evidence.find((item) => item.id === evidenceId && item.findingId === findingId);
  const replacement = state.evidence.find((item) => item.id === replacementId && item.findingId === findingId);
  if (!current || !replacement) throw new Phase6Error("Evidence replacement must reference two evidence records for the same finding", 400, "invalid_evidence_reference");
  requireNonEmpty(reasoning, "reasoning");
  if (current.supersededBy) throw new Phase6Error("Evidence is already superseded", 409, "superseded_evidence");
  current.supersededBy = replacement.id;
  const decision: ReviewerDecision = {
    id: crypto.randomUUID(),
    decisionVersion: state.reviewDecisions.length + 1,
    scope: "finding",
    assessmentId: record.id,
    findingId,
    reviewerId: actor.reviewerId,
    reviewerRole: actor.reviewerRole,
    reviewerAuthMode: actor.authMode,
    decision: "request_more_evidence",
    disposition: "needs_more_evidence",
    evidenceReferences: [current.id, replacement.id],
    evidenceSnapshotHash: evidenceSnapshotHash(state, findingId),
    reasoning: reasoning.trim(),
    createdAt: now(),
    snapshotId: snapshotIdFor(record),
    authorityMapElementRefs: mapRefs(state.findings.find((item) => item.id === findingId)!),
  };
  state.reviewDecisions.push(decision);
  await saveState(record, state);
  return state;
}

export async function resolveContradiction(
  assessmentId: string,
  contradictionId: string,
  actor: ReviewerActor,
  stateValue: ContradictionState,
  reasoningInput: unknown,
  evidenceIds: string[] = [],
): Promise<{ state: Phase6State; contradiction: ContradictionRecord; decision: ReviewerDecision }> {
  const reasoning = requireNonEmpty(reasoningInput, "reasoning");
  const { record, state } = await getPhase6State(assessmentId);
  const contradiction = state.contradictions.find((item) => item.id === contradictionId);
  if (!contradiction) throw new Phase6Error(`Contradiction ${contradictionId} not found`, 404, "contradiction_not_found");
  const allowed: ContradictionState[] = ["unresolved", "resolved_in_favor_of_source_a", "resolved_in_favor_of_source_b", "resolved_by_new_evidence", "accepted_as_unknown"];
  if (!allowed.includes(stateValue)) throw new Phase6Error("Unsupported contradiction state", 400, "invalid_contradiction_state");
  for (const evidenceId of evidenceIds) {
    const evidence = state.evidence.find((item) => item.id === evidenceId);
    if (!evidence || evidence.snapshotId !== snapshotIdFor(record)) throw new Phase6Error("Contradiction evidence reference is invalid", 400, "invalid_evidence_reference");
  }
  const previousState = contradiction.state;
  contradiction.state = stateValue;
  contradiction.resolvedAt = stateValue === "unresolved" ? undefined : now();
  contradiction.resolvedByReviewerId = stateValue === "unresolved" ? undefined : actor.reviewerId;
  contradiction.resolutionReasoning = stateValue === "unresolved" ? undefined : reasoning;
  contradiction.supportingEvidenceIds = evidenceIds;
  const decision: ReviewerDecision = {
    id: crypto.randomUUID(),
    decisionVersion: state.reviewDecisions.length + 1,
    scope: "contradiction",
    assessmentId: record.id,
    contradictionId,
    reviewerId: actor.reviewerId,
    reviewerRole: actor.reviewerRole,
    reviewerAuthMode: actor.authMode,
    decision: stateValue === "unresolved" ? "request_more_evidence" : "modify",
    previousContradictionState: previousState,
    newContradictionState: stateValue,
    evidenceReferences: evidenceIds,
    evidenceSnapshotHash: evidenceSnapshotHash(state),
    reasoning,
    createdAt: now(),
    snapshotId: snapshotIdFor(record),
    authorityMapElementRefs: [],
  };
  state.reviewDecisions.push(decision);
  await saveState(record, state);
  return { state, contradiction, decision };
}

export function materialFindings(state: Phase6State): Phase6Finding[] {
  return state.findings.filter((finding) => ["critical", "high", "medium"].includes(finding.severity));
}

export function reportReadyGate(state: Phase6State): { ready: boolean; blockers: string[] } {
  if (state.level === "L1_diagnostic") return { ready: true, blockers: [] };
  const blockers = materialFindings(state)
    .filter((finding) => !finding.disposition || finding.disposition === "needs_more_evidence")
    .map((finding) => `${finding.id}: ${finding.title}`);
  return { ready: blockers.length === 0, blockers };
}

export async function transitionAssessmentStatus(
  assessmentId: string,
  status: Phase6State["status"],
): Promise<Phase6State> {
  const { record, state } = await getPhase6State(assessmentId);
  const allowed: Record<Phase6State["status"], Phase6State["status"][]> = {
    intake: ["mapping"],
    mapping: ["diagnostics"],
    diagnostics: ["human_review", "report_ready"],
    human_review: ["report_ready"],
    report_ready: ["delivered"],
    delivered: [],
  };
  if (!allowed[state.status].includes(status)) throw new Phase6Error(`Invalid assessment transition ${state.status} -> ${status}`, 409, "invalid_status_transition");
  if (status === "report_ready") {
    const gate = reportReadyGate(state);
    if (!gate.ready) throw new Phase6Error(`Assessment is not report-ready: ${gate.blockers.join("; ")}`, 409, "report_not_ready");
  }
  state.status = status;
  await saveState(record, state);
  return state;
}

export async function saveAttestation(
  assessmentId: string,
  actor: ReviewerActor,
  input: Pick<Attestation, "reportVersion" | "reportHash" | "decision" | "scope">,
): Promise<{ state: Phase6State; attestation: Attestation }> {
  const reportVersion = requireNonEmpty(input.reportVersion, "reportVersion");
  const reportHash = requireNonEmpty(input.reportHash, "reportHash");
  const allowedDecisions: Attestation["decision"][] = ["attested", "attested_with_residual_risk", "not_attested"];
  if (!allowedDecisions.includes(input.decision)) throw new Phase6Error("Unsupported attestation decision", 400, "invalid_attestation_decision");
  const { record, state } = await getPhase6State(assessmentId);
  const gate = reportReadyGate(state);
  if (!gate.ready) throw new Phase6Error(`Cannot attest before material findings are reviewed: ${gate.blockers.join("; ")}`, 409, "report_not_ready");
  const report = state.reports.find((item) => item.reportVersion === reportVersion && item.reportHash === reportHash);
  if (!report) throw new Phase6Error("Attestation must reference a generated report artifact", 400, "report_reference_required");
  const attestation: Attestation = {
    id: crypto.randomUUID(),
    assessmentId: record.id,
    reviewerId: actor.reviewerId,
    reviewerRole: actor.reviewerRole,
    reviewerAuthMode: actor.authMode,
    snapshotId: snapshotIdFor(record),
    reportVersion,
    reportHash,
    decision: input.decision,
    scope: requireNonEmpty(input.scope, "scope"),
    timestamp: now(),
    isCryptographicSignature: false,
  };
  state.attestations.push(attestation);
  await saveState(record, state);
  return { state, attestation };
}

export function assessmentSummary(record: StoredAssuranceAssessment, state: Phase6State) {
  return {
    assessmentId: record.id,
    sourceHash: record.sourceHash,
    snapshotId: snapshotIdFor(record),
    level: state.level,
    status: state.status,
    authorityMapState: state.authorityMap.state,
    counts: {
      findings: state.findings.length,
      openFindings: state.findings.filter((finding) => finding.status === "open").length,
      materialFindings: materialFindings(state).length,
      evidence: state.evidence.length,
      reviewDecisions: state.reviewDecisions.length,
      contradictions: state.contradictions.length,
      unresolvedContradictions: state.contradictions.filter((item) => item.state === "unresolved").length,
      reports: state.reports.length,
      attestations: state.attestations.length,
    },
    reportReady: reportReadyGate(state),
  };
}
