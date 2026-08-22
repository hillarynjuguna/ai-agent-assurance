/**
 * DORMANT / FUTURE SCAFFOLDING ROUTE
 * Primary low-friction checkout surface uses Gumroad URLs (src/lib/payments/gumroad.ts).
 * This endpoint provides optional backend session creation and local report payload saving.
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { DIMENSIONS } from "../../../data/dimensions";
import { calculateScores } from "../../../utils/scoring";
import { saveReport } from "../../../lib/reports/store";
import { DiagnosticReportRecord, PaymentStatus, ReportType } from "../../../lib/reports/types";
import { subscribeToBeehiiv } from "../../../lib/email/beehiiv";
import crypto from "node:crypto";

const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock";
const stripe = new Stripe(stripeKey, {
  apiVersion: "2026-07-29.dahlia",
});

const HIGH_RISK_PROFILES = new Set(["Financial", "Regulated", "Safety-Critical"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reportType, reportData } = body;

    // 1. Validate reportType
    if (reportType !== "readiness-report" && reportType !== "expert-review" && reportType !== "free-snapshot") {
      return NextResponse.json({ error: "Invalid or unsupported reportType" }, { status: 400 });
    }

    const typedReportType = reportType as ReportType;
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Extract metadata & dimensionData
    const metaRisk = reportData?.metaRisk || reportData?.criticality || "Operational";
    const isHighRisk = HIGH_RISK_PROFILES.has(metaRisk);
    const dimensionData = reportData?.dimensionData || {};

    // 2. Compute results server-side
    const results = calculateScores(dimensionData, DIMENSIONS, isHighRisk);

    // 3. Create report record in storage layer
    const reportId = `rep_${crypto.randomBytes(8).toString("hex")}`;
    const initialStatus: PaymentStatus = stripeKey === "sk_test_mock" ? "mock" : "pending";

    const reportRecord: DiagnosticReportRecord = {
      id: reportId,
      createdAt: new Date().toISOString(),
      paymentStatus: initialStatus,
      reportType: typedReportType,
      metadata: {
        operationAssessed: reportData?.operationAssessed || reportData?.company || "Unspecified Operation",
        metaRisk,
        activeAudiences: reportData?.activeAudiences || [],
        activeActions: reportData?.activeActions || [],
        criticality: metaRisk,
        isHighRisk,
      },
      dimensionData,
      results,
      email: reportData?.email,
    };

    await saveReport(reportRecord);

    // Sync to Beehiiv asynchronously (non-blocking) if email is provided
    if (reportData?.email && reportData.email.includes("@")) {
      subscribeToBeehiiv({
        email: reportData.email,
        reportId,
        metaRisk,
        capPct: results.capPct,
        assurPct: results.assurPct,
        utmSource: reportData?.utmSource,
        utmMedium: reportData?.utmMedium,
        utmCampaign: reportData?.utmCampaign,
      }).catch((err) => console.error("[Beehiiv] Background sync failed:", err));
    }

    if (typedReportType === "free-snapshot" || typedReportType as string === "free-snapshot") {
      return NextResponse.json({
        url: `${origin}/report/${reportId}`,
        reportId,
      });
    }

    // Price mapping (in cents)
    const prices = {
      "readiness-report": 9900,
      "expert-review": 49900,
    };

    const price = prices[typedReportType];
    const title = typedReportType === "readiness-report" ? "Full Trust Readiness Report" : "Expert Trust Review";

    // Mock Mode
    if (stripeKey === "sk_test_mock") {
      return NextResponse.json({
        url: `${origin}/report/${reportId}?mock=true`,
        sessionId: `mock_session_${reportId}`,
        reportId,
      });
    }

    // 4. Real Stripe Mode - pass ONLY compact fields into Stripe metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: title,
              description: "Agentic AI Workflow Trust Readiness Assessment",
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/report/${reportId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
      metadata: {
        reportId,
        reportType: typedReportType,
        metaRisk,
        capPct: String(results.capPct),
        assurPct: String(results.assurPct),
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    console.error("Error creating checkout session:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
