"use client";

import { useState } from "react";

type QueueItem = {
  summary: {
    assessmentId: string;
    snapshotId: string;
    status: string;
    level: string;
    authorityMapState: string;
    counts: { findings: number; materialFindings: number; unresolvedContradictions: number; evidence: number; reports: number };
    reportReady: { ready: boolean; blockers: string[] };
  };
  findings: Finding[];
  unresolvedContradictions: Contradiction[];
  latestRun: { llmMode: string; pressureMetrics?: Record<string, number> } | null;
};

type Finding = {
  id: string;
  title: string;
  description: string;
  basis: string;
  severity: string;
  confidence: string;
  evidenceLevel: string;
  status: string;
  origin: string;
  disposition?: string;
  evidenceIds: string[];
};

type Evidence = {
  id: string;
  findingId: string;
  evidenceType: string;
  supportsLevel: string;
  contentHash: string;
  snapshotId: string;
  submittedByType: string;
  metadata: Record<string, string>;
};

type Contradiction = {
  id: string;
  subject: string;
  sourceAExcerpt: string;
  sourceBExcerpt: string;
  state: string;
};

type Detail = {
  summary: QueueItem["summary"];
  findings: Finding[];
  evidence: Evidence[];
  review_decisions: Array<{ id: string; decision: string; reasoning: string; reviewerRole: string; disposition?: string }>;
  contradictions: Contradiction[];
  evidence_snapshot_hashes: Record<string, string>;
  diagnostics_runs: Array<{ llmMode: string; pressureMetrics?: Record<string, number> }>;
};

const panelStyle: React.CSSProperties = {
  background: "rgba(25, 28, 41, 0.78)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 24,
  marginBottom: 20,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#f8f9fa",
  marginTop: 6,
};

