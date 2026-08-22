import { NextRequest, NextResponse } from "next/server";
import { listReports } from "@/lib/reports/store";
import { listPings } from "@/lib/reports/pings";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || req.headers.get("x-admin-token");
  const expectedToken = process.env.ADMIN_ACCESS_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { success: false, message: "ADMIN_ACCESS_TOKEN is not configured." },
      { status: 500 }
    );
  }

  if (token !== expectedToken) {
    return NextResponse.json(
      { success: false, message: "Unauthorized admin access token." },
      { status: 401 }
    );
  }

  const reports = await listReports();
  const pings = await listPings();

  const unmatchedReports = reports.filter((r) => r.paymentStatus !== "paid");
  const unmatchedPings = pings.filter((p) => p.matchStatus === "unmatched");

  return NextResponse.json({
    success: true,
    stats: {
      totalReports: reports.length,
      totalPings: pings.length,
      unmatchedReportsCount: unmatchedReports.length,
      unmatchedPingsCount: unmatchedPings.length,
    },
    reports,
    pings,
    unmatchedReports,
    unmatchedPings,
  });
}
