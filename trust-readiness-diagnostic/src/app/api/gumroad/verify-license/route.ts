import { NextRequest, NextResponse } from "next/server";
import { getReport, updateReportPaymentStatus } from "@/lib/reports/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, productId, reportId, email } = body;

    if (!licenseKey) {
      return NextResponse.json(
        { success: false, verified: false, message: "Missing required parameter: licenseKey" },
        { status: 400 }
      );
    }

    // Environmental defaults for Gumroad product IDs
    const reportProdId = process.env.GUMROAD_REPORT_PRODUCT_ID || "uazesx";
    const reviewProdId = process.env.GUMROAD_REVIEW_PRODUCT_ID || "hd8oOeH9NheiiQ_v6RFBGQ==";

    const targetProductId = productId || reportProdId;
    const allowedProductIds = new Set([reportProdId, reviewProdId]);

    if (!allowedProductIds.has(targetProductId)) {
      return NextResponse.json(
        { success: false, verified: false, message: "Unsupported Gumroad product ID." },
        { status: 400 }
      );
    }

    // Call Gumroad license verification endpoint server-side only
    const params = new URLSearchParams();
    params.append("product_id", targetProductId);
    params.append("license_key", licenseKey.trim());
    params.append("increment_uses_count", "false");

    const response = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!data.success || !data.purchase) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: data.message || "Invalid Gumroad license key or product ID mismatch.",
      });
    }

    const purchase = data.purchase;

    if (purchase.product_id && purchase.product_id !== targetProductId) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: "License key does not match the requested product.",
      });
    }

    // Check if purchase is active and not refunded/chargebacked
    if (purchase.refunded || purchase.chargebacked) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: "This purchase has been refunded or chargebacked.",
      });
    }

    // Match product tier
    let productTier = "readiness-report";
    if (purchase.product_id === reviewProdId || purchase.product_name?.toLowerCase().includes("founder")) {
      productTier = "expert-review";
    }

    // Match local report if reportId provided
    let reportMatchStatus = "not_provided";
    if (reportId) {
      const existingReport = await getReport(reportId);
      if (existingReport) {
        await updateReportPaymentStatus(reportId, "paid");
        reportMatchStatus = "matched_and_updated";
      } else {
        reportMatchStatus = "report_id_not_found";
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      productTier,
      purchaseEmail: purchase.email || email || null,
      purchaseDate: purchase.created_at,
      usesCount: purchase.uses,
      reportMatchStatus,
    });
  } catch (err: unknown) {
    console.error("[GumroadLicenseVerify] Error verifying license:", err);
    return NextResponse.json(
      { success: false, verified: false, message: "Internal server error verifying license key." },
      { status: 500 }
    );
  }
}
