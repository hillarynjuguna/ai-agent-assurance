import { NextResponse } from "next/server";
import { readJsonBody, phase6ErrorResponseJson } from "../../../../../lib/assurance/http";
import { getReviewerActor, saveAttestation } from "../../../../../lib/assurance/phase6-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const body = await readJsonBody(request);
    const result = await saveAttestation(assessmentId, getReviewerActor(), {
      reportVersion: body.reportVersion as string,
      reportHash: body.reportHash as string,
      decision: body.decision as never,
      scope: body.scope as string,
    });
    return NextResponse.json({ attestation: result.attestation, status: result.state.status }, { status: 201 });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
