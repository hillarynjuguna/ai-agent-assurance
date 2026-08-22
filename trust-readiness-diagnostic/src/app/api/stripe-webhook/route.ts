/**
 * DORMANT / FUTURE SCAFFOLDING ROUTE
 * Primary low-friction checkout surface uses Gumroad URLs (src/lib/payments/gumroad.ts).
 * This endpoint is dormant in current MVP release phase.
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { updateReportPaymentStatus } from "../../../lib/reports/store";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripeKey = process.env.STRIPE_SECRET_KEY;
const isLiveStripeConfigured = Boolean(stripeKey && stripeKey !== "sk_test_mock");

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (isLiveStripeConfigured) {
      if (!webhookSecret) {
        return NextResponse.json(
          { error: "STRIPE_WEBHOOK_SECRET is required when live Stripe is configured" },
          { status: 500 }
        );
      }
      const stripe = new Stripe(stripeKey!, { apiVersion: "2026-07-29.dahlia" });
      if (!signature) {
        return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
      }
      try {
        event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Signature verification failed";
        console.error(`Webhook signature verification failed: ${msg}`);
        return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
      }
    } else {
      // Local/Mock webhook simulation or unconfigured secret
      console.log("[Stripe Webhook] Webhook secret not configured or in mock mode. Parsing raw JSON body.");
      try {
        event = JSON.parse(bodyText) as Stripe.Event;
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body and webhook secret is unconfigured" },
          { status: 400 }
        );
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const reportId = session.metadata?.reportId;

      if (reportId) {
        console.log(`[Stripe Webhook] Payment confirmed for reportId: ${reportId}`);
        const updated = await updateReportPaymentStatus(reportId, "paid");
        return NextResponse.json({
          received: true,
          status: "paid",
          reportId,
          updated: !!updated,
        });
      } else {
        console.warn("[Stripe Webhook] checkout.session.completed received without reportId metadata");
      }
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (err: unknown) {
    console.error("Error processing Stripe webhook:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
