import { NextResponse } from "next/server";
import { phase6ErrorResponseJson } from "../../../../../lib/assurance/http";
import { generateAssuranceReport, getLatestAssuranceReport } from "../../../../../lib/assurance/report-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const report = await getLatestAssuranceReport(assessmentId);
    if (!report) return NextResponse.json({ error: "No report has been generated" }, { status: 404 });
    return NextResponse.json({ report });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const result = await generateAssuranceReport(assessmentId);
    return NextResponse.json({ report: result.report, status: result.state.status }, { status: 201 });
  } catch (error) {
    return phase6ErrorResponseJson(error);
  }
}
