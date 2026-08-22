/**
 * Beehiiv API v2 Sync Engine
 * Automatically syncs diagnostic leads into Beehiiv for automated email nurture sequences.
 */

export interface BeehiivSubscriberPayload {
  email: string;
  reportId?: string;
  metaRisk?: string;
  capPct?: number;
  assurPct?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export async function subscribeToBeehiiv(payload: BeehiivSubscriberPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    console.log("[Beehiiv] API key or Publication ID not configured. Skipping automated email sync.");
    return { success: false, error: "Beehiiv unconfigured" };
  }

  if (!payload.email || !payload.email.includes("@")) {
    return { success: false, error: "Invalid email" };
  }

  try {
    const url = `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`;
    
    const body: Record<string, unknown> = {
      email: payload.email,
      reactivate_existing: true,
      send_welcome_email: true,
      utm_source: payload.utmSource || "trust-readiness-diagnostic",
      utm_medium: payload.utmMedium || "lead-magnet",
      ...(payload.utmCampaign ? { utm_campaign: payload.utmCampaign } : {}),
      custom_fields: [
        ...(payload.reportId ? [{ name: "Report ID", value: payload.reportId }] : []),
        ...(payload.metaRisk ? [{ name: "Risk Profile", value: payload.metaRisk }] : []),
        ...(payload.capPct !== undefined ? [{ name: "Capability Score", value: String(payload.capPct) }] : []),
        ...(payload.assurPct !== undefined ? [{ name: "Assurance Score", value: String(payload.assurPct) }] : []),
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Beehiiv] API error:", res.status, errText);
      return { success: false, error: `Beehiiv returned HTTP ${res.status}` };
    }

    const data = await res.json();
    console.log("[Beehiiv] Successfully subscribed email:", payload.email, data.data?.id);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Beehiiv] Failed to subscribe:", message);
    return { success: false, error: message };
  }
}

/**
 * Updates a Beehiiv subscriber upon Gumroad purchase to tag them as a buyer and prevent non-buyer sales emails.
 */
export async function tagBeehiivBuyer(params: {
  email: string;
  productType: "readiness-report" | "expert-review" | string;
  reportId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    return { success: false, error: "Beehiiv unconfigured" };
  }

  if (!params.email || !params.email.includes("@")) {
    return { success: false, error: "Invalid email" };
  }

  try {
    const url = `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`;
    
    const tag = params.productType.includes("expert") || params.productType.includes("founder") 
      ? "purchased-review" 
      : "purchased-report";

    const body: Record<string, unknown> = {
      email: params.email,
      reactivate_existing: true,
      send_welcome_email: false, // Don't re-trigger welcome email on purchase
      custom_fields: [
        { name: "Buyer Status", value: tag },
        { name: "Payment Status", value: "paid" },
        ...(params.reportId ? [{ name: "Report ID", value: params.reportId }] : []),
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Beehiiv Buyer Tag] Error:", res.status, errText);
      return { success: false, error: `Beehiiv returned HTTP ${res.status}` };
    }

    console.log(`[Beehiiv Buyer Tag] Successfully tagged buyer ${params.email} as ${tag}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Beehiiv Buyer Tag] Exception:", message);
    return { success: false, error: message };
  }
}
