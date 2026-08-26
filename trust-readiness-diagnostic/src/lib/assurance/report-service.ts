import crypto from "node:crypto";
import {
  generateTrackDReportContext,
  renderTrackDContextMarkdown,
} from "../../../../tools/track-d-governability-audit/adapter/src/index";
import {
  getPhase6State,
  Phase6Error,
  reportReadyGate,
} from "./phase6-service";
import type { Phase6State, ReportArtifact } from "./phase6-types";
import { saveAssuranceAssessment } from "./store";

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function sourceStateFingerprint(state: Phase6State): string {
  const normalized = {
    level: state.level,
    authorityMap: state.authorityMap.map,
    findings: [...state.findings].sort((a, b) => a.id.localeCompare(b.id)).map((finding) => ({
      id: finding.id,
      frameworkRefs: [...finding.frameworkRefs].sort(),
      authorityMapNodeId: finding.authorityMapNodeId || null,
      authorityMapEdgeId: finding.authorityMapEdgeId || null,
      title: finding.title,
      description: finding.description,
      basis: finding.basis,
      severity: finding.severity,
      confidence: finding.confidence,
      evidenceLevel: finding.evidenceLevel,
      status: finding.status,
      origin: finding.origin,
      disposition: finding.disposition || null,
      evidenceIds: [...finding.evidenceIds].sort(),
      reviewerDecisionIds: [...finding.reviewerDecisionIds].sort(),
      contradictionIds: [...finding.contradictionIds].sort(),
    })),
    evidence: [...state.evidence].sort((a, b) => a.id.localeCompare(b.id)),
    reviewDecisions: [...state.reviewDecisions].sort((a, b) => a.decisionVersion - b.decisionVersion),
    contradictions: [...state.contradictions].sort((a, b) => a.id.localeCompare(b.id)),
    diagnosticsRuns: state.diagnosticsRuns.map((run) => ({
      id: run.id,
      snapshotId: run.snapshotId,
      sourceHash: run.sourceHash,
      llmMode: run.llmMode,
      pressureMetrics: run.llmPass.pressureMetrics,
    })),
  };
  return hash(JSON.stringify(normalized));
}

function renderAuthorityMap(state: Phase6State): string {
  const map = state.authorityMap.map;
  if (!map) return "No Authority Map is available.";
  const nodes = [...map.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...map.edges].sort((a, b) => a.id.localeCompare(b.id));
  const lines = [
    `Authority Map state: **${state.authorityMap.state}**`,
    `System: \`${escapeCell(map.systemId)}\``,
    `Source artifact hash: \`${map.sourceArtifactHash}\``,
    "",
    "| Ref | Type | Name / relationship | Provenance |",
    "|---|---|---|---|",
  ];
  nodes.forEach((node, index) => {
    const provenance = node.provenance
      ? `${node.provenance.dimension}.${node.provenance.field}: ${node.provenance.derivationRule}`
      : "not recorded";
    lines.push(`| N${index + 1} | ${node.nodeType} | ${escapeCell(node.name)} | ${escapeCell(provenance)} |`);
  });
  edges.forEach((edge, index) => {
    const provenance = edge.provenance
      ? `${edge.provenance.dimension}.${edge.provenance.field}: ${edge.provenance.derivationRule}`
      : "not recorded";
    lines.push(`| E${index + 1} | ${edge.edgeType} | ${escapeCell(edge.sourceNodeId)} -> ${escapeCell(edge.targetNodeId)} (${escapeCell(edge.permissionScope)}) | ${escapeCell(provenance)} |`);
  });
  return lines.join("\n");
}

function renderFindings(state: Phase6State): string {
  const findings = [...state.findings].sort((a, b) => {
    const severity = (b.severity === "critical" ? 4 : b.severity === "high" ? 3 : b.severity === "medium" ? 2 : b.severity === "low" ? 1 : 0)
      - (a.severity === "critical" ? 4 : a.severity === "high" ? 3 : a.severity === "medium" ? 2 : a.severity === "low" ? 1 : 0);
    return severity || a.id.localeCompare(b.id);
  });
  if (findings.length === 0) return "No findings were generated for this snapshot-bound assessment.";
  const lines = [
    "| Ref | Severity | Confidence | Evidence | Status | Origin | Disposition |",
    "|---|---|---|---|---|---|---|",
  ];
  findings.forEach((finding, index) => {
    lines.push(`| F${index + 1} | **${finding.severity}** | ${finding.confidence} | ${finding.evidenceLevel} | ${finding.status} | ${finding.origin} | ${finding.disposition || "unreviewed"} |`);
    lines.push(`|  | ${escapeCell(finding.title)} |  |  |  | Framework: ${escapeCell(finding.frameworkRefs.join(", "))} | Authority: ${escapeCell(finding.authorityMapNodeId || finding.authorityMapEdgeId || finding.proposedAuthorityRef?.nodeId || finding.proposedAuthorityRef?.edgeId || "not committed")} |`);
    lines.push(`|  | Basis: ${escapeCell(finding.basis)} |  |  |  |  |  |`);
  });
  return lines.join("\n");
}

