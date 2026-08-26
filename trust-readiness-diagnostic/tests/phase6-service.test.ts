import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, beforeEach, afterEach } from "node:test";
import {
  createSystemSnapshotFromTrackD,
  generateAssessmentFindings,
  hashTrackDExport,
  seedAuthorityMapFromTrackD,
  translateTrackDToAssurance,
  validateTrackDExport,
  executeDeterministicRules,
} from "../../tools/track-d-governability-audit/adapter/src/index";
import {
  attachEvidence,
  commitAuthorityMap,
  evidenceSnapshotHash,
  getPhase6State,
  reportReadyGate,
  resolveContradiction,
  reviewFinding,
  runDiagnostics,
  saveAttestation,
} from "../src/lib/assurance/phase6-service";
import { generateAssuranceReport } from "../src/lib/assurance/report-service";
import { clearStorageForTesting, saveAssuranceAssessment, type StoredAssuranceAssessment } from "../src/lib/assurance/store";

const fixturePath = join(process.cwd(), "../tools/track-d-governability-audit/adapter/fixtures/sample-v61-export.json");
const rawFixture = readFileSync(fixturePath, "utf8");
const parsedFixture = JSON.parse(rawFixture) as unknown;
const validation = validateTrackDExport(parsedFixture);
const validatedData = validation.valid ? validation.data : (() => { throw new Error("Fixture must be valid for Phase 6 tests"); })();

async function seedAssessment(level: "L1_diagnostic" | "L2_validated" = "L2_validated"): Promise<StoredAssuranceAssessment> {
  const sourceHash = hashTrackDExport(rawFixture);
  const receivedAt = "2026-08-26T00:00:00.000Z";
  const translated = translateTrackDToAssurance(validatedData, sourceHash, receivedAt);
  translated.assessment.level = level;
  translated.assessment.status = "intake";
  const systemId = `system-phase6-${crypto.randomUUID()}`;
  const authorityMap = seedAuthorityMapFromTrackD(validatedData, sourceHash, systemId);
  const systemSnapshot = createSystemSnapshotFromTrackD(validatedData, sourceHash, authorityMap, systemId);
  const ruleExecution = executeDeterministicRules(authorityMap.edges, authorityMap.nodes);
  const findings = generateAssessmentFindings(ruleExecution.findings, crypto.randomUUID());
  const record: StoredAssuranceAssessment = {
    id: crypto.randomUUID(),
    sourceHash,
    receivedAt,
    schemaVersion: validatedData.schemaVersion,
    rawSubmission: rawFixture,
    result: translated,
    snapshotId: systemSnapshot.id,
    systemSnapshot,
    authorityMap,
    findings,
  };
  await saveAssuranceAssessment(record);
  return record;
}

const reviewer = {
  reviewerId: "reviewer-phase6-test",
  reviewerRole: "internal_validator" as const,
  authMode: "environment" as const,
};

beforeEach(async () => {
  await clearStorageForTesting();
  process.env.ASSURANCE_STORE_MODE = "memory";
});

afterEach(async () => {
  await clearStorageForTesting();
  delete process.env.ASSURANCE_STORE_MODE;
});

test("commits the proposed Authority Map with an append-only reviewer decision", async () => {
  const record = await seedAssessment();
  const before = await getPhase6State(record.id);
  assert.equal(before.state.authorityMap.state, "proposed");
  const committed = await commitAuthorityMap(record.id, reviewer, "Reviewed source-grounded nodes and edges for this assessment.");
  assert.equal(committed.authorityMap.state, "committed");
  assert.equal(committed.reviewDecisions.length, 1);
  assert.equal(committed.reviewDecisions[0].scope, "authority_map");
  assert.equal(committed.reviewDecisions[0].reviewerRole, "internal_validator");
});

test("requires a committed map before running deterministic and LLM-assisted diagnostics", async () => {
  const record = await seedAssessment();
  await assert.rejects(() => runDiagnostics(record.id, "mock", "valid_minimal"), /Commit the proposed Authority Map/);
  await commitAuthorityMap(record.id, reviewer, "Map reviewed for diagnostic execution.");
  const result = await runDiagnostics(record.id, "mock", "valid_minimal");
  assert.equal(result.state.status, "human_review");
  assert.equal(result.run.llmMode, "mock");
  assert.ok(result.state.findings.some((finding) => finding.origin === "llm_proposal"));
  assert.ok(result.run.llmPass.pressureMetrics.totalLlmFindingsOffered >= 1);
});

