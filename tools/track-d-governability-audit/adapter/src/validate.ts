import { TrackDExportV610, ValidatedTrackDExport } from './track-d-types.js';

export function validateTrackDExport(data: any): { valid: true; data: ValidatedTrackDExport } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Input is not an object'] };
  }

  if (data.schemaVersion !== '6.1.0') {
    errors.push(`Expected schemaVersion "6.1.0", got "${data.schemaVersion}"`);
  }

  if (data.schemaName !== 'Governability Diagnostic Protocol') {
    errors.push(`Expected schemaName "Governability Diagnostic Protocol", got "${data.schemaName}"`);
  }

  if (typeof data.generatedAt !== 'string') {
    errors.push('generatedAt must be a string');
  }

  if (!data.assessment || typeof data.assessment !== 'object') {
    errors.push('assessment is missing or not an object');
  } else {
    const { metadata, dimensions, notes, summary } = data.assessment;

    if (!metadata || typeof metadata !== 'object') {
      errors.push('assessment.metadata is missing or not an object');
    } else {
      ['criticality', 'audience', 'company', 'assessor', 'confidence', 'date', 'valid'].forEach(field => {
        if (typeof metadata[field] !== 'string') {
          errors.push(`assessment.metadata.${field} must be a string`);
        }
      });
    }

    if (!dimensions || typeof dimensions !== 'object') {
      errors.push('assessment.dimensions is missing or not an object');
    } else {
      for (let i = 1; i <= 10; i++) {
        const dim = dimensions[i.toString()];
        if (!dim) {
          errors.push(`assessment.dimensions["${i}"] is missing`);
        } else {
          if (typeof dim.cap !== 'string') errors.push(`assessment.dimensions["${i}"].cap must be a string`);
          if (typeof dim.evid !== 'string') errors.push(`assessment.dimensions["${i}"].evid must be a string`);
          if (typeof dim.na !== 'string') errors.push(`assessment.dimensions["${i}"].na must be a string`);
          
          if (dim.na === 'false') {
            const capNum = parseInt(dim.cap, 10);
            const evidNum = parseInt(dim.evid, 10);
            if (isNaN(capNum) || capNum < 0 || capNum > 3) {
              errors.push(`assessment.dimensions["${i}"].cap must parse to 0-3 when not NA`);
            }
            if (isNaN(evidNum) || evidNum < 0 || evidNum > 4) {
              errors.push(`assessment.dimensions["${i}"].evid must parse to 0-4 when not NA`);
            }
          }
        }
      }
    }

    if (!notes || typeof notes !== 'object') {
      errors.push('assessment.notes is missing or not an object');
    }

    if (!summary || typeof summary !== 'object' || typeof summary.actions !== 'string') {
      errors.push('assessment.summary.actions must be a string');
    }
  }

  if (!data.diligenceMatrix || typeof data.diligenceMatrix !== 'object') {
    errors.push('diligenceMatrix is missing or not an object');
  } else {
    const dm = data.diligenceMatrix;
    if (dm.capabilityScore !== null && typeof dm.capabilityScore !== 'number') {
      errors.push('diligenceMatrix.capabilityScore must be number or null');
    }
    if (dm.assuranceScore !== null && typeof dm.assuranceScore !== 'number') {
      errors.push('diligenceMatrix.assuranceScore must be number or null');
    }
    if (typeof dm.quadrant !== 'string') errors.push('diligenceMatrix.quadrant must be a string');
    if (typeof dm.maxCapabilityScore !== 'number') errors.push('diligenceMatrix.maxCapabilityScore must be a number');
    if (typeof dm.maxAssuranceScore !== 'number') errors.push('diligenceMatrix.maxAssuranceScore must be a number');
    if (typeof dm.totalWeight !== 'number') errors.push('diligenceMatrix.totalWeight must be a number');
  }

  if (!data.narrative || typeof data.narrative !== 'object') {
    errors.push('narrative is missing or not an object');
  } else {
    const { confidenceStatement, priorityGaps, relianceRecommendation, relianceRationale, reassessmentTriggers } = data.narrative;
    if (typeof confidenceStatement !== 'string') errors.push('narrative.confidenceStatement must be a string');
    if (typeof priorityGaps !== 'string') errors.push('narrative.priorityGaps must be a string');
    if (typeof relianceRecommendation !== 'string') errors.push('narrative.relianceRecommendation must be a string');
    if (typeof relianceRationale !== 'string') errors.push('narrative.relianceRationale must be a string');
    if (typeof reassessmentTriggers !== 'string') errors.push('narrative.reassessmentTriggers must be a string');
  }

  if (!Array.isArray(data.floorRulesTriggered) || !data.floorRulesTriggered.every((s: any) => typeof s === 'string')) {
    errors.push('floorRulesTriggered must be an array of strings');
  }

  if (!data.regulatoryMapping || typeof data.regulatoryMapping !== 'object') {
    errors.push('regulatoryMapping is missing or not an object');
  } else {
    for (let i = 1; i <= 10; i++) {
      const rm = data.regulatoryMapping[`D${i}`];
      if (!rm) {
        errors.push(`regulatoryMapping["D${i}"] is missing`);
      } else {
        if (typeof rm.title !== 'string') errors.push(`regulatoryMapping["D${i}"].title must be a string`);
        if (!Array.isArray(rm.tags) || !rm.tags.every((s: any) => typeof s === 'string')) {
          errors.push(`regulatoryMapping["D${i}"].tags must be an array of strings`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const parsedDimensions: Record<string, { cap: number; evid: number; na: boolean }> = {};
  for (let i = 1; i <= 10; i++) {
    const dim = data.assessment.dimensions[i.toString()];
    parsedDimensions[i.toString()] = {
      cap: parseInt(dim.cap, 10),
      evid: parseInt(dim.evid, 10),
      na: dim.na === 'true'
    };
  }

  const validatedData: ValidatedTrackDExport = {
    ...data,
    assessment: {
      ...data.assessment,
      dimensions: parsedDimensions
    }
  };

  return { valid: true, data: validatedData };
}
