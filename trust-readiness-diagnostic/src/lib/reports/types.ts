import { ScoreData, calculateScores } from "../../utils/scoring";

export type PaymentStatus = "mock" | "pending" | "paid";
export type ReportType = "readiness-report" | "expert-review" | "free-snapshot";

export interface DiagnosticReportMetadata {
  operationAssessed?: string;
  metaRisk?: string;
  activeAudiences?: string[];
  activeActions?: string[];
  criticality?: string;
  isHighRisk?: boolean;
}

export interface DiagnosticReportRecord {
  id: string;
  createdAt: string;
  paymentStatus: PaymentStatus;
  reportType: ReportType;
  metadata: DiagnosticReportMetadata;
  dimensionData: ScoreData;
  results: ReturnType<typeof calculateScores>;
  email?: string;
}

export interface GumroadPingRecord {
  id: string; // sale_id or generated
  sellerId: string;
  productId: string;
  productName: string;
  permalink: string;
  email: string;
  licenseKey: string;
  priceCents: number;
  currency: string;
  reportId?: string;
  companyName?: string;
  agentDescription?: string;
  counterpartyFocus?: string;
  deadline?: string;
  rawCustomFields: Record<string, string>;
  createdAt: string;
  matchedReportId?: string;
  matchStatus: "unmatched" | "matched" | "manual_assigned";
}

export interface ManualMatchRequest {
  pingId: string;
  reportId: string;
  notes?: string;
}

