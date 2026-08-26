import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, afterEach, test } from "node:test";
import { POST as intake } from "../src/app/api/diagnostics/intake/route";
import { GET as getFindings } from "../src/app/api/assessments/[assessmentId]/findings/route";
import { POST as commitMap } from "../src/app/api/assessments/[assessmentId]/authority-map/route";
import { GET as getIntake, POST as submitIntake } from "../src/app/api/assessments/[assessmentId]/intake/route";
import { POST as runDiagnostics } from "../src/app/api/assessments/[assessmentId]/diagnostics/run/route";
import { POST as reviewFinding } from "../src/app/api/findings/[findingId]/review/route";
import { POST as testHarnessEvidence } from "../src/app/api/internal/test-harness/findings/[findingId]/evidence/route";
import { POST as generateReport } from "../src/app/api/assessments/[assessmentId]/report/route";
import { clearStorageForTesting } from "../src/lib/assurance/store";

const fixture = readFileSync(join(process.cwd(), "../tools/track-d-governability-audit/adapter/fixtures/sample-v61-export.json"), "utf8");

beforeEach(async () => {
  process.env.ASSURANCE_STORE_MODE = "memory";
  await clearStorageForTesting();
});

afterEach(async () => {
  await clearStorageForTesting();
  delete process.env.ASSURANCE_STORE_MODE;
  delete process.env.ASSURANCE_TEST_HARNESS_TOKEN;
});

