import { NextResponse } from "next/server";
import { listAssuranceAssessments } from "@/lib/assurance/store";
import { assessmentSummary, getPhase6State, materialFindings } from "@/lib/assurance/phase6-service";
import { phase6ErrorResponseJson } from "@/lib/assurance/http";

export async function GET() {
  try {
    const records = await listAssuranceAssessments();
    const queue = [];
    for (const record of records) {
      const { state } = await getPhase6State(record.id);
      const findings = materialFindings(state).filter(
        (finding) => !finding.disposition || finding.disposition === "needs_more_evidence",
      );
      if (state.status === "human_review" || findings.length > 0 || state.contradictions.some((item) => item.state === "unresolved")) {
        queue.push({
          summary: assessmentSummary(record, state),
          findings,
          unresolvedContradictions: state.contradictions.filter((item) => item.state === "unresolved"),
          latestRun: state.diagnosticsRuns[state.diagnosticsRuns.length - 1] || null,
        });
      }
    }
    return NextResponse.json({ reviewer: "development-fallback", queue });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