function Button({ children, onClick, disabled = false, secondary = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; secondary?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ background: secondary ? "transparent" : "#6366f1", border: secondary ? "1px solid rgba(255,255,255,0.2)" : "none", color: "#fff", padding: "10px 14px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontWeight: 600 }}>{children}</button>;
}

export default function AssuranceReviewPage() {
  const [assessmentId, setAssessmentId] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reasoning, setReasoning] = useState("I reviewed the committed Authority Map and source-bound assessment context.");
  const [reviewReasoning, setReviewReasoning] = useState("The finding is reviewed against the current snapshot-bound evidence.");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [scenario, setScenario] = useState("valid_minimal");
  const [mode, setMode] = useState<"mock" | "live">("mock");
  const [decision, setDecision] = useState("accept");
  const [disposition, setDisposition] = useState("confirmed");
  const [severity, setSeverity] = useState("");
  const [confidence, setConfidence] = useState("");
  const [evidenceType, setEvidenceType] = useState("test_result");
  const [evidenceLevel, setEvidenceLevel] = useState("E2_observed");
  const [contentHash, setContentHash] = useState("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
  const [storageRef, setStorageRef] = useState("reviewer://local-artifact");
  const [observationContext, setObservationContext] = useState("Controlled review observation against the assessed snapshot.");
  const [contradictionState, setContradictionState] = useState("accepted_as_unknown");
  const [attestationDecision, setAttestationDecision] = useState("attested_with_residual_risk");
  const [attestationScope, setAttestationScope] = useState("This report, its bound snapshot, reviewed findings, evidence ledger, and listed residual uncertainty.");
  const [report, setReport] = useState<{ reportVersion: string; reportHash: string; markdown: string } | null>(null);

  async function call(path: string, options?: RequestInit) {
    const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function loadQueue() {
    setBusy(true);
    try {
      const data = await call("/api/reviewer/queue");
      setQueue(data.queue || []);
      setMessage(`Loaded ${data.queue?.length || 0} review item(s).`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load queue"); }
    finally { setBusy(false); }
  }

  async function loadAssessment(id = assessmentId) {
    if (!id.trim()) return;
    setBusy(true);
    try {
      const data = await call(`/api/assessments/${encodeURIComponent(id)}/findings`);
      setDetail(data);
      setMessage(`Loaded assessment ${id}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load assessment"); }
    finally { setBusy(false); }
  }

  async function commitMap() {
    setBusy(true);
    try { await call(`/api/assessments/${encodeURIComponent(assessmentId)}/authority-map`, { method: "POST", body: JSON.stringify({ reasoning }) }); await loadAssessment(); setMessage("Authority Map committed. The commitment is recorded as an append-only reviewer decision."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not commit map"); }
    finally { setBusy(false); }
  }

  async function runDiagnostics() {
    setBusy(true);
    try { await call(`/api/assessments/${encodeURIComponent(assessmentId)}/diagnostics/run`, { method: "POST", body: JSON.stringify({ mode, scenario }) }); await loadAssessment(); setMessage("Diagnostics completed. LLM outputs remain proposals until reviewed."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Diagnostics failed"); }
    finally { setBusy(false); }
  }

  async function submitReview(finding: Finding) {
    setBusy(true);
    try {
      await call(`/api/findings/${encodeURIComponent(finding.id)}/review`, { method: "POST", body: JSON.stringify({ decision, disposition, reasoning: reviewReasoning, evidenceSnapshotHash: detail?.evidence_snapshot_hashes[finding.id], ...(severity ? { newSeverity: severity } : {}), ...(confidence ? { newConfidence: confidence } : {}) }) });
      await loadAssessment();
      setMessage(`Review decision recorded for ${finding.id}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Review failed"); }
    finally { setBusy(false); }
  }

  async function attachEvidence(finding: Finding) {
    setBusy(true);
    try {
      await call(`/api/findings/${encodeURIComponent(finding.id)}/evidence`, { method: "POST", body: JSON.stringify({ evidenceType, supportsLevel: evidenceLevel, contentHash, storageRef, snapshotId: detail?.summary.snapshotId, metadata: evidenceLevel === "E2_observed" ? { observationContext, observedAt: new Date().toISOString() } : { testName: "Reviewer-controlled assurance test", procedure: observationContext, expectedResult: "Control behaves as documented", actualResult: "Observed during review", result: "pass", executedAt: new Date().toISOString() } }) });
      await loadAssessment();
      setMessage(`Evidence attached to ${finding.id}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Evidence attachment failed"); }
    finally { setBusy(false); }
  }

  async function resolveContradiction(item: Contradiction) {
    setBusy(true);
    try {
      await call(`/api/assessments/${encodeURIComponent(assessmentId)}/contradictions/${encodeURIComponent(item.id)}`, { method: "POST", body: JSON.stringify({ state: contradictionState, reasoning: reviewReasoning, evidenceIds: [] }) });
      await loadAssessment();
      setMessage(`Contradiction ${item.id} updated without deleting its original excerpts.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Contradiction resolution failed"); }
    finally { setBusy(false); }
  }

  async function generateReport() {
    setBusy(true);
    try { const data = await call(`/api/assessments/${encodeURIComponent(assessmentId)}/report`, { method: "POST" }); setReport(data.report); await loadAssessment(); setMessage(`Report generated with hash ${data.report.reportHash}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Report generation failed"); }
    finally { setBusy(false); }
  }

  async function attest() {
    if (!report) return;
    setBusy(true);
    try { await call(`/api/assessments/${encodeURIComponent(assessmentId)}/attestation`, { method: "POST", body: JSON.stringify({ reportVersion: report.reportVersion, reportHash: report.reportHash, decision: attestationDecision, scope: attestationScope }) }); await loadAssessment(); setMessage("Attestation recorded. It is human accountability metadata, not a cryptographic signature."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Attestation failed"); }
    finally { setBusy(false); }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "34px 20px", maxWidth: 1180, margin: "0 auto" }}>
      <section style={{ marginBottom: 28 }}>
        <p style={{ color: "#14b8a6", textTransform: "uppercase", letterSpacing: 2, fontSize: 12, fontWeight: 700 }}>Assurance decision layer · Phase 6</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", margin: "8px 0", lineHeight: 1.08 }}>Review what the machine found.</h1>
        <p style={{ color: "#a0aabf", maxWidth: 760, fontSize: 17 }}>A snapshot-bound reviewer console for committing the Authority Map, running deterministic and LLM-assisted diagnostics, attaching evidence, recording reasoned decisions, resolving contradictions, and generating a reproducible report.</p>
      </section>

      <section style={panelStyle}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ flex: "1 1 360px" }}>Assessment ID<input style={inputStyle} value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)} placeholder="Paste an intake assessment ID" /></label>
          <Button onClick={() => void loadAssessment()} disabled={busy || !assessmentId}>Load assessment</Button>
          <Button onClick={() => void loadQueue()} disabled={busy} secondary>Refresh queue</Button>
        </div>
        <p style={{ color: "#a0aabf", fontSize: 13, marginBottom: 0 }}>Development boundary: reviewer identity comes from server configuration or the named internal-validator fallback. This page does not claim production authentication.</p>
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Reviewer queue</h2>
        {queue.length === 0 ? <p style={{ color: "#a0aabf" }}>No assessment is currently waiting in the local queue.</p> : <div style={{ display: "grid", gap: 10 }}>{queue.map((item) => <button key={item.summary.assessmentId} onClick={() => { setAssessmentId(item.summary.assessmentId); void loadAssessment(item.summary.assessmentId); }} style={{ textAlign: "left", color: "#f8f9fa", background: item.summary.assessmentId === assessmentId ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 14, cursor: "pointer" }}><strong>{item.summary.assessmentId}</strong><span style={{ display: "block", color: "#a0aabf", fontSize: 13 }}>{item.summary.level} · {item.summary.status} · {item.summary.counts.materialFindings} material finding(s) · {item.summary.counts.unresolvedContradictions} unresolved contradiction(s)</span></button>)}</div>}
      </section>

      {detail && <>
        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div><h2 style={{ margin: 0 }}>Assessment state</h2><p style={{ color: "#a0aabf" }}>Snapshot <code>{detail.summary.snapshotId}</code> · Authority Map <strong>{detail.summary.authorityMapState}</strong> · Status <strong>{detail.summary.status}</strong></p></div>
            <div style={{ textAlign: "right" }}><div style={{ color: detail.summary.reportReady.ready ? "#10b981" : "#f59e0b", fontWeight: 700 }}>{detail.summary.reportReady.ready ? "REPORT READY" : "REVIEW REQUIRED"}</div><small style={{ color: "#a0aabf" }}>{detail.summary.reportReady.blockers.join(" · ") || "No readiness blockers"}</small></div>
          </div>
          <textarea style={inputStyle} value={reasoning} onChange={(event) => setReasoning(event.target.value)} aria-label="Authority Map commitment reasoning" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}><Button onClick={() => void commitMap()} disabled={busy || detail.summary.authorityMapState === "committed"}>Commit Authority Map</Button><Button onClick={() => void runDiagnostics()} disabled={busy || detail.summary.authorityMapState !== "committed"} secondary>Run diagnostics</Button><select style={{ ...inputStyle, width: "auto", marginTop: 0 }} value={mode} onChange={(event) => setMode(event.target.value as "mock" | "live")}><option value="mock">Mock LLM</option><option value="live">Live configured LLM</option></select><select style={{ ...inputStyle, width: "auto", marginTop: 0 }} value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="valid_minimal">Valid minimal</option><option value="valid_with_contradiction_syn05">SYN-05 contradiction</option><option value="valid_with_contradiction_syn10">SYN-10 contradiction</option><option value="valid_pii_boundary_syn09">SYN-09 PII boundary</option><option value="deterministic_override_attempt">Deterministic override attempt</option></select></div>
        </section>

        <section style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Findings and review decisions</h2>
          <p style={{ color: "#a0aabf" }}>Evidence level, confidence, severity, status, disposition, and origin remain separate. LLM proposals stay non-authoritative until a reviewer records a decision.</p>
          <div style={{ display: "grid", gap: 16 }}>{detail.findings.map((finding) => <article key={finding.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 18 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><span style={{ color: finding.severity === "critical" ? "#ef4444" : finding.severity === "high" ? "#f59e0b" : "#14b8a6", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>{finding.severity}</span><h3 style={{ margin: "6px 0" }}>{finding.title}</h3></div><div style={{ color: "#a0aabf", fontSize: 13, textAlign: "right" }}>{finding.evidenceLevel}<br />{finding.confidence} confidence<br />{finding.origin} · {finding.disposition || "unreviewed"}</div></div><p>{finding.description}</p><blockquote style={{ color: "#a0aabf", borderLeft: "3px solid #6366f1", paddingLeft: 12, marginLeft: 0 }}>Basis: {finding.basis}</blockquote><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}><select style={inputStyle} value={decision} onChange={(event) => setDecision(event.target.value)}><option value="accept">Accept</option><option value="reject">Reject</option><option value="modify">Modify</option><option value="request_more_evidence">Request more evidence</option><option value="downgrade_confidence">Downgrade confidence</option><option value="upgrade_evidence">Upgrade evidence</option></select><select style={inputStyle} value={disposition} onChange={(event) => setDisposition(event.target.value)}><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option><option value="needs_more_evidence">Needs more evidence</option><option value="accepted_risk">Accepted risk</option><option value="remediated">Remediated</option></select><select style={inputStyle} value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="">Keep severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="informational">Informational</option></select><select style={inputStyle} value={confidence} onChange={(event) => setConfidence(event.target.value)}><option value="">Keep confidence</option><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option></select></div><textarea style={inputStyle} value={reviewReasoning} onChange={(event) => setReviewReasoning(event.target.value)} aria-label="Review reasoning" /><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}><Button onClick={() => void submitReview(finding)} disabled={busy}>Record decision</Button><Button onClick={() => void attachEvidence(finding)} disabled={busy} secondary>Attach evidence</Button></div></article>)}</div>
        </section>

        <section style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Evidence entry</h2><p style={{ color: "#a0aabf" }}>The server sets reviewer provenance. E2 requires an observation; E3/E4 require controlled test metadata. The artifact hash and snapshot ID bind the evidence to this assessment.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}><select style={inputStyle} value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}><option value="test_result">Test result</option><option value="log_excerpt">Log excerpt</option><option value="screenshot">Screenshot</option><option value="document">Document</option><option value="config_extract">Config extract</option></select><select style={inputStyle} value={evidenceLevel} onChange={(event) => setEvidenceLevel(event.target.value)}><option value="E2_observed">E2 observed</option><option value="E3_validated">E3 validated</option><option value="E4_adversarially_tested">E4 adversarially tested</option><option value="E1_documented">E1 documented</option></select><input style={inputStyle} value={contentHash} onChange={(event) => setContentHash(event.target.value)} placeholder="SHA-256 content hash" /><input style={inputStyle} value={storageRef} onChange={(event) => setStorageRef(event.target.value)} placeholder="Artifact storage reference" /></div><textarea style={inputStyle} value={observationContext} onChange={(event) => setObservationContext(event.target.value)} aria-label="Evidence observation or test procedure" /></section>

        <section style={panelStyle}><h2 style={{ marginTop: 0 }}>Contradictions</h2>{detail.contradictions.length === 0 ? <p style={{ color: "#a0aabf" }}>No contradictions recorded.</p> : detail.contradictions.map((item) => <article key={item.id} style={{ border: "1px solid rgba(245,158,11,0.35)", borderRadius: 10, padding: 14, marginBottom: 10 }}><strong>{item.subject}</strong><span style={{ color: "#f59e0b", marginLeft: 10 }}>{item.state}</span><p style={{ color: "#a0aabf" }}>A: {item.sourceAExcerpt}<br />B: {item.sourceBExcerpt}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><select style={{ ...inputStyle, width: "auto" }} value={contradictionState} onChange={(event) => setContradictionState(event.target.value)}><option value="accepted_as_unknown">Accept as unknown</option><option value="resolved_in_favor_of_source_a">Resolve for source A</option><option value="resolved_in_favor_of_source_b">Resolve for source B</option><option value="resolved_by_new_evidence">Resolve by new evidence</option><option value="unresolved">Keep unresolved</option></select><Button onClick={() => void resolveContradiction(item)} disabled={busy} secondary>Record contradiction decision</Button></div></article>)}</section>

        <section style={panelStyle}><h2 style={{ marginTop: 0 }}>Report and attestation</h2><p style={{ color: "#a0aabf" }}>Reports are generated from stored state, include the self-assessment disclaimer, show every trust layer and evidence level, and are hashed for reproducibility. Attestation is accountability metadata, not a cryptographic signature.</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button onClick={() => void generateReport()} disabled={busy || !detail.summary.reportReady.ready}>Generate reproducible report</Button>{report && <Button onClick={() => void attest()} disabled={busy} secondary>Record attestation</Button>}</div>{report && <><p style={{ fontSize: 13, color: "#10b981" }}>Report {report.reportVersion} · hash {report.reportHash}</p><select style={inputStyle} value={attestationDecision} onChange={(event) => setAttestationDecision(event.target.value)}><option value="attested_with_residual_risk">Attested with residual risk</option><option value="attested">Attested</option><option value="not_attested">Not attested</option></select><textarea style={inputStyle} value={attestationScope} onChange={(event) => setAttestationScope(event.target.value)} aria-label="Attestation scope" /><pre style={{ maxHeight: 420, overflow: "auto", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.28)", padding: 16, borderRadius: 10, fontSize: 12 }}>{report.markdown}</pre></>}</section>
      </>}
      {message && <p role="status" style={{ color: "#14b8a6", position: "sticky", bottom: 15, background: "rgba(15,17,26,0.95)", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(20,184,166,0.3)" }}>{message}</p>}
    </main>
  );
}
