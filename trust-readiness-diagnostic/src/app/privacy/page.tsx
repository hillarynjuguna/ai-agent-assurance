import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="container" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <div className="glass-panel">
        <h1 style={{ fontSize: "1.8rem", marginBottom: "10px", color: "#fff" }}>Privacy Policy</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "25px" }}>
          Last updated: August 7, 2026
        </p>

        <section style={{ marginBottom: "20px", color: "var(--text-primary)", lineHeight: "1.6", fontSize: "0.9rem" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--accent-color)", marginTop: "20px" }}>1. Information We Collect</h2>
          <p>
            When you use the Agent Trust Readiness Diagnostic, we collect information you voluntarily provide, including:
          </p>
          <ul style={{ paddingLeft: "20px", color: "var(--text-secondary)" }}>
            <li>Your email address (to deliver your diagnostic snapshot and report).</li>
            <li>Operational assessment details regarding your AI agent workflow (risk levels, capability selections, and counterparty requirements).</li>
            <li>Technical metadata such as referral sources and UTM parameters.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "20px", color: "var(--text-primary)", lineHeight: "1.6", fontSize: "0.9rem" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--accent-color)", marginTop: "20px" }}>2. How We Use Your Information</h2>
          <p>We use your data solely to:</p>
          <ul style={{ paddingLeft: "20px", color: "var(--text-secondary)" }}>
            <li>Generate your customized Trust Readiness Snapshot and report.</li>
            <li>Sync your email with our email service provider (Beehiiv) to send your requested snapshot link and relevant follow-up analysis.</li>
            <li>Match Gumroad purchases to your diagnostic report record for manual or automated fulfillment.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "20px", color: "var(--text-primary)", lineHeight: "1.6", fontSize: "0.9rem" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--accent-color)", marginTop: "20px" }}>3. Data Storage & Protection</h2>
          <p>
            Your diagnostic data is stored securely in encrypted cloud infrastructure (Vercel KV). We do not sell, rent, or trade your PII or workflow assessment data to third parties.
          </p>
        </section>

        <section style={{ marginBottom: "25px", color: "var(--text-primary)", lineHeight: "1.6", fontSize: "0.9rem" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--accent-color)", marginTop: "20px" }}>4. Data Deletion & Rights</h2>
          <p>
            Under GDPR, CCPA, and global privacy standards, you have the right to inspect or request total deletion of your data at any time. To request deletion of your diagnostic records, contact support at <strong>thegeiya@gmail.com</strong>.
          </p>
        </section>

        <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid var(--surface-border)" }}>
          <Link href="/" className="cta-btn cta-btn-outline" style={{ display: "inline-block", width: "auto" }}>
            Return to Diagnostic
          </Link>
        </div>
      </div>
    </div>
  );
}
