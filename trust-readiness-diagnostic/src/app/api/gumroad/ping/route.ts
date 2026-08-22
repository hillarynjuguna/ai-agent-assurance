import { NextRequest, NextResponse } from "next/server";
import { savePing } from "@/lib/reports/pings";
import { GumroadPingRecord } from "@/lib/reports/types";
import { tagBeehiivBuyer } from "@/lib/email/beehiiv";

export async function POST(req: NextRequest) {
  try {
    let payload: Record<string, string> = {};

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });
    } else if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        payload[key] = value;
      });
    }

    // Optional Shared Secret Validation
    const expectedSecret = process.env.GUMROAD_PING_SECRET;
    if (!expectedSecret && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, message: "GUMROAD_PING_SECRET is not configured." },
        { status: 500 }
      );
    }

    if (expectedSecret) {
      const providedSecret =
        req.headers.get("x-gumroad-secret") ||
        req.nextUrl.searchParams.get("secret") ||
        payload["secret"] ||
        payload["ping_secret"];
      if (providedSecret !== expectedSecret) {
        console.warn("[GumroadPing] Unauthorized ping attempt - secret mismatch.");
        return NextResponse.json({ success: false, message: "Unauthorized ping secret mismatch." }, { status: 401 });
      }
    }

    // Extract custom fields
    const customFields: Record<string, string> = {};
    let reportId: string | undefined;
    let companyName: string | undefined;
    let agentDescription: string | undefined;
    let counterpartyFocus: string | undefined;
    let deadline: string | undefined;

    Object.keys(payload).forEach((key) => {
      if (key.startsWith("custom_fields[")) {
        const fieldName = key.replace(/^custom_fields\[/, "").replace(/\]$/, "");
        const value = payload[key];
        customFields[fieldName] = value;

        const lowerName = fieldName.toLowerCase();
        if (lowerName.includes("report id") || lowerName.includes("report_id")) {
          reportId = value.trim();
        } else if (lowerName.includes("company") || lowerName.includes("project")) {
          companyName = value.trim();
        } else if (lowerName.includes("what does") || lowerName.includes("summary") || lowerName.includes("agent do")) {
          agentDescription = value.trim();
        } else if (lowerName.includes("counterparty") || lowerName.includes("concern") || lowerName.includes("focus")) {
          counterpartyFocus = value.trim();
        } else if (lowerName.includes("deadline")) {
          deadline = value.trim();
        }
      }
    });

    const pingRecord: GumroadPingRecord = {
      id: payload.sale_id || payload.id || `ping_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sellerId: payload.seller_id || "",
      productId: payload.product_id || payload.product_permalink || "",
      productName: payload.product_name || "Gumroad Product",
      permalink: payload.permalink || payload.product_permalink || "",
      email: payload.email || "",
      licenseKey: payload.license_key || "",
      priceCents: parseInt(payload.price || "0", 10),
      currency: payload.currency || "usd",
      reportId,
      companyName,
      agentDescription,
      counterpartyFocus,
      deadline,
      rawCustomFields: customFields,
      createdAt: payload.created_at || new Date().toISOString(),
      matchStatus: "unmatched",
    };

    await savePing(pingRecord);
    console.log(`[GumroadPing] Successfully recorded ping ${pingRecord.id} for buyer ${pingRecord.email}`);

    // Asynchronously tag buyer in Beehiiv to suppress sales nurture and track buyer status
    if (pingRecord.email && pingRecord.email.includes("@")) {
      tagBeehiivBuyer({
        email: pingRecord.email,
        productType: pingRecord.productName || pingRecord.productId,
        reportId: pingRecord.reportId,
      }).catch((err) => console.error("[GumroadPing] Beehiiv buyer tagging failed:", err));
    }

    return NextResponse.json({
      success: true,
      pingId: pingRecord.id,
      matchStatus: pingRecord.matchStatus,
    });
  } catch (err: unknown) {
    console.error("[GumroadPing] Error handling ping webhook:", err);
    return NextResponse.json({ success: false, message: "Error processing sale ping." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    endpoint: "Gumroad Ping Webhook Endpoint",
    documentation: "POST form-urlencoded or JSON sale pings from Gumroad dashboard Settings -> Advanced -> Ping",
  });
}
