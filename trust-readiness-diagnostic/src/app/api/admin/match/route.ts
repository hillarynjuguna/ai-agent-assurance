import { NextRequest, NextResponse } from "next/server";
import { manualMatchPing } from "@/lib/reports/pings";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("x-admin-token") || req.nextUrl.searchParams.get("token");
    const expectedToken = process.env.ADMIN_ACCESS_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { success: false, message: "ADMIN_ACCESS_TOKEN is not configured." },
        { status: 500 }
      );
    }

    if (token !== expectedToken) {
      return NextResponse.json({ success: false, message: "Unauthorized admin access token." }, { status: 401 });
    }

    const body = await req.json();
    const { pingId, reportId } = body;

    if (!pingId || !reportId) {
      return NextResponse.json(
        { success: false, message: "Missing pingId or reportId parameter." },
        { status: 400 }
      );
    }

    const matched = await manualMatchPing(pingId, reportId);
    if (!matched) {
      return NextResponse.json(
        { success: false, message: "Match failed. Ensure both Ping ID and Report ID exist." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully matched Ping ${pingId} with Report ${reportId}`,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}
