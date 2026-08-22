export const GUMROAD_REPORT_URL = process.env.NEXT_PUBLIC_GUMROAD_REPORT_URL || "";
export const GUMROAD_EXPERT_URL = process.env.NEXT_PUBLIC_GUMROAD_EXPERT_URL || "";

export type PaymentProductType = "readiness-report" | "expert-review" | "free-snapshot";

export function isGumroadConfigured(type: PaymentProductType): boolean {
  if (type === "readiness-report") {
    return Boolean(GUMROAD_REPORT_URL && GUMROAD_REPORT_URL.trim() !== "");
  }
  if (type === "expert-review") {
    return Boolean(GUMROAD_EXPERT_URL && GUMROAD_EXPERT_URL.trim() !== "");
  }
  return false;
}

export function getPaymentUrl(type: PaymentProductType, reportId?: string): string {
  const baseUrl = type === "readiness-report" ? GUMROAD_REPORT_URL : GUMROAD_EXPERT_URL;

  if (baseUrl && baseUrl.trim() !== "") {
    try {
      const url = new URL(baseUrl);
      if (reportId) {
        url.searchParams.set("report_id", reportId);
        url.searchParams.set("custom_report", reportId);
      }
      url.searchParams.set("wanted", "true");
      return url.toString();
    } catch {
      // Fallback if URL parsing fails
      const paramStr = reportId ? `?report_id=${encodeURIComponent(reportId)}` : "";
      return `${baseUrl}${paramStr}`;
    }
  }

  // Fallback to local setup/purchase page if Gumroad environment variables are unconfigured
  const reportParam = reportId ? `?reportId=${encodeURIComponent(reportId)}&type=${type}` : `?type=${type}`;
  return `/purchase${reportParam}`;
}