test("Phase 6 API handlers enforce commit, diagnostics, review, and report gates", async () => {
  const intakeResponse = await intake(new Request("http://localhost/api/diagnostics/intake", { method: "POST", body: fixture, headers: { "Content-Type": "application/json" } }));
  assert.equal(intakeResponse.status, 200);
  const intakeData = await intakeResponse.json() as { assessment_id: string };
  assert.ok(intakeData.assessment_id);
  const params = Promise.resolve({ assessmentId: intakeData.assessment_id });

  const preCommitRun = await runDiagnostics(new Request("http://localhost/api/diagnostics/run", { method: "POST", body: JSON.stringify({ mode: "mock", scenario: "valid_minimal" }) }), { params });
  assert.equal(preCommitRun.status, 409);

  const commitResponse = await commitMap(new Request("http://localhost/api/authority-map", { method: "POST", body: JSON.stringify({ reasoning: "Reviewed the source-grounded Authority Map before diagnostics." }) }), { params });
  assert.equal(commitResponse.status, 201);

  const diagnosticsResponse = await runDiagnostics(new Request("http://localhost/api/diagnostics/run", { method: "POST", body: JSON.stringify({ mode: "mock", scenario: "valid_minimal" }) }), { params });
  assert.equal(diagnosticsResponse.status, 201);

  const intakeProposal = await submitIntake(new Request("http://localhost/api/intake", { method: "POST", body: JSON.stringify({ content: "architecture source material for this assessment", contentType: "text/plain", sourceRef: "reviewer://phase6-source", mode: "mock", scenario: "valid_minimal" }) }), { params });
  assert.equal(intakeProposal.status, 201);
  const intakeProposalData = await intakeProposal.json() as { status: string; authority_map_state: string; submission: { id: string; architectureExtraction?: { nodes: unknown[] } } };
  assert.equal(intakeProposalData.status, "proposed");
  assert.equal(intakeProposalData.authority_map_state, "committed");
  assert.deepEqual(intakeProposalData.submission.architectureExtraction?.nodes, []);
  const duplicateProposal = await submitIntake(new Request("http://localhost/api/intake", { method: "POST", body: JSON.stringify({ content: "architecture source material for this assessment", mode: "mock", scenario: "valid_minimal" }) }), { params });
  assert.equal(duplicateProposal.status, 201);
  assert.equal((await duplicateProposal.json()).submission.id, intakeProposalData.submission.id);
  const intakeList = await getIntake(new Request("http://localhost/api/intake"), { params });
  assert.equal(intakeList.status, 200);
  assert.equal((await intakeList.json()).submissions.length, 1);

  const findingsResponse = await getFindings(new Request("http://localhost/api/findings"), { params });
  assert.equal(findingsResponse.status, 200);
  const findingsData = await findingsResponse.json() as { summary: { snapshotId: string }; findings: Array<{ id: string; severity: string }>; evidence_snapshot_hashes: Record<string, string> };
  const material = findingsData.findings.filter((finding) => ["critical", "high", "medium"].includes(finding.severity));
  assert.ok(material.length > 0);

  const earlyL1Report = await generateReport(new Request("http://localhost/api/report", { method: "POST" }), { params });
  assert.equal(earlyL1Report.status, 201);

  const firstFinding = material[0];
  const unauthorizedE4 = await testHarnessEvidence(new Request("http://localhost/api/e4", { method: "POST", body: JSON.stringify({ evidenceType: "test_result", supportsLevel: "E4_adversarially_tested", contentHash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789", storageRef: "harness://run-1", snapshotId: findingsData.summary.snapshotId, metadata: { adversarialScenario: "blocked irreversible action", controlledConditions: "isolated test harness", authorization: "test ticket phase6-1", result: "pass", executedAt: "2026-08-26T00:00:00.000Z" } }) }), { params: Promise.resolve({ findingId: firstFinding.id }) });
  assert.equal(unauthorizedE4.status, 403);
  process.env.ASSURANCE_TEST_HARNESS_TOKEN = "phase6-test-token";
  const harnessE4 = await testHarnessEvidence(new Request("http://localhost/api/e4", { method: "POST", headers: { "x-assurance-test-harness-token": "phase6-test-token" }, body: JSON.stringify({ evidenceType: "test_result", supportsLevel: "E4_adversarially_tested", contentHash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789", storageRef: "harness://run-1", snapshotId: findingsData.summary.snapshotId, metadata: { adversarialScenario: "blocked irreversible action", controlledConditions: "isolated test harness", authorization: "test ticket phase6-1", result: "pass", executedAt: "2026-08-26T00:00:00.000Z" } }) }), { params: Promise.resolve({ findingId: firstFinding.id }) });
  assert.equal(harnessE4.status, 201);
  const harnessE4Data = await harnessE4.json() as { evidence: { id: string; submittedByType: string } };
  assert.equal(harnessE4Data.evidence.submittedByType, "test_harness");
  const afterE4Findings = await getFindings(new Request("http://localhost/api/findings"), { params });
  const afterE4Data = await afterE4Findings.json() as { evidence_snapshot_hashes: Record<string, string> };
  const e4Upgrade = await reviewFinding(new Request("http://localhost/api/review", { method: "POST", body: JSON.stringify({ decision: "upgrade_evidence", evidenceId: harnessE4Data.evidence.id, reasoning: "Authorized test harness demonstrates the control boundary.", evidenceSnapshotHash: afterE4Data.evidence_snapshot_hashes[firstFinding.id] }) }), { params: Promise.resolve({ findingId: firstFinding.id }) });
  assert.equal(e4Upgrade.status, 201);
  findingsData.evidence_snapshot_hashes = (await (await getFindings(new Request("http://localhost/api/findings"), { params })).json()).evidence_snapshot_hashes;

  for (const finding of material) {
    const response = await reviewFinding(new Request("http://localhost/api/review", { method: "POST", body: JSON.stringify({ decision: "accept", disposition: "confirmed", reasoning: "Reviewed at the current evidence level.", evidenceSnapshotHash: findingsData.evidence_snapshot_hashes[finding.id] }) }), { params: Promise.resolve({ findingId: finding.id }) });
    assert.equal(response.status, 201);
    const refreshed = await getFindings(new Request("http://localhost/api/findings"), { params });
    findingsData.evidence_snapshot_hashes = (await refreshed.json()).evidence_snapshot_hashes;
  }

  const reportResponse = await generateReport(new Request("http://localhost/api/report", { method: "POST" }), { params });
  assert.equal(reportResponse.status, 201);
  const reportData = await reportResponse.json() as { report: { reportHash: string; markdown: string } };
  assert.match(reportData.report.markdown, /AI Agent Assurance Report/);
  assert.equal(reportData.report.reportHash.length, 64);
});
