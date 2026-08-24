/**
 * Track D v6.1 → Assurance MVP Intake Adapter Tests
 * 
 * Run with: npx tsx --test adapter/tests/adapter.test.ts
 * (from the track-d-governability-audit directory)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// We import relatively since there's no package.json
import { validateTrackDExport } from '../src/validate';
import { hashTrackDExport } from '../src/hash';
import { translateTrackDToAssurance } from '../src/translate';
import { TRACK_D_DIMENSION_MAP, MAPPING_VERSION } from '../src/dimension-map';

// ============================================================
// TEST FIXTURES
// ============================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// Minimal valid v6.1 export shape for testing
function makeValidExport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    schemaVersion: '6.1.0',
    schemaName: 'Governability Diagnostic Protocol',
    generatedAt: '2025-01-15T10:00:00.000Z',
    assessment: {
      metadata: {
        criticality: 'operational',
        audience: 'general',
        company: 'TestCorp',
        assessor: 'Test Assessor',
        confidence: 'high',
        date: '2025-01-15',
        valid: '2025-04-15',
      },
      dimensions: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [
          String(i + 1),
          { cap: '2', evid: '1', na: 'false' },
        ])
      ),
      notes: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [String(i + 1), ''])
      ),
      summary: { actions: '' },
    },
    diligenceMatrix: {
      capabilityScore: 67,
      assuranceScore: 25,
      quadrant: 'gap',
      maxCapabilityScore: 84,
      maxAssuranceScore: 112,
      totalWeight: 28,
    },
    narrative: {
      confidenceStatement: 'Test narrative',
      priorityGaps: '',
      relianceRecommendation: 'CONDITIONAL RELIANCE',
      relianceRationale: 'Test rationale',
      reassessmentTriggers: '',
    },
    floorRulesTriggered: [],
    regulatoryMapping: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        `D${i + 1}`,
        { title: `Dimension ${i + 1}`, tags: [] },
      ])
    ),
  };

  return { ...base, ...overrides };
}

// ============================================================
// VALIDATION TESTS
// ============================================================

describe('Track D v6.1 Validation', () => {
  it('accepts a valid v6.1 export', () => {
    const result = validateTrackDExport(makeValidExport());
    assert.equal(result.valid, true);
  });

  it('rejects wrong schema version', () => {
    const result = validateTrackDExport(
      makeValidExport({ schemaVersion: '5.0.0' })
    );
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.some(e => e.includes('schemaVersion')));
    }
  });

  it('rejects missing schema version', () => {
    const data = makeValidExport();
    delete data.schemaVersion;
    const result = validateTrackDExport(data);
    assert.equal(result.valid, false);
  });

  it('rejects non-object input', () => {
    const result = validateTrackDExport('not an object');
    assert.equal(result.valid, false);
  });

  it('rejects null input', () => {
    const result = validateTrackDExport(null);
    assert.equal(result.valid, false);
  });

  it('rejects missing dimensions', () => {
    const data = makeValidExport();
    const assessment = data.assessment as Record<string, unknown>;
    const dims = { ...(assessment.dimensions as Record<string, unknown>) };
    delete dims['5'];
    assessment.dimensions = dims;
    const result = validateTrackDExport(data);
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.some(e => e.includes('dimension') || e.includes('5')));
    }
  });

  it('rejects capability score out of range (> 3)', () => {
    const data = makeValidExport();
    const assessment = data.assessment as Record<string, unknown>;
    const dims = { ...(assessment.dimensions as Record<string, unknown>) };
    dims['1'] = { cap: '4', evid: '1', na: 'false' };
    assessment.dimensions = dims;
    const result = validateTrackDExport(data);
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.some(e => e.includes('cap') || e.includes('capability')));
    }
  });

  it('rejects evidence score out of range (> 4)', () => {
    const data = makeValidExport();
    const assessment = data.assessment as Record<string, unknown>;
    const dims = { ...(assessment.dimensions as Record<string, unknown>) };
    dims['1'] = { cap: '2', evid: '5', na: 'false' };
    assessment.dimensions = dims;
    const result = validateTrackDExport(data);
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.some(e => e.includes('evid') || e.includes('evidence') || e.includes('assurance')));
    }
  });

  it('accepts N/A dimensions without validating cap/evid', () => {
    const data = makeValidExport();
    const assessment = data.assessment as Record<string, unknown>;
    const dims = { ...(assessment.dimensions as Record<string, unknown>) };
    dims['4'] = { cap: '-1', evid: '-1', na: 'true' };
    assessment.dimensions = dims;
    const result = validateTrackDExport(data);
    assert.equal(result.valid, true);
  });

  it('parses string dimension values into numbers', () => {
    const result = validateTrackDExport(makeValidExport());
    assert.equal(result.valid, true);
    if (result.valid) {
      // The validated data should have numeric cap/evid and boolean na
      const dim1 = result.data.assessment.dimensions['1'];
      assert.equal(typeof dim1.cap, 'number');
      assert.equal(typeof dim1.evid, 'number');
      assert.equal(typeof dim1.na, 'boolean');
    }
  });

  it('validates the real sample fixture', () => {
    const json = loadFixture('sample-v61-export.json');
    const data = JSON.parse(json);
    const result = validateTrackDExport(data);
    assert.equal(result.valid, true, 
      `Fixture validation failed: ${!result.valid ? result.errors.join(', ') : ''}`);
  });
});

// ============================================================
// HASHING TESTS
// ============================================================

describe('Content Hashing', () => {
  it('produces a deterministic SHA-256 hash', () => {
    const json = JSON.stringify(makeValidExport(), null, 2);
    const hash1 = hashTrackDExport(json);
    const hash2 = hashTrackDExport(json);
    assert.equal(hash1, hash2);
  });

  it('produces different hashes for different content', () => {
    const json1 = JSON.stringify(makeValidExport());
    const json2 = JSON.stringify(makeValidExport({ generatedAt: '2025-02-01T00:00:00Z' }));
    const hash1 = hashTrackDExport(json1);
    const hash2 = hashTrackDExport(json2);
    assert.notEqual(hash1, hash2);
  });

  it('matches manual SHA-256 computation', () => {
    const json = JSON.stringify(makeValidExport());
    const hash = hashTrackDExport(json);
    const expected = createHash('sha256').update(json).digest('hex');
    assert.equal(hash, expected);
  });
});

// ============================================================
// TRANSLATION TESTS
// ============================================================

describe('Track D → Assurance Translation', () => {
  function doTranslation(exportOverrides: Record<string, unknown> = {}) {
    const exportData = makeValidExport(exportOverrides);
    const json = JSON.stringify(exportData);
    const hash = hashTrackDExport(json);
    const validationResult = validateTrackDExport(exportData);
    assert.equal(validationResult.valid, true);
    if (!validationResult.valid) throw new Error('Validation failed');
    return translateTrackDToAssurance(
      validationResult.data,
      hash,
      '2025-01-15T10:05:00.000Z'
    );
  }

  it('produces an assessment at L1_diagnostic level', () => {
    const result = doTranslation();
    assert.equal(result.assessment.level, 'L1_diagnostic');
  });

  it('produces an assessment at intake status', () => {
    const result = doTranslation();
    assert.equal(result.assessment.status, 'intake');
  });

  it('preserves source artifact hash', () => {
    const exportData = makeValidExport();
    const json = JSON.stringify(exportData);
    const hash = hashTrackDExport(json);
    const validationResult = validateTrackDExport(exportData);
    if (!validationResult.valid) throw new Error('Validation failed');
    const result = translateTrackDToAssurance(
      validationResult.data,
      hash,
      '2025-01-15T10:05:00.000Z'
    );
    assert.equal(result.sourceArtifact.hash, hash);
  });

  it('produces self_assessment_context from diligence matrix', () => {
    const result = doTranslation();
    assert.ok(result.selfAssessmentContext);
    assert.equal(result.selfAssessmentContext.schemaVersion, '6.1.0');
    assert.ok(result.selfAssessmentContext.diligenceMatrix);
    assert.ok(result.selfAssessmentContext.narrative);
  });

  it('creates one evidence claim per non-NA dimension', () => {
    const result = doTranslation();
    // All 10 dimensions are non-NA in the default fixture
    assert.equal(result.evidenceClaims.length, 10);
  });

  it('skips NA dimensions in evidence claims', () => {
    const exportData = makeValidExport();
    const assessment = exportData.assessment as Record<string, unknown>;
    const dims = { ...(assessment.dimensions as Record<string, unknown>) };
    dims['4'] = { cap: '-1', evid: '-1', na: 'true' };
    dims['6'] = { cap: '-1', evid: '-1', na: 'true' };
    assessment.dimensions = dims;

    const json = JSON.stringify(exportData);
    const hash = hashTrackDExport(json);
    const validationResult = validateTrackDExport(exportData);
    if (!validationResult.valid) throw new Error('Validation failed');
    const result = translateTrackDToAssurance(validationResult.data, hash, new Date().toISOString());
    assert.equal(result.evidenceClaims.length, 8);
  });

  it('sets all evidence claims to submitted_by_type = client', () => {
    const result = doTranslation();
    for (const claim of result.evidenceClaims) {
      assert.equal(claim.submittedByType, 'client');
    }
  });

  it('sets all evidence claims to evidence_type = client_statement', () => {
    const result = doTranslation();
    for (const claim of result.evidenceClaims) {
      assert.equal(claim.evidenceType, 'client_statement');
    }
  });

  it('sets evidence provenance to track_d_self_assessment', () => {
    const result = doTranslation();
    for (const claim of result.evidenceClaims) {
      assert.ok(claim.content.includes('track_d_self_assessment'));
    }
  });

  // ============================================================
  // CRITICAL: Evidence gating per Settled Decision 2
  // ============================================================

  it('NEVER creates a finding above E1_documented', () => {
    // Even with Track D evid=4 (External Proof), findings stay at E1
    const exportData = makeValidExport();
    const assessment = exportData.assessment as Record<string, unknown>;
    const dims = { ...(assessment.dimensions as Record<string, unknown>) };
    // Set all dimensions to maximum evidence
    for (let i = 1; i <= 10; i++) {
      dims[String(i)] = { cap: '3', evid: '4', na: 'false' };
    }
    assessment.dimensions = dims;

    const json = JSON.stringify(exportData);
    const hash = hashTrackDExport(json);
    const validationResult = validateTrackDExport(exportData);
    if (!validationResult.valid) throw new Error('Validation failed');
    const result = translateTrackDToAssurance(validationResult.data, hash, new Date().toISOString());

    // Check every evidence claim: supports_level can be high (per Settled Decision 2)
    // but the finding's gatedEvidenceLevel must be E0 or E1
    for (const dim of result.selfAssessmentContext.dimensionScores) {
      assert.ok(
        dim.gatedEvidenceLevel === 'E0_claimed' || dim.gatedEvidenceLevel === 'E1_documented',
        `Dimension ${dim.dimensionId} has gatedEvidenceLevel=${dim.gatedEvidenceLevel}, expected E0 or E1`
      );
    }
  });

  it('preserves Track D claimed level in evidence row supports_level', () => {
    const exportData = makeValidExport();
    const assessment = exportData.assessment as Record<string, unknown>;
    const dims = { ...(assessment.dimensions as Record<string, unknown>) };
    dims['1'] = { cap: '3', evid: '4', na: 'false' };
    assessment.dimensions = dims;

    const json = JSON.stringify(exportData);
    const hash = hashTrackDExport(json);
    const validationResult = validateTrackDExport(exportData);
    if (!validationResult.valid) throw new Error('Validation failed');
    const result = translateTrackDToAssurance(validationResult.data, hash, new Date().toISOString());

    const d1Claim = result.evidenceClaims.find((c: { dimensionId: number }) => c.dimensionId === 1);
    assert.ok(d1Claim, 'Expected evidence claim for dimension 1');
    // The supports_level should reflect the Track D claimed level
    assert.equal(d1Claim!.supportsLevel, 'E4_adversarially_tested');
    // But submitted_by_type is client, so the SQL trigger prevents using this
    // to upgrade a Finding above E1
    assert.equal(d1Claim!.submittedByType, 'client');
  });

  // ============================================================
  // Floor condition tests
  // ============================================================

  it('detects D3 floor condition (cap=0, no override)', () => {
    const exportData = makeValidExport();
    const assessment = exportData.assessment as Record<string, unknown>;
    const dims = { ...(assessment.dimensions as Record<string, unknown>) };
    dims['3'] = { cap: '0', evid: '0', na: 'false' };
    assessment.dimensions = dims;
    (exportData as any).floorRulesTriggered = ['D3 Floor Rule (No Override)'];

    const json = JSON.stringify(exportData);
    const hash = hashTrackDExport(json);
    const validationResult = validateTrackDExport(exportData);
    if (!validationResult.valid) throw new Error('Validation failed');
    const result = translateTrackDToAssurance(validationResult.data, hash, new Date().toISOString());

    assert.ok(result.floorConditions.d3NoOverride);
  });

  it('detects D10 floor condition (cap=0, no containment)', () => {
    const exportData = makeValidExport();
    const assessment = exportData.assessment as Record<string, unknown>;
    const dims = { ...(assessment.dimensions as Record<string, unknown>) };
    dims['10'] = { cap: '0', evid: '0', na: 'false' };
    assessment.dimensions = dims;
    (exportData as any).floorRulesTriggered = ['D10 Floor Rule (No Containment)'];

    const json = JSON.stringify(exportData);
    const hash = hashTrackDExport(json);
    const validationResult = validateTrackDExport(exportData);
    if (!validationResult.valid) throw new Error('Validation failed');
    const result = translateTrackDToAssurance(validationResult.data, hash, new Date().toISOString());

    assert.ok(result.floorConditions.d10NoContainment);
  });

  it('detects D2 backstop (evid=0)', () => {
    const exportData = makeValidExport();
    const assessment = exportData.assessment as Record<string, unknown>;
    const dims = { ...(assessment.dimensions as Record<string, unknown>) };
    dims['2'] = { cap: '2', evid: '0', na: 'false' };
    assessment.dimensions = dims;

    const json = JSON.stringify(exportData);
    const hash = hashTrackDExport(json);
    const validationResult = validateTrackDExport(exportData);
    if (!validationResult.valid) throw new Error('Validation failed');
    const result = translateTrackDToAssurance(validationResult.data, hash, new Date().toISOString());

    assert.ok(result.floorConditions.d2Backstop);
  });
});

// ============================================================
// DIMENSION MAP TESTS
// ============================================================

describe('Dimension Mapping', () => {
  it('has a mapping for all 10 dimensions', () => {
    for (let i = 1; i <= 10; i++) {
      assert.ok(TRACK_D_DIMENSION_MAP[i], `Missing mapping for dimension ${i}`);
    }
  });

  it('has a version string', () => {
    assert.ok(MAPPING_VERSION);
    assert.match(MAPPING_VERSION, /^\d+\.\d+\.\d+$/);
  });

  it('D1 maps to ASI01', () => {
    assert.ok(TRACK_D_DIMENSION_MAP[1].frameworkRefs.includes('ASI01'));
  });

  it('D5 maps to ASI07 and ASI09', () => {
    assert.ok(TRACK_D_DIMENSION_MAP[5].frameworkRefs.includes('ASI07'));
    assert.ok(TRACK_D_DIMENSION_MAP[5].frameworkRefs.includes('ASI09'));
  });

  it('D10 maps to ASI08', () => {
    assert.ok(TRACK_D_DIMENSION_MAP[10].frameworkRefs.includes('ASI08'));
  });

  it('D6 and D7 use LLM draft path (no deterministic rule)', () => {
    assert.equal(TRACK_D_DIMENSION_MAP[6].hasDeterministicRule, false);
    assert.equal(TRACK_D_DIMENSION_MAP[7].hasDeterministicRule, false);
    assert.equal(TRACK_D_DIMENSION_MAP[6].useLLMDraft, true);
    assert.equal(TRACK_D_DIMENSION_MAP[7].useLLMDraft, true);
  });
});

// ============================================================
// IDEMPOTENCY TESTS
// ============================================================

describe('Idempotency', () => {
  it('same export produces same content hash', () => {
    const json = JSON.stringify(makeValidExport(), null, 2);
    const hash1 = hashTrackDExport(json);
    const hash2 = hashTrackDExport(json);
    assert.equal(hash1, hash2);
  });

  it('identical translations produce identical results', () => {
    const exportData = makeValidExport();
    const json = JSON.stringify(exportData);
    const hash = hashTrackDExport(json);
    const validationResult = validateTrackDExport(exportData);
    if (!validationResult.valid) throw new Error('Validation failed');

    const result1 = translateTrackDToAssurance(validationResult.data, hash, '2025-01-15T10:00:00Z');
    const result2 = translateTrackDToAssurance(validationResult.data, hash, '2025-01-15T10:00:00Z');

    assert.deepStrictEqual(result1.selfAssessmentContext, result2.selfAssessmentContext);
    assert.deepStrictEqual(result1.floorConditions, result2.floorConditions);
    assert.equal(result1.evidenceClaims.length, result2.evidenceClaims.length);
  });
});

// ============================================================
// REAL FIXTURE TESTS
// ============================================================

describe('Real Fixture Integration', () => {
  it('processes the weak-governance sample fixture end-to-end', () => {
    const json = loadFixture('sample-v61-export.json');
    const data = JSON.parse(json);
    const validationResult = validateTrackDExport(data);
    assert.equal(validationResult.valid, true,
      `Validation failed: ${!validationResult.valid ? validationResult.errors.join(', ') : ''}`);
    if (!validationResult.valid) return;

    const hash = hashTrackDExport(json);
    const result = translateTrackDToAssurance(validationResult.data, hash, new Date().toISOString());

    // Assessment should be L1_diagnostic
    assert.equal(result.assessment.level, 'L1_diagnostic');
    assert.equal(result.assessment.status, 'intake');

    // Should have D3 floor condition (D3 cap=0 in the fixture)
    assert.ok(result.floorConditions.d3NoOverride, 'Expected D3 floor condition');
    // Should have D10 floor condition (D10 cap=0 in the fixture)
    assert.ok(result.floorConditions.d10NoContainment, 'Expected D10 floor condition');

    // No evidence claims should be above E1
    for (const dim of result.selfAssessmentContext.dimensionScores) {
      assert.ok(
        dim.gatedEvidenceLevel === 'E0_claimed' || dim.gatedEvidenceLevel === 'E1_documented',
        `Dimension ${dim.dimensionId} has inflated gatedEvidenceLevel: ${dim.gatedEvidenceLevel}`
      );
    }
  });

  it('processes the strong-governance fixture without inflating evidence', () => {
    const json = loadFixture('sample-v61-export-strong.json');
    const data = JSON.parse(json);
    const validationResult = validateTrackDExport(data);
    assert.equal(validationResult.valid, true,
      `Validation failed: ${!validationResult.valid ? validationResult.errors.join(', ') : ''}`);
    if (!validationResult.valid) return;

    const hash = hashTrackDExport(json);
    const result = translateTrackDToAssurance(validationResult.data, hash, new Date().toISOString());

    // Even with all Track D scores maxed, evidence stays at E0/E1
    for (const dim of result.selfAssessmentContext.dimensionScores) {
      assert.ok(
        dim.gatedEvidenceLevel === 'E0_claimed' || dim.gatedEvidenceLevel === 'E1_documented',
        `Strong fixture: Dimension ${dim.dimensionId} has inflated gatedEvidenceLevel: ${dim.gatedEvidenceLevel}`
      );
    }

    // Should NOT have floor conditions (everything is high)
    assert.equal(result.floorConditions.d3NoOverride, false, 'Strong fixture should not trigger D3 floor');
    assert.equal(result.floorConditions.d10NoContainment, false, 'Strong fixture should not trigger D10 floor');
  });
});
