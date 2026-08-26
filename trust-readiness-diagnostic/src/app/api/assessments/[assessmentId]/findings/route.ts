import { NextResponse } from "next/server";
import { phase6ErrorResponseJson } from "../../../../../lib/assurance/http";
import { assessmentSummary, evidenceSnapshotHash, getPhase6State } from "../../../../../lib/assurance/phase6-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const { record, state } = await getPhase6State(assessmentId);
    return NextResponse.json({
      summary: assessmentSummary(record, state),
      findings: state.findings,
      evidence: state.evidence,
      review_decisions: state.reviewDecisions,
      contradictions: state.contradictions,
      diagnostics_runs: state.diagnosticsRuns,
      evidence_snapshot_hashes: Object.fromEntries(state.findings.map((finding) => [finding.id, evidenceSnapshotHash(state, finding.id)])),
    });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
