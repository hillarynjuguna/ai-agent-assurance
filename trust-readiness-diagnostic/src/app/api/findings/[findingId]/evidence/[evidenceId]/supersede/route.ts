import { NextResponse } from "next/server";
import { readJsonBody, phase6ErrorResponseJson } from "@/lib/assurance/http";
import { findAssessmentForFinding, getReviewerActor, supersedeEvidence } from "@/lib/assurance/phase6-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ findingId: string; evidenceId: string }> },
) {
  try {
    const { findingId, evidenceId } = await params;
    const body = await readJsonBody(request);
    const replacementId = typeof body.replacementEvidenceId === "string" ? body.replacementEvidenceId : "";
    const assessmentId = await findAssessmentForFinding(findingId);
    const state = await supersedeEvidence(
      assessmentId,
      findingId,
      evidenceId,
      getReviewerActor(),
      replacementId,
      typeof body.reasoning === "string" ? body.reasoning : "",
    );
    return NextResponse.json({ assessment_id: assessmentId, status: state.status, evidence: state.evidence });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
