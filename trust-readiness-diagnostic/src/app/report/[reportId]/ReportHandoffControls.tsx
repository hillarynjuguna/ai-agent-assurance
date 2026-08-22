"use client";

import React, { useState } from "react";
import { DiagnosticReportRecord } from "../../../lib/reports/types";

interface ReportHandoffControlsProps {
  report: DiagnosticReportRecord;
  reportPaymentUrl: string;
  expertPaymentUrl: string;
  isPaid: boolean;
}

export function ReportHandoffControls({
  report,
  reportPaymentUrl,
  expertPaymentUrl,
  isPaid,
}: ReportHandoffControlsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyReportId = () => {
    navigator.clipboard.writeText(report.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadPayload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${report.id}-payload.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.7)",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "25px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "15px",
        }}
      >
        <div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Diagnostic Report Reference
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", fontFamily: "monospace", marginTop: "2px" }}>
            {report.id}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleCopyReportId}
            className="cta-btn cta-btn-outline"
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
          >
            {copied ? "Copied" : "Copy Report ID"}
          </button>
          <button
            type="button"
            onClick={handleDownloadPayload}
            className="cta-btn cta-btn-outline"
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
          >
            Download Payload JSON
          </button>
        </div>
      </div>

      {!isPaid && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            borderLeft: "4px solid var(--warning)",
            padding: "12px 15px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            lineHeight: 1.5,
          }}
        >
          <strong>Fulfillment Instruction:</strong> Copy your Report ID (<code>{report.id}</code>) and paste it into the <strong>Report ID</strong> checkout field on Gumroad, or reply to your Gumroad receipt email with it to receive your custom report.
        </div>
      )}

      {!isPaid && (
        <div style={{ display: "flex", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}>
          <a
            href={`${reportPaymentUrl}${reportPaymentUrl.includes('?') ? '&' : '?'}custom_fields[Report%20ID]=${encodeURIComponent(report.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn"
            style={{ textDecoration: "none", flex: "1 1 220px", textAlign: "center" }}
          >
            Get Full Report ($19)
          </a>
          <a
            href={`${expertPaymentUrl}${expertPaymentUrl.includes('?') ? '&' : '?'}custom_fields[Report%20ID]=${encodeURIComponent(report.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn cta-btn-outline"
            style={{ textDecoration: "none", flex: "1 1 220px", textAlign: "center" }}
          >
            Founder Trust Review ($149)
          </a>
        </div>
      )}
    </div>
  );
}


