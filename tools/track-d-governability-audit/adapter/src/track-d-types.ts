export interface TrackDExportV610 {
  schemaVersion: "6.1.0";
  schemaName: "Governability Diagnostic Protocol";
  generatedAt: string; // ISO 8601
  assessment: {
    metadata: {
      criticality: string;
      audience: string;
      company: string;
      assessor: string;
      confidence: string;
      date: string;
      valid: string;
    };
    dimensions: {
      [dimensionId: string]: {
        cap: string;
        evid: string;
        na: string;
      };
    };
    notes: {
      [dimensionId: string]: string;
    };
    summary: {
      actions: string;
    };
  };
  diligenceMatrix: {
    capabilityScore: number | null;
    assuranceScore: number | null;
    quadrant: string;
    maxCapabilityScore: number;
    maxAssuranceScore: number;
    totalWeight: number;
  };
  narrative: {
    confidenceStatement: string;
    priorityGaps: string;
    relianceRecommendation: string;
    relianceRationale: string;
    reassessmentTriggers: string;
  };
  floorRulesTriggered: string[];
  regulatoryMapping: {
    [dimKey: string]: {
      title: string;
      tags: string[];
    };
  };
}

export interface ValidatedTrackDExport extends Omit<TrackDExportV610, 'assessment'> {
  assessment: Omit<TrackDExportV610['assessment'], 'dimensions'> & {
    dimensions: {
      [dimensionId: string]: {
        cap: number;
        evid: number;
        na: boolean;
      };
    };
  };
}
