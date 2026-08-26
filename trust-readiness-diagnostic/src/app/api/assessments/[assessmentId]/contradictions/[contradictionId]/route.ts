import { NextResponse } from "next/server";
import { readJsonBody, phase6ErrorResponseJson } from "../../../../../../lib/assurance/http";
import { getReviewerActor, resolveContradiction } from "../../../../../../lib/assurance/phase6-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string; contradictionId: string }> },
) {
  try {
    const { assessmentId, contradictionId } = await params;
    const body = await readJsonBody(request);
    const evidenceIds = Array.isArray(body.evidenceIds)
      ? body.evidenceIds.filter((value): value is string => typeof value === "string")
      : [];
    const result = await resolveContradiction(
      assessmentId,
      contradictionId,
      getReviewerActor(),
      body.state as never,
      body.reasoning,
      evidenceIds,
    );
    return NextResponse.json({
      assessment_id: assessmentId,
      contradiction: result.contradiction,
      decision: result.decision,
    }, { status: 201 });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