function renderEvidence(state: Phase6State): string {
  if (state.evidence.length === 0) return "No reviewer evidence has been attached.";
  const evidence = [...state.evidence].sort((a, b) => a.id.localeCompare(b.id));
  const lines = [
    "| Ref | Finding | Type | Supports | Submitted by | Snapshot | Artifact hash | Metadata |",
    "|---|---|---|---|---|---|---|---|",
  ];
  evidence.forEach((item, index) => {
    lines.push(`| E${index + 1} | ${escapeCell(item.findingId)} | ${item.evidenceType} | ${item.supportsLevel} | ${item.submittedByType} (${escapeCell(item.submittedById || "server actor")}) | ${escapeCell(item.snapshotId)} | ${item.contentHash} | ${escapeCell(JSON.stringify(item.metadata))} |`);
  });
  return lines.join("\n");
}

function renderDecisions(state: Phase6State): string {
  if (state.reviewDecisions.length === 0) return "No reviewer decisions have been recorded.";
  const decisions = [...state.reviewDecisions].sort((a, b) => a.decisionVersion - b.decisionVersion);
  const lines = [
    "| Ref | Scope | Decision | Disposition | Reviewer role | Evidence refs | State change | Reasoning |",
    "|---|---|---|---|---|---|---|---|",
  ];
  decisions.forEach((decision) => {
    const before = decision.previousFindingState
      ? `${decision.previousFindingState.severity}/${decision.previousFindingState.confidence}/${decision.previousFindingState.evidenceLevel}/${decision.previousFindingState.status}`
      : decision.previousContradictionState || "new";
    const after = decision.newFindingState
      ? `${decision.newFindingState.severity}/${decision.newFindingState.confidence}/${decision.newFindingState.evidenceLevel}/${decision.newFindingState.status}`
      : decision.newContradictionState || "committed";
    lines.push(`| D${decision.decisionVersion} | ${decision.scope} | ${decision.decision} | ${decision.disposition || "—"} | ${decision.reviewerRole} | ${decision.evidenceReferences.join(", ") || "—"} | ${escapeCell(before)} -> ${escapeCell(after)} | ${escapeCell(decision.reasoning)} |`);
  });
  return lines.join("\n");
}

function renderContradictions(state: Phase6State): string {
  if (state.contradictions.length === 0) return "No contradictions were recorded.";
  const contradictions = [...state.contradictions].sort((a, b) => a.id.localeCompare(b.id));
  const lines = [
    "| Ref | Subject | State | Source A | Source B | Supporting evidence | Resolution reasoning |",
    "|---|---|---|---|---|---|---|",
  ];
  contradictions.forEach((item, index) => {
    lines.push(`| C${index + 1} | ${escapeCell(item.subject)} | ${item.state} | ${escapeCell(item.sourceAExcerpt)} | ${escapeCell(item.sourceBExcerpt)} | ${item.supportingEvidenceIds.join(", ") || "—"} | ${escapeCell(item.resolutionReasoning || "Unresolved by design")} |`);
  });
  return lines.join("\n");
}

