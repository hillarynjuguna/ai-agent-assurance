import { NextResponse } from "next/server";
import { DIMENSIONS } from "../../../../data/dimensions";
import { calculateScores, type ScoreData } from "../../../../utils/scoring";
import { generateReportContent } from "../../../../lib/reports/content";
import crypto from "node:crypto";

type EvaluateRequest = {
  metadata?: {
    criticality?: string;
    operationAssessed?: string;
  };
  dimensions?: ScoreData;
};

const HIGH_RISK_PROFILES = new Set(["Financial", "Regulated", "Safety-Critical"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EvaluateRequest;
    const criticality = body.metadata?.criticality || "Operational";
    const operationAssessed = body.metadata?.operationAssessed || "Assessed Workflow";
    const isHighRisk = HIGH_RISK_PROFILES.has(criticality);
    const dimensions = body.dimensions || {};
    
    const results = calculateScores(dimensions, DIMENSIONS, isHighRisk);
    const reportContent = generateReportContent(dimensions, criticality, operationAssessed);
    const diagnosticId = `diag_${crypto.randomBytes(6).toString("hex")}`;

    return NextResponse.json({
      diagnosticId,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      metadata: {
        criticality,
        isHighRisk,
        operationAssessed,
      },
      diligenceMatrix: {
        capabilityScore: results.capPct,
        assuranceScore: results.assurPct,
        capabilityZone: results.capZone,
        assuranceZone: results.assurZone,
      },
      trustGates: results.gates,
      relianceVerdict: {
        recommendation: results.verdict,
        rationale: results.rationale,
      },
      priorityGaps: results.gaps,
      evidenceChecklist: reportContent.evidenceChecklist,
      remediationPlan: reportContent.remediationPlan,
      counterpartyReadinessSummary: reportContent.counterpartyReadinessSummary,
      recommendedNextActions: reportContent.recommendedNextActions,
      executiveSummary: reportContent.executiveSummary,
    });
  } catch (err: unknown) {
    console.error("Error evaluating diagnostic:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
