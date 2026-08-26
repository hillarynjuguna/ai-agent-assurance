import { NextResponse } from "next/server";
import { readJsonBody, phase6ErrorResponseJson } from "../../../../../lib/assurance/http";
import {
  commitAuthorityMap,
  getPhase6State,
  getReviewerActor,
} from "../../../../../lib/assurance/phase6-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const { state } = await getPhase6State(assessmentId);
    return NextResponse.json({
      assessment_id: assessmentId,
      state: state.authorityMap.state,
      map: state.authorityMap.map || null,
      committed_at: state.authorityMap.committedAt || null,
      committed_by_reviewer_id: state.authorityMap.committedByReviewerId || null,
      decision_id: state.authorityMap.decisionId || null,
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
    const state = await commitAuthorityMap(
      assessmentId,
      getReviewerActor(),
      body.reasoning,
    );
    return NextResponse.json({
      assessment_id: assessmentId,
      state: state.authorityMap.state,
      map: state.authorityMap.map,
      decision: state.reviewDecisions[state.reviewDecisions.length - 1],
    }, { status: 201 });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