test("rejects stale reviews and preserves evidence snapshot concurrency", async () => {
  const record = await seedAssessment();
  await commitAuthorityMap(record.id, reviewer, "Map reviewed before finding review.");
  await runDiagnostics(record.id, "mock", "valid_minimal");
  const loaded = await getPhase6State(record.id);
  const finding = loaded.state.findings.find((item) => item.origin === "llm_proposal");
  assert.ok(finding);
  await assert.rejects(
    () => reviewFinding(record.id, finding!.id, reviewer, { decision: "accept", reasoning: "Reviewing stale page.", evidenceSnapshotHash: "stale" }),
    /Evidence changed since this finding was loaded/,
  );
  const result = await reviewFinding(record.id, finding!.id, reviewer, {
    decision: "accept",
    disposition: "confirmed",
    reasoning: "The proposal is supported at the documented evidence level.",
    evidenceSnapshotHash: evidenceSnapshotHash(loaded.state, finding!.id),
  });
  assert.equal(result.finding.disposition, "confirmed");
  assert.equal(result.state.reviewDecisions.at(-1)?.previousFindingState?.status, "open");
});

test("requires structured reviewer evidence for E2 and allows an audited upgrade", async () => {
  const record = await seedAssessment();
  await commitAuthorityMap(record.id, reviewer, "Map reviewed before evidence entry.");
  await runDiagnostics(record.id, "mock", "valid_minimal");
  const loaded = await getPhase6State(record.id);
  const finding = loaded.state.findings.find((item) => item.origin === "llm_proposal");
  assert.ok(finding);
  const evidenceResult = await attachEvidence(record.id, finding!.id, reviewer, {
    evidenceType: "test_result",
    contentHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    storageRef: "reviewer://phase6-test-result",
    supportsLevel: "E2_observed",
    snapshotId: record.snapshotId!,
    metadata: {
      observationContext: "Observed the control in the snapshot-bound test environment.",
      observedAt: "2026-08-26T00:01:00.000Z",
    },
  });
  assert.equal(evidenceResult.evidence.submittedByType, "reviewer");
  const refreshed = await getPhase6State(record.id);
  const upgraded = await reviewFinding(record.id, finding!.id, reviewer, {
    decision: "upgrade_evidence",
    disposition: "confirmed",
    evidenceId: evidenceResult.evidence.id,
    reasoning: "The attached reviewer observation supports the E2 level.",
    evidenceSnapshotHash: evidenceSnapshotHash(refreshed.state, finding!.id),
  });
  assert.equal(upgraded.finding.evidenceLevel, "E2_observed");
  assert.equal(upgraded.decision.evidenceReferences.length, 1);
});

test("keeps contradictions unresolved until a reasoned reviewer resolution", async () => {
  const record = await seedAssessment("L1_diagnostic");
  await commitAuthorityMap(record.id, reviewer, "Map reviewed before contradiction analysis.");
  await runDiagnostics(record.id, "mock", "valid_with_contradiction_syn05");
  const loaded = await getPhase6State(record.id);
  const contradiction = loaded.state.contradictions[0];
  assert.ok(contradiction);
  assert.equal(contradiction.state, "unresolved");
  const result = await resolveContradiction(record.id, contradiction!.id, reviewer, "accepted_as_unknown", "The available sources do not establish which privilege is active.");
  assert.equal(result.contradiction.state, "accepted_as_unknown");
  assert.equal(result.decision.scope, "contradiction");
});

test("blocks L2 reports until material findings have reviewer dispositions, then hashes reproducibly", async () => {
  const record = await seedAssessment("L2_validated");
  await commitAuthorityMap(record.id, reviewer, "Map reviewed before report workflow.");
  await runDiagnostics(record.id, "mock", "valid_minimal");
  let stateResult = await getPhase6State(record.id);
  assert.equal(reportReadyGate(stateResult.state).ready, false);
  await assert.rejects(() => generateAssuranceReport(record.id), /Cannot generate report/);
  for (const finding of stateResult.state.findings.filter((item) => ["critical", "high", "medium"].includes(item.severity))) {
    await reviewFinding(record.id, finding.id, reviewer, {
      decision: "accept",
      disposition: "confirmed",
      reasoning: "Reviewed and confirmed at the current evidence level.",
      evidenceSnapshotHash: evidenceSnapshotHash(stateResult.state, finding.id),
    });
    stateResult = await getPhase6State(record.id);
  }
  const first = await generateAssuranceReport(record.id);
  const second = await generateAssuranceReport(record.id);
  assert.equal(first.report.reportHash, second.report.reportHash);
  assert.equal(first.report.markdown, second.report.markdown);
  assert.match(first.report.markdown, /Track D: Self-Assessment Diagnostic Context/);
  assert.match(first.report.markdown, /Evidence E1_documented|E1_documented/);
  const attested = await saveAttestation(record.id, reviewer, {
    reportVersion: first.report.reportVersion,
    reportHash: first.report.reportHash,
    decision: "attested_with_residual_risk",
    scope: "Reviewed findings, evidence ledger, snapshot, contradictions, and listed limitations.",
  });
  assert.equal(attested.attestation.isCryptographicSignature, false);
});
