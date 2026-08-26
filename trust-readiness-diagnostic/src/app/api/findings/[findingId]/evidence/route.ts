import { NextResponse } from "next/server";
import { readJsonBody, phase6ErrorResponseJson } from "../../../../../lib/assurance/http";
import { attachEvidence, findAssessmentForFinding, getReviewerActor } from "../../../../../lib/assurance/phase6-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ findingId: string }> },
) {
  try {
    const { findingId } = await params;
    const body = await readJsonBody(request);
    const assessmentId = await findAssessmentForFinding(findingId);
    const result = await attachEvidence(
      assessmentId,
      findingId,
      getReviewerActor(),
      {
        evidenceType: body.evidenceType as never,
        contentHash: body.contentHash as string,
        storageRef: body.storageRef as string,
        supportsLevel: body.supportsLevel as never,
        snapshotId: body.snapshotId as string,
        metadata: (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata))
          ? body.metadata as never
          : {},
      },
    );
    return NextResponse.json({ assessment_id: assessmentId, evidence: result.evidence }, { status: 201 });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
