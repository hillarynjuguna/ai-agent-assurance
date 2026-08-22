"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function AccessPage() {
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !licenseKey) {
      setStatusMessage("Please enter both your email address and Gumroad license key.");
      return;
    }
    // Honest non-faked verification response
    setStatusMessage(
      "Your Gumroad license key serves as your purchase reference number. " +
      "Automated license verification is not connected yet during early access. " +
      "For assistance or manual fulfillment link requests, please reply to your Gumroad receipt email or email support directly at thegeiya@gmail.com."
    );
  };

  return (
    <div className="container" style={{ padding: "40px", maxWidth: "650px", margin: "0 auto" }}>
      <div className="glass-panel" style={{ animation: "fadeInDown 0.8s ease-out" }}>
        <h1 style={{ color: "#fff", marginTop: 0, fontSize: "1.6rem" }}>
          Verify Report License & Access
        </h1>
        <div style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid var(--accent-color)", padding: "12px 16px", borderRadius: "8px", fontSize: "0.85rem", color: "#fff", marginBottom: "20px" }}>
          <strong>Product Status:</strong> Current phase: Gumroad manual fulfillment MVP. Automated license verification and PDF generation are planned but not enabled.
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "25px" }}>
          Enter the customer email and Gumroad license key received after purchasing your Full Trust Readiness Report or Expert Review.
        </p>

        <form onSubmit={handleVerify}>
          <div className="input-group" style={{ marginBottom: "18px" }}>
            <label htmlFor="access-email">Customer Email Address</label>
            <input
              type="email"
              id="access-email"
              placeholder="e.g. founder@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--surface-border)", color: "#fff" }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: "25px" }}>
            <label htmlFor="access-key">Gumroad License Key</label>
            <input
              type="text"
              id="access-key"
              placeholder="e.g. XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--surface-border)", color: "#fff" }}
            />
          </div>

          <button type="submit" className="cta-btn" style={{ width: "100%", marginBottom: "20px" }}>
            Verify Access
          </button>
        </form>

        {statusMessage && (
          <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid var(--warning)", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--warning)", fontWeight: 600, marginBottom: "4px" }}>
              Verification Status
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
              {statusMessage}
            </div>
          </div>
        )}

        <div style={{ background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "8px", border: "1px solid var(--surface-border)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          <strong>Product Note:</strong> Automated Gumroad License API verification (checking key validity against <code>api.gumroad.com/v2/licenses/verify</code>) is scheduled for the next release milestone.
        </div>

        <div style={{ marginTop: "25px", textAlign: "center" }}>
          <Link href="/" className="cta-btn cta-btn-outline" style={{ display: "inline-block", width: "auto" }}>
            Return to Diagnostic
          </Link>
        </div>
      </div>
    </div>
  );
}
