import React from "react";
import { getReport } from "../../../lib/reports/store";
import { generateReportContent } from "../../../lib/reports/content";
import { getPaymentUrl } from "../../../lib/payments/gumroad";
import { ReportHandoffControls } from "./ReportHandoffControls";
import Link from "next/link";

interface ReportPageProps {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ mock?: string; session_id?: string }>;
}

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const { reportId } = await params;
  const sParams = await searchParams;
  const isMockParam = sParams.mock === "true";

  const report = await getReport(reportId);

  if (!report) {
    return (
      <div className="container" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
        <div className="glass-panel">
          <h1 style={{ color: "var(--danger)" }}>Report Not Found</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            No diagnostic report record was found for ID: <code>{reportId}</code>
          </p>
          <Link href="/" className="cta-btn" style={{ display: "inline-block", marginTop: "20px", width: "auto" }}>
            Return to Diagnostic
          </Link>
        </div>
      </div>
    );
  }

  const { results, metadata, paymentStatus, createdAt, dimensionData } = report;
  const isPaid = paymentStatus === "paid";
  const isMock = paymentStatus === "mock" || isMockParam;

  // Generate deterministic structured content
  const content = generateReportContent(
    dimensionData || {},
    metadata.metaRisk || "Operational",
    metadata.operationAssessed || "Assessed Workflow"
  );

  const reportPaymentUrl = getPaymentUrl("readiness-report", reportId);
  const expertPaymentUrl = getPaymentUrl("expert-review", reportId);

  // Top 3 priority gaps for free view
  const freeTopGaps = results.gaps.slice(0, 3);

  return (
    <div className="container" style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <div className="hero-section" style={{ marginBottom: "30px" }}>
        <h1 className="hero-heading" style={{ fontSize: "1.8rem" }}>
          Trust Readiness Assessment Report
        </h1>
        <div className="hero-sub" style={{ fontSize: "0.95rem" }}>
          Find out whether your agentic AI workflow is safe enough for payment processors, investors, insurers, clients, or regulators to trust.
        </div>
      </div>

      {/* Interactive Handoff & Export Bar */}
      <ReportHandoffControls
        report={report}
        reportPaymentUrl={reportPaymentUrl}
        expertPaymentUrl={expertPaymentUrl}
        isPaid={isPaid}
      />

      <div className="glass-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--surface-border)", paddingBottom: "15px", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{metadata.operationAssessed || "Assessed Agentic Workflow"}</h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Report ID: <code>{report.id}</code> | Created: {new Date(createdAt).toLocaleString()} | Risk Level: <strong>{metadata.metaRisk || "Operational"}</strong>
            </div>
          </div>
          <div>
            {isPaid ? (
              <span className="gate-status status-ready" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                PAID & VERIFIED
              </span>
            ) : isMock ? (
              <span className="gate-status status-conditional" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                FREE PREVIEW / MOCK CHECKOUT
              </span>
            ) : (
              <span className="gate-status status-weak" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                FREE PREVIEW
              </span>
            )}
          </div>
        </div>

        {/* Free Section: Capability & Assurance Scores */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "25px" }}>
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Capability Score</div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--accent-color)", margin: "8px 0" }}>{results.capPct}%</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Zone: <strong style={{ textTransform: "capitalize" }}>{results.capZone}</strong></div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Assurance Score</div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--evidence-color)", margin: "8px 0" }}>{results.assurPct}%</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Zone: <strong style={{ textTransform: "capitalize" }}>{results.assurZone}</strong></div>
          </div>
        </div>

        {/* Free Section: Reliance Verdict */}
        <div className="reliance-box" style={{ marginBottom: "25px" }}>
          <div className="reliance-verdict">{results.verdict}</div>
          <div className="reliance-rationale">{results.rationale}</div>
        </div>

        {/* Free Section: Counterparty Trust Gates */}
        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "8px", fontSize: "1.1rem" }}>Counterparty Trust Gates</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 0, marginBottom: "15px" }}>
            How external counterparties view this workflow based on current assurance levels:
          </p>

          <div className="trust-gates">
            <div className="trust-gate">
              <div className="gate-name">Payment Processor</div>
              <div className={`gate-status ${results.gates.payment.cssClass}`}>{results.gates.payment.text}</div>
            </div>
            <div className="trust-gate">
              <div className="gate-name">Investor Diligence</div>
              <div className={`gate-status ${results.gates.investor.cssClass}`}>{results.gates.investor.text}</div>
            </div>
            <div className="trust-gate">
              <div className="gate-name">Insurer Review</div>
              <div className={`gate-status ${results.gates.insurer.cssClass}`}>{results.gates.insurer.text}</div>
            </div>
            <div className="trust-gate">
              <div className="gate-name">Enterprise Client</div>
              <div className={`gate-status ${results.gates.client.cssClass}`}>{results.gates.client.text}</div>
            </div>
            <div className="trust-gate">
              <div className="gate-name">Regulator</div>
              <div className={`gate-status ${results.gates.regulator.cssClass}`}>{results.gates.regulator.text}</div>
            </div>
          </div>
        </div>

        {/* Free Section: Top 3 Priority Gaps Only */}
        <div style={{ marginBottom: "35px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "12px", fontSize: "1.1rem", borderBottom: "1px solid var(--surface-border)", paddingBottom: "8px" }}>
            Top Priority Gaps (Free Preview)
          </h3>
          {freeTopGaps.length > 0 ? (
            <ul style={{ paddingLeft: "20px", color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>
              {freeTopGaps.map((gap, idx) => (
                <li key={idx} style={{ marginBottom: "6px" }}>{gap}</li>
              ))}
            </ul>
          ) : (
            <div style={{ color: "var(--success)", fontSize: "0.9rem" }}>No critical capability or assurance deficits detected.</div>
          )}
          {results.gaps.length > 3 && !isPaid && (
            <div style={{ fontSize: "0.85rem", color: "var(--warning)", marginTop: "10px", fontStyle: "italic" }}>
              + {results.gaps.length - 3} additional priority gaps locked in Full Report.
            </div>
          )}
        </div>

        {/* --- LOCKED PAID SECTIONS (UNLESS ISPAID) --- */}
        {!isPaid ? (
          <div style={{ position: "relative", marginTop: "40px" }}>
            {/* Visual Lock Banner */}
            <div style={{
              background: "linear-gradient(180deg, rgba(15,17,26,0.5) 0%, rgba(15,17,26,0.95) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              borderRadius: "12px",
              padding: "35px 20px",
              textAlign: "center",
              marginBottom: "30px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🔒</div>
              <h3 style={{ margin: "0 0 10px 0", color: "#fff", fontSize: "1.3rem" }}>
                Full Governance & Evidence Vault Gated
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "600px", margin: "0 auto 25px", lineHeight: 1.5 }}>
                Unlock the complete evidence checklist, step-by-step remediation plan, counterparty-facing summary, board-ready narrative, and export options.
              </p>
              
              <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href={reportPaymentUrl} className="cta-btn" style={{ display: "inline-block", width: "auto", textDecoration: "none" }}>
                  Unlock Full Report on Gumroad ($19)
                </a>
                <a href={expertPaymentUrl} className="cta-btn cta-btn-outline" style={{ display: "inline-block", width: "auto", textDecoration: "none" }}>
                  Request Founder Review on Gumroad ($149)
                </a>
              </div>
            </div>

            {/* Blurred Teaser of Locked Content */}
            <div style={{ filter: "blur(4px)", opacity: 0.4, pointerEvents: "none", userSelect: "none" }}>
              <h3 style={{ borderBottom: "1px solid var(--surface-border)", paddingBottom: "8px" }}>Full Evidence Checklist (D1-D10)</h3>
              <p>Tamper-evident logs, RBAC scoping, kill-switch verification, and model provenance lineage artifacts...</p>
              <h3 style={{ borderBottom: "1px solid var(--surface-border)", paddingBottom: "8px", marginTop: "20px" }}>Board & Counterparty Narrative</h3>
              <p>Comprehensive risk breakdown for processors, CISOs, underwriting boards, and regulators...</p>
            </div>
          </div>
        ) : (
          /* PAID REVEALED CONTENT */
          <div style={{ marginTop: "40px", borderTop: "2px solid var(--accent-color)", paddingTop: "30px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px", fontSize: "1.2rem", color: "#fff" }}>
              Full Evidence Checklist & Required Artifacts
            </h3>
            <div style={{ display: "grid", gap: "15px", marginBottom: "30px" }}>
              {content.evidenceChecklist.map((item) => (
                <div key={item.dimensionId} style={{ background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ color: "#fff" }}>D{item.dimensionId}: {item.title}</strong>
                    <span className={`gate-status ${item.status === 'PASS' ? 'status-ready' : item.status === 'EXEMPT' ? 'status-gap' : 'status-not-ready'}`}>
                      {item.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    <strong>Required Evidence:</strong> {item.requiredEvidence}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <strong>Acceptable Artifacts:</strong> {item.acceptableArtifacts.join(", ")}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: "15px", fontSize: "1.2rem", color: "#fff" }}>
              Step-by-Step Remediation Plan ({content.remediationPlan.length} Steps)
            </h3>
            <div style={{ display: "grid", gap: "12px", marginBottom: "35px" }}>
              {content.remediationPlan.map((step, idx) => (
                <div key={idx} style={{ background: "rgba(0,0,0,0.2)", padding: "15px", borderRadius: "6px", borderLeft: `4px solid ${step.priority === 'HIGH' ? 'var(--danger)' : 'var(--warning)'}` }}>
                  <div style={{ fontWeight: 600, color: "#fff", marginBottom: "4px" }}>
                    [{step.priority} PRIORITY] D{step.dimensionId}: {step.title}
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "var(--text-primary)", marginBottom: "4px" }}>{step.actionableStep}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Target Outcome: {step.targetOutcome}</div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: "15px", fontSize: "1.2rem", color: "#fff" }}>
              Counterparty Audit & DDQ Defense Questions
            </h3>
            <div style={{ display: "grid", gap: "12px", marginBottom: "30px" }}>
              {content.reviewQuestions.map((q, idx) => (
                <div key={idx} style={{ background: "rgba(255,255,255,0.03)", padding: "15px", borderRadius: "6px", border: "1px solid var(--surface-border)" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--accent-color)", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>
                    {q.counterparty} Question
                  </div>
                  <div style={{ fontWeight: 500, color: "#fff", marginBottom: "4px" }}>&ldquo;{q.question}&rdquo;</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Why counterparties ask this: {q.whyAsked}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Trust and Legal Copy Disclaimer */}
        <div style={{ marginTop: "50px", paddingTop: "20px", borderTop: "1px solid var(--surface-border)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          <strong>Product Trust & Legal Disclaimer:</strong> This diagnostic tool is designed as a pre-diligence governance evaluation aid and does not constitute formal legal, regulatory, or underwriting advice. All calculated scores rely on user-provided operational claims. External acceptance by payment processors, venture investors, cyber insurers, enterprise clients, or regulatory bodies is subject to independent counterparty audit and is not guaranteed.
        </div>

        <div style={{ marginTop: "25px", textAlign: "center" }}>
          <Link href="/" className="cta-btn cta-btn-outline" style={{ display: "inline-block", width: "auto" }}>
            Return to Diagnostic Form
          </Link>
        </div>
      </div>
    </div>
  );
}
