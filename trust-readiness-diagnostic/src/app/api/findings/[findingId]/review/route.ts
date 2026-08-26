import { NextResponse } from "next/server";
import { readJsonBody, phase6ErrorResponseJson } from "../../../../../lib/assurance/http";
import { findAssessmentForFinding, getReviewerActor, reviewFinding } from "../../../../../lib/assurance/phase6-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ findingId: string }> },
) {
  try {
    const { findingId } = await params;
    const body = await readJsonBody(request);
    const assessmentId = await findAssessmentForFinding(findingId);
    const result = await reviewFinding(
      assessmentId,
      findingId,
      getReviewerActor(),
      {
        decision: body.decision as never,
        reasoning: body.reasoning as string,
        evidenceSnapshotHash: body.evidenceSnapshotHash as string,
        evidenceId: typeof body.evidenceId === "string" ? body.evidenceId : undefined,
        newSeverity: typeof body.newSeverity === "string" ? body.newSeverity as never : undefined,
        newConfidence: typeof body.newConfidence === "string" ? body.newConfidence as never : undefined,
        disposition: typeof body.disposition === "string" ? body.disposition as never : undefined,
      },
    );
    return NextResponse.json({
      assessment_id: assessmentId,
      finding: result.finding,
      decision: result.decision,
    }, { status: 201 });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
