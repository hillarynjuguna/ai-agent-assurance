import { NextResponse } from "next/server";
import { readJsonBody, phase6ErrorResponseJson } from "../../../../../../lib/assurance/http";
import { runDiagnostics } from "../../../../../../lib/assurance/phase6-service";

const MOCK_SCENARIOS = new Set([
  "valid_minimal",
  "valid_with_contradiction_syn05",
  "valid_with_contradiction_syn10",
  "invalid_e2_attempt",
  "invalid_e3_attempt",
  "invalid_missing_basis",
  "invalid_missing_authority_ref",
  "hallucination_invented_node",
  "valid_memory_risk_syn08",
  "valid_pii_boundary_syn09",
  "deterministic_override_attempt",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const body = await readJsonBody(request);
    const mode = body.mode === "live" ? "live" : "mock";
    const scenario = typeof body.scenario === "string" && MOCK_SCENARIOS.has(body.scenario)
      ? body.scenario
      : "valid_minimal";
    const { state, run } = await runDiagnostics(assessmentId, mode, scenario);
    return NextResponse.json({
      assessment_id: assessmentId,
      status: state.status,
      run,
      findings: state.findings,
      contradictions: state.contradictions,
    }, { status: 201 });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