function renderReportMarkdown(
  record: Awaited<ReturnType<typeof getPhase6State>>["record"],
  state: Phase6State,
  reportVersion: string,
  fingerprint: string,
): string {
  const snapshotId = record.snapshotId || record.systemSnapshot?.id || "unknown";
  const trackD = renderTrackDContextMarkdown(generateTrackDReportContext(record.result.selfAssessmentContext));
  const findingCounts = {
    total: state.findings.length,
    critical: state.findings.filter((finding) => finding.severity === "critical").length,
    high: state.findings.filter((finding) => finding.severity === "high").length,
    medium: state.findings.filter((finding) => finding.severity === "medium").length,
  };
  const gate = reportReadyGate(state);
  const lines = [
    "# AI Agent Assurance Report",
    "",
    "> This report is a reproducible assurance artifact compiled from the stored assessment state. It is not a composite score and does not claim that an untested control is effective.",
    "",
    "## Report scope and identity",
    "",
    `- Report version: \`${reportVersion}\``,
    `- Assessment: \`${record.id}\``,
    `- System snapshot: \`${snapshotId}\``,
    `- Source artifact SHA-256: \`${record.sourceHash}\``,
    `- Source-state fingerprint: \`${fingerprint}\``,
    `- Assessment level: **${state.level}**`,
    `- Report-ready gate: **${gate.ready ? "passed" : "blocked"}**`,
    "",
    "## Executive summary",
    "",
    `This assessment contains **${findingCounts.total} finding(s)**: ${findingCounts.critical} critical, ${findingCounts.high} high, and ${findingCounts.medium} medium. Severity, confidence, finding status, and evidence level are displayed independently. A finding remains visible when it is rejected, accepted as risk, remediated, or unresolved; no critical exposure is diluted into an average.`,
    "",
    "## Assurance method",
    "",
    "The pipeline is snapshot-bound: source material is hashed, the Authority Map is committed through an auditable reviewer decision, deterministic rules establish the machine baseline, LLM output is treated as a proposal, reviewer decisions are append-only, and evidence upgrades require qualifying reviewer or test-harness evidence. Unknowns and contradictions are preserved rather than converted into safety claims.",
    "",
    "## Authority Map",
    "",
    renderAuthorityMap(state),
    "",
    "## Findings and trust layers",
    "",
    renderFindings(state),
    "",
    "## Contradictions and unknowns",
    "",
    renderContradictions(state),
    "",
    "Unresolved contradictions: **" + state.contradictions.filter((item) => item.state === "unresolved").length + "**. These are not silently resolved by the system.",
    "",
    "## Evidence ledger",
    "",
    renderEvidence(state),
    "",
    "## Reviewer decision history",
    "",
    renderDecisions(state),
    "",
    "## Reassessment and limitations",
    "",
    "A new assessment is required when the bound system state changes materially, including Authority Map structure, tool/API exposure, model provenance, trust boundary, permission scope, reversibility, or human-approval behavior. This local MVP does not provide continuous monitoring, production authentication, durable object storage, automated remediation, or cryptographic non-repudiation.",
    "",
    "## Track D self-assessment context",
    "",
    trackD,
    "",
    "## Attestation",
    "",
    state.attestations.length > 0
      ? state.attestations.map((attestation) => ["-", attestation.decision, "by", attestation.reviewerRole, "for scope:", escapeCell(attestation.scope), "report hash:", attestation.reportHash + "."].join(" ")).join("\n")
      : "No human attestation was recorded at the time this artifact was generated. Any subsequent attestation is a separate accountability record that must reference this report hash. This artifact is not a cryptographic signature.",
    "",
    "## Reproducibility note",
    "",
    "Re-generating this report from the unchanged stored assessment state produces the same substantive report hash. Volatile generation timestamps and implementation-specific random record identifiers are kept in artifact metadata rather than used as substantive findings.",
  ];
  return lines.join("\n");
}

export async function generateAssuranceReport(assessmentId: string): Promise<{ report: ReportArtifact; state: Phase6State }> {
  const { record, state } = await getPhase6State(assessmentId);
  const gate = reportReadyGate(state);
  if (!gate.ready) throw new Phase6Error(`Cannot generate report: ${gate.blockers.join("; ")}`, 409, "report_not_ready");
  const reportVersion = "phase6-v1";
  const fingerprint = sourceStateFingerprint(state);
  const markdown = renderReportMarkdown(record, state, reportVersion, fingerprint);
  const reportHash = hash(markdown);
  const existing = state.reports.find((item) => item.reportVersion === reportVersion && item.reportHash === reportHash);
  if (existing) return { report: existing, state };
  const report: ReportArtifact = {
    id: crypto.randomUUID(),
    assessmentId: record.id,
    snapshotId: record.snapshotId || record.systemSnapshot?.id || "unknown",
    reportVersion,
    generatedAt: new Date().toISOString(),
    substantiveHash: fingerprint,
    reportHash,
    markdown,
    sourceStateFingerprint: fingerprint,
  };
  state.reports.push(report);
  state.status = "report_ready";
  record.phase6 = state;
  await saveAssuranceAssessment(record);
  return { report, state };
}

export async function getLatestAssuranceReport(assessmentId: string): Promise<ReportArtifact | null> {
  const { state } = await getPhase6State(assessmentId);
  return state.reports[state.reports.length - 1] || null;
}
