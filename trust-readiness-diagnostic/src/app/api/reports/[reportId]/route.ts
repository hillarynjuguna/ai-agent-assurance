import { NextResponse } from "next/server";
import { getReport } from "../../../../lib/reports/store";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId parameter" }, { status: 400 });
    }

    const report = await getReport(reportId);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    console.error("Error fetching report:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
