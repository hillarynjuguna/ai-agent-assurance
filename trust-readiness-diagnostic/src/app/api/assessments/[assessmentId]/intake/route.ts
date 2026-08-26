import { NextResponse } from "next/server";
import { readJsonBody, phase6ErrorResponseJson } from "@/lib/assurance/http";
import { getPhase6State, submitAssessmentIntake } from "@/lib/assurance/phase6-service";

const MOCK_SCENARIOS = new Set([
  "valid_minimal",
  "valid_with_contradiction_syn05",
  "valid_with_contradiction_syn10",
  "hallucination_invented_node",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const { state } = await getPhase6State(assessmentId);
    return NextResponse.json({
      assessment_id: assessmentId,
      snapshot_id: state.findings[0]?.snapshotId || null,
      submissions: state.intakeSubmissions,
    });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}

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
    const content = typeof body.content === "string"
      ? body.content
      : JSON.stringify(body.content || {});
    const result = await submitAssessmentIntake(
      assessmentId,
      content,
      body.contentType || "application/json",
      body.sourceRef,
      mode,
      scenario,
    );
    return NextResponse.json({
      assessment_id: assessmentId,
      status: result.submission.status,
      submission: result.submission,
      authority_map_state: result.state.authorityMap.state,
      note: "Architecture extraction is a proposal and has not been applied to the committed Authority Map.",
    }, { status: 201 });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
