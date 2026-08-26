import { NextResponse } from "next/server";
import { readJsonBody, phase6ErrorResponseJson } from "../../../../../lib/assurance/http";
import { assessmentSummary, getPhase6State, transitionAssessmentStatus } from "../../../../../lib/assurance/phase6-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const { record, state } = await getPhase6State(assessmentId);
    return NextResponse.json({ summary: assessmentSummary(record, state) });
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
    if (typeof body.status !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }
    const state = await transitionAssessmentStatus(assessmentId, body.status as Parameters<typeof transitionAssessmentStatus>[1]);
    return NextResponse.json({ assessment_id: assessmentId, status: state.status });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
