/**
 * Deterministic Markdown Report Projection
 * 
 * Projects a CanonicalAssessment object and optional AttestationRecord
 * into a structured, human-readable, auditable Markdown report.
 * 
 * Invariants:
 * - Deterministic: Same canonical data produces exact identical markdown.
 * - Machine-to-human decision trail: Always shows baselineSeverity, reviewer disposition, and effectiveSeverity.
 * - Preserves the Five Trust Layers explicitly for each finding.
 * - Includes cryptographic attestation content-hash block.
 */

import type { CanonicalAssessment, AttestationRecord, CanonicalFinding } from '../reviewer/types';

export function renderAssessmentMarkdown(
  canonical: CanonicalAssessment,
  attestation?: AttestationRecord
): string {
  const lines: string[] = [];

  // Title & Metadata
  lines.push('# AI Agent Assurance Report');
  lines.push('');
  lines.push(`**Assessment ID:** \`${canonical.assessmentId}\`  `);
  lines.push(`**System ID:** \`${canonical.systemId}\`  `);
  lines.push(`**Snapshot ID:** \`${canonical.systemSnapshotId}\`  `);
  lines.push(`**Config Hash (SHA-256):** \`${canonical.systemSnapshot.configHash}\`  `);
  lines.push(`**Compiled At:** \`${canonical.compiledAt}\`  `);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 1. Executive Summary & Scope
  lines.push('## 1. Executive Summary & Scope');
  lines.push('');
  lines.push(`This assurance report evaluates autonomous AI system **${canonical.systemId}** ` +
    `bound immutably to snapshot \`${canonical.systemSnapshotId}\`.`);
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|---|---|');
  lines.push(`| Total Findings | ${canonical.summary.totalFindings} |`);
  lines.push(`| Effective Critical Findings | ${canonical.summary.criticalFindings} |`);
  lines.push(`| Effective High Findings | ${canonical.summary.highFindings} |`);
  lines.push(`| Effective Medium Findings | ${canonical.summary.mediumFindings} |`);
  lines.push(`| Effective Low Findings | ${canonical.summary.lowFindings} |`);
  lines.push(`| Reviewer Overridden Findings | ${canonical.summary.overriddenCount} |`);
  lines.push(`| Verified Evidence Upgrades | ${canonical.summary.evidenceUpgradesCount} |`);
  lines.push('');

  // 2. Track D Self-Assessment Context
  lines.push('## 2. Track D: Self-Assessment Diagnostic Context');
  lines.push('');
  lines.push('> **PROVENANCE NOTICE (Settled Decision 1):**  ');
  lines.push('> This section reflects the client\'s self-reported Diligence Positioning Matrix and is **NOT** independently verified evidence.  ');
  lines.push('> It is provided as diagnostic context and is structurally prevented from elevating finding confidence or evidence levels.');
  lines.push('');
  const matrix = canonical.selfAssessmentContext.diligenceMatrix || {};
  lines.push(`- **Self-Reported Quadrant:** \`${matrix.quadrant || 'unknown'}\``);
  lines.push(`- **Capability Score:** \`${matrix.capabilityScore ?? 'N/A'}%\``);
  lines.push(`- **Assurance Score:** \`${matrix.assuranceScore ?? 'N/A'}%\``);
  if (canonical.selfAssessmentContext.floorRulesTriggered?.length > 0) {
    lines.push(`- **Floor Rules Triggered:** ${canonical.selfAssessmentContext.floorRulesTriggered.join(', ')}`);
  }
  lines.push('');

  // 3. Authority Map Structure
  lines.push('## 3. Authority Map Structure');
  lines.push('');
  lines.push(`The frozen Authority Map (\`${canonical.authorityMap.nodes.length}\` nodes, \`${canonical.authorityMap.edges.length}\` edges) models the technical topology and authorization boundaries:`);
  lines.push('');
  if (canonical.authorityMap.edges.length > 0) {
    lines.push('| Edge ID | Type | Source Node | Target Node | Reversibility | Approval Req. | Trust Boundary | Scope |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const e of canonical.authorityMap.edges) {
      lines.push(`| \`${e.id}\` | \`${e.edgeType}\` | \`${e.sourceNodeId}\` | \`${e.targetNodeId}\` | \`${e.actionReversibility || 'unknown'}\` | \`${e.requiresHumanApproval ? 'YES' : 'NO'}\` | \`${e.trustBoundary}\` | \`${e.permissionScope}\` |`);
    }
    lines.push('');
  }

  // 4. Assurance Methodology & Epistemic Boundaries
  lines.push('## 4. Assurance Methodology & Epistemic Boundaries');
  lines.push('');
  lines.push('This assessment is governed by immutable epistemic invariants:');
  lines.push('1. **Claim ≠ Evidence:** Client assertions remain E0 (Claimed) until verified.');
  lines.push('2. **Severity Preservation:** Deterministic engine baseline severity is permanently recorded and never silently erased.');
  lines.push('3. **Append-Only Meaning:** Reviewer overrides specify explicit disposition, reasoning, and evidence, establishing an unbroken machine-to-human decision trail.');
  lines.push('4. **Evidence Ladder:** E2 (Observed runtime), E3 (Validated reproducible test), E4 (Authorized adversarial test).');
  lines.push('');

  // 5. Detailed Findings & Five Trust Layers
  lines.push('## 5. Detailed Findings & The Five Trust Layers');
  lines.push('');
  for (const f of canonical.findings) {
    lines.push(`### Finding \`${f.id}\`: ${f.title}`);
    lines.push('');
    lines.push(`**Framework References:** ${f.frameworkRefs.map(r => `\`${r}\``).join(', ')}  `);
    if (f.authorityMapEdgeId) lines.push(`**Authority Map Edge:** \`${f.authorityMapEdgeId}\`  `);
    if (f.authorityMapNodeId) lines.push(`**Authority Map Node:** \`${f.authorityMapNodeId}\`  `);
    if (f.pathReference) {
      lines.push(`**Authority Path Reference:** \`${f.pathReference.pathId}\` (\`${f.pathReference.nodeIds.length - 1}\` hops, hash: \`${f.pathReference.pathHash.slice(0, 12)}...\`)  `);
      lines.push(`**Path Traversal Sequence:** ${f.pathReference.nodeIds.map(n => `\`${n}\``).join(' → ')}  `);
    }
    if (f.findingStage) lines.push(`**Finding Stage:** \`${f.findingStage}\`  `);
    lines.push(`**Recognized Evidence Level:** \`${f.evidenceLevel}\`  `);
    lines.push(`**Finding Status:** \`${f.status}\`  `);
    lines.push('');

    // Machine-to-Human Provenance Trail
    lines.push('#### Machine-to-Human Disposition Trail');
    lines.push('');
    lines.push(`- **Deterministic Baseline:** \`${f.baselineSeverity}\``);
    lines.push(`- **Reviewer Disposition:** \`${f.disposition}\``);
    if (f.overrideReason) {
      lines.push(`- **Override Reason / Reasoning:** ${f.overrideReason}`);
    }
    lines.push(`- **Effective Severity:** \`${f.effectiveSeverity}\``);
    lines.push('');

    // The Five Trust Layers Table
    lines.push('#### The Five Trust Layers');
    lines.push('');
    lines.push('| Layer | Level / Context | Details |');
    lines.push('|---|---|---|');
    lines.push(`| **1. Self-Assessment Context** | Track D | ${f.trustLayers.selfAssessmentContext} |`);
    lines.push(`| **2. Client Claim** | Statement | ${f.trustLayers.clientClaim} |`);
    lines.push(`| **3. Claimed Evidence Level** | Claimed | ${f.trustLayers.claimedEvidenceLevel} |`);
    lines.push(`| **4. Recognized Evidence Level** | Engine Capped | ${f.trustLayers.recognizedEvidenceLevel} |`);
    lines.push(`| **5. Reviewer Attestation** | Human Decision | ${f.trustLayers.reviewerAttestation || 'Pending'} |`);
    lines.push('');
  }

  // 6. Contradiction Register
  lines.push('## 6. Contradiction Register');
  lines.push('');
  if (canonical.unresolvedContradictions.length === 0 && canonical.contradictionDecisions.length === 0) {
    lines.push('_No contradictions identified in assessment corpus._');
  } else {
    for (const c of canonical.unresolvedContradictions) {
      lines.push(`- **Subject:** \`${c.subject}\` (Status: \`${c.status}\`)`);
      lines.push(`  - Source A: "${c.source_a_excerpt}"`);
      lines.push(`  - Source B: "${c.source_b_excerpt}"`);
    }
    for (const cd of canonical.contradictionDecisions) {
      lines.push(`- **Subject:** \`${cd.contradictionSubject}\` — Disposition: \`${cd.disposition}\``);
      lines.push(`  - Reviewer: \`${cd.reviewerId}\` (${cd.reviewerRole})`);
      lines.push(`  - Reasoning: ${cd.reasoning}`);
    }
  }
  lines.push('');

  // 7. Evidence Register
  lines.push('## 7. Evidence Register');
  lines.push('');
  if (canonical.evidenceLedger.length === 0) {
    lines.push('_No additional external evidence records registered._');
  } else {
    lines.push('| Evidence ID | Finding ID | Level | Type | Source | Collector | Method | Content Hash |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const ev of canonical.evidenceLedger) {
      lines.push(`| \`${ev.id}\` | \`${ev.findingId}\` | \`${ev.supportsLevel}\` | \`${ev.evidenceType}\` | \`${ev.source}\` | \`${ev.collector}\` | \`${ev.collectionMethod}\` | \`${ev.contentHash.substring(0, 16)}...\` |`);
    }
    lines.push('');

    // Detailed Test Verification Records for E3 / E4
    for (const ev of canonical.evidenceLedger) {
      if (ev.validationTest) {
        const vt = ev.validationTest;
        lines.push(`### Test Record: \`${vt.testId}\` (Evidence \`${ev.id}\`)`);
        lines.push(`- **Objective:** ${vt.objective}`);
        lines.push(`- **Environment:** \`${vt.environment}\` | **Tester:** \`${vt.testerIdentity}\` | **Outcome:** \`${vt.outcome}\``);
        lines.push(`- **Steps:**`);
        for (const s of vt.steps) {
          lines.push(`  1. ${s}`);
        }
        lines.push(`- **Expected Result:** ${vt.expectedResult}`);
        lines.push(`- **Observed Result:** ${vt.observedResult}`);
        lines.push('');
      }

      if (ev.adversarialTest) {
        const at = ev.adversarialTest;
        lines.push(`### Adversarial Attack Record: \`${at.testId}\` (Evidence \`${ev.id}\`)`);
        lines.push(`- **Authorization Scope:** \`${at.authorizationScope}\``);
        lines.push(`- **Attack Class:** \`${at.attackClass}\``);
        lines.push(`- **Payload Method:** ${at.payloadMethod}`);
        lines.push('');
      }
    }
  }
  lines.push('');

  // 8. Reviewer Decision Log
  lines.push('## 8. Reviewer Decision Log (Append-Only Audit Trail)');
  lines.push('');
  if (canonical.reviewDecisions.length === 0) {
    lines.push('_No reviewer decisions recorded yet._');
  } else {
    lines.push('| Decision ID | Finding ID | Reviewer | Role | Decision Type | Disposition | Baseline → Effective | Reasoning | Timestamp |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    for (const rd of canonical.reviewDecisions) {
      lines.push(`| \`${rd.id}\` | \`${rd.findingId}\` | \`${rd.reviewerId}\` | \`${rd.reviewerRole}\` | \`${rd.decisionType}\` | \`${rd.disposition}\` | \`${rd.baselineSeverity}\` → \`${rd.effectiveSeverity}\` | ${rd.reasoning} | \`${rd.createdAt}\` |`);
    }
  }
  lines.push('');

  // 9. Residual Risk & Reassessment Conditions
  lines.push('## 9. Residual Risk & Reassessment Conditions');
  lines.push('');
  lines.push('Reassessment is automatically triggered upon any of the following conditions:');
  lines.push('- Modification to `requires_human_approval` on any irreversible action edge.');
  lines.push('- Introduction of external agent delegation edges or third-party MCP servers.');
  lines.push('- Elevation of tool permission scopes beyond documented read boundaries.');
  lines.push('');

  // 10. Cryptographic Attestation
  lines.push('## 10. Cryptographic Attestation');
  lines.push('');
  if (!attestation) {
    lines.push('> **STATUS: UNATTESTED DRAFT**  ');
    lines.push('> This report draft has not yet been cryptographically signed with an attestation hash.');
  } else {
    lines.push('> **STATUS: ATTESTED**  ');
    lines.push(`> **Attestation ID:** \`${attestation.attestationId}\`  `);
    lines.push(`> **Attested By:** \`${attestation.attestedBy.reviewerName}\` (\`${attestation.attestedBy.reviewerId}\`, \`${attestation.attestedBy.role}\`)  `);
    lines.push(`> **Attested At:** \`${attestation.attestedAt}\`  `);
    lines.push(`> **Statement:** "${attestation.statement}"  `);
    lines.push('');
    lines.push('```text');
    lines.push(`CANONICAL-ASSESSMENT-SHA256: ${attestation.canonicalAssessmentHash}`);
    lines.push('```');
    if (attestation.reportMarkdownHash) {
      lines.push('```text');
      lines.push(`RENDERED-MARKDOWN-SHA256: ${attestation.reportMarkdownHash}`);
      lines.push('```');
    }
  }
  lines.push('');

  return lines.join('\n');
}
