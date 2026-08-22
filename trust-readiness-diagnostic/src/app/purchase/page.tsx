import React from "react";
import Link from "next/link";

interface PurchasePageProps {
  searchParams: Promise<{ reportId?: string; type?: string }>;
}

export default async function PurchasePage({ searchParams }: PurchasePageProps) {
  const sParams = await searchParams;
  const reportId = sParams.reportId;
  const type = sParams.type || "readiness-report";

  return (
    <div className="container" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <div className="glass-panel" style={{ animation: "fadeInDown 0.8s ease-out" }}>
        <div style={{ display: "inline-block", background: "rgba(99, 102, 241, 0.2)", color: "var(--accent-color)", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "15px" }}>
          Early Access & Fulfillment Info
        </div>

        <div style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid var(--accent-color)", padding: "12px 16px", borderRadius: "8px", fontSize: "0.85rem", color: "#fff", marginBottom: "20px" }}>
          <strong>Product Status:</strong> Current phase: Gumroad manual fulfillment MVP. Automated license verification and PDF generation are planned but not enabled.
        </div>

        <h1 style={{ color: "#fff", marginTop: 0, fontSize: "1.8rem" }}>
          {type === "expert-review" ? "Expert Trust Review Access" : "Full Trust Readiness Report Access"}
        </h1>

        <div style={{ background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "8px", border: "1px solid var(--surface-border)", marginBottom: "25px" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Assessed Report Reference:</div>
          <code style={{ fontSize: "1rem", color: "var(--accent-color)" }}>{reportId || "Pending Diagnostic Creation"}</code>
        </div>

        <h3 style={{ fontSize: "1.1rem", marginBottom: "12px", color: "#fff" }}>How Checkout & Report Fulfillment Work</h3>
        <ul style={{ color: "var(--text-secondary)", lineHeight: 1.7, paddingLeft: "20px", fontSize: "0.95rem" }}>
          <li>
            <strong>Payment Layer:</strong> Payments are processed securely via Gumroad.
          </li>
          <li>
            <strong>MVP Fulfillment Notice:</strong> Fully automated instant PDF export is currently in active development. During this early access release, report packages and expert architecture reviews are fulfilled manually by our governance team.
          </li>
          <li>
            <strong>Access Delivery:</strong> Upon checkout completion on Gumroad, your diagnostic payload reference is logged, and you will receive direct access instructions and an exportable compliance vault packet via email.
          </li>
        </ul>

        <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid var(--warning)", padding: "18px", borderRadius: "8px", marginTop: "25px", marginBottom: "30px" }}>
          <h4 style={{ margin: "0 0 6px 0", color: "var(--warning)", fontSize: "1rem" }}>Founder / Developer Setup Note</h4>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
            To connect direct checkout buttons to a live store, configure <code>NEXT_PUBLIC_GUMROAD_REPORT_URL</code> and <code>NEXT_PUBLIC_GUMROAD_EXPERT_URL</code> in your environment settings. See <code>docs/gumroad-setup.md</code> for step-by-step setup instructions.
          </p>
        </div>

        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href={reportId ? `/report/${reportId}` : "/"} className="cta-btn cta-btn-outline" style={{ display: "inline-block", width: "auto" }}>
            Return to Diagnostic Preview
          </Link>
          <Link href="/access" className="cta-btn" style={{ display: "inline-block", width: "auto" }}>
            Access Vault & License Key
          </Link>
        </div>
      </div>
    </div>
  );
}
