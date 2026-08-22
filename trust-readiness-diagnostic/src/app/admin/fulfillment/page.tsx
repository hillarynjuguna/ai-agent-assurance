"use client";

import React, { useState } from "react";
import { DiagnosticReportRecord, GumroadPingRecord } from "@/lib/reports/types";

interface DashboardStats {
  totalReports: number;
  totalPings: number;
  unmatchedReportsCount: number;
  unmatchedPingsCount: number;
}

export default function FulfillmentDashboardPage() {
  const [adminToken, setAdminToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reports, setReports] = useState<DiagnosticReportRecord[]>([]);
  const [pings, setPings] = useState<GumroadPingRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [manualPingId, setManualPingId] = useState("");
  const [manualReportId, setManualReportId] = useState("");
  const [matchStatusMsg, setMatchStatusMsg] = useState<string | null>(null);

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    fetchData(adminToken);
  };

  const fetchData = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fulfillment?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to authenticate admin token.");
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
        setReports(data.reports || []);
        setPings(data.pings || []);
        setStats(data.stats);
      }
    } catch {
      setError("Error connecting to admin API endpoint.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPingId || !manualReportId) return;
    setMatchStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/match?token=${encodeURIComponent(adminToken)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({ pingId: manualPingId, reportId: manualReportId }),
      });
      const data = await res.json();
      if (data.success) {
        setMatchStatusMsg(`✓ Success: ${data.message}`);
        fetchData(adminToken);
        setManualPingId("");
        setManualReportId("");
      } else {
        setMatchStatusMsg(`❌ Error: ${data.message}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error occurred";
      setMatchStatusMsg(`❌ Error matching: ${errMsg}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: "50px 20px", maxWidth: "500px", margin: "0 auto" }}>
        <div className="glass-panel" style={{ textAlign: "center" }}>
          <h1 style={{ color: "#fff", marginTop: 0, fontSize: "1.5rem" }}>🔒 Manual Fulfillment Admin</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
            Enter your <code>ADMIN_ACCESS_TOKEN</code> to access report matching and sale ping records.
          </p>

          <form onSubmit={handleAuthenticate}>
            <input
              type="password"
              placeholder="Enter ADMIN_ACCESS_TOKEN"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid var(--surface-border)",
                color: "#fff",
                marginBottom: "15px",
              }}
            />
            <button type="submit" className="cta-btn" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Authenticating..." : "Access Dashboard"}
            </button>
          </form>

          {error && (
            <div style={{ color: "var(--danger)", marginTop: "15px", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "40px 20px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#fff", fontSize: "1.8rem" }}>🛠️ Fulfillment & Order Match Dashboard</h1>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Manual early-access order matching, report lookup, and Gumroad sale pings.
          </div>
        </div>
        <button
          onClick={() => setIsAuthenticated(false)}
          className="cta-btn cta-btn-outline"
          style={{ width: "auto", padding: "8px 16px", fontSize: "0.85rem" }}
        >
          Lock Admin
        </button>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "30px" }}>
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "18px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Reports</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", marginTop: "4px" }}>{stats.totalReports}</div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "18px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Gumroad Pings</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-color)", marginTop: "4px" }}>{stats.totalPings}</div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "18px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Unmatched Reports</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--warning)", marginTop: "4px" }}>{stats.unmatchedReportsCount}</div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "18px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Unmatched Orders</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--danger)", marginTop: "4px" }}>{stats.unmatchedPingsCount}</div>
          </div>
        </div>
      )}

      {/* Manual Match Panel */}
      <div className="glass-panel" style={{ marginBottom: "35px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "12px", color: "#fff" }}>🔗 Manual Order-to-Report Match</h3>
        <form onSubmit={handleManualMatch} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px" }}>
          <input
            type="text"
            placeholder="Gumroad Sale/Ping ID"
            value={manualPingId}
            onChange={(e) => setManualPingId(e.target.value)}
            style={{ padding: "10px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--surface-border)", color: "#fff" }}
          />
          <input
            type="text"
            placeholder="Diagnostic Report ID (rep_xxx)"
            value={manualReportId}
            onChange={(e) => setManualReportId(e.target.value)}
            style={{ padding: "10px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--surface-border)", color: "#fff" }}
          />
          <button type="submit" className="cta-btn" style={{ padding: "10px 20px" }}>
            Execute Match
          </button>
        </form>
        {matchStatusMsg && (
          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: matchStatusMsg.startsWith("✓") ? "var(--success)" : "var(--danger)" }}>
            {matchStatusMsg}
          </div>
        )}
      </div>

      {/* Grid: Reports & Pings */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
        {/* Reports List */}
        <div>
          <h3 style={{ color: "#fff", marginBottom: "15px" }}>Diagnostic Reports ({reports.length})</h3>
          <div style={{ display: "grid", gap: "12px", maxHeight: "500px", overflowY: "auto" }}>
            {reports.map((r) => (
              <div key={r.id} style={{ background: "rgba(0,0,0,0.3)", padding: "14px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{r.id}</span>
                  <span className={`gate-status ${r.paymentStatus === 'paid' ? 'status-ready' : 'status-gap'}`}>
                    {r.paymentStatus.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{r.metadata?.operationAssessed || "Workflow"}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Score: Cap {r.results?.capPct}% | Assur {r.results?.assurPct}% | Created: {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No reports created yet.</div>
            )}
          </div>
        </div>

        {/* Gumroad Pings List */}
        <div>
          <h3 style={{ color: "#fff", marginBottom: "15px" }}>Gumroad Sales / Pings ({pings.length})</h3>
          <div style={{ display: "grid", gap: "12px", maxHeight: "500px", overflowY: "auto" }}>
            {pings.map((p) => (
              <div key={p.id} style={{ background: "rgba(0,0,0,0.3)", padding: "14px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 700, color: "#fff" }}>{p.productName}</span>
                  <span className={`gate-status ${p.matchStatus === 'matched' || p.matchStatus === 'manual_assigned' ? 'status-ready' : 'status-not-ready'}`}>
                    {p.matchStatus.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>Buyer: {p.email}</div>
                {p.reportId && (
                  <div style={{ fontSize: "0.78rem", color: "var(--accent-color)", fontFamily: "monospace", marginTop: "2px" }}>
                    Report ID: {p.reportId}
                  </div>
                )}
                {p.licenseKey && (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                    Key: {p.licenseKey}
                  </div>
                )}
              </div>
            ))}
            {pings.length === 0 && (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No Gumroad pings received yet. Send a test ping to <code>/api/gumroad/ping</code>.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
