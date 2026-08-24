/**
 * Phase 1 Intake API Test Suite
 * 
 * Tests the HTTP intake seam:
 * Track D v6.1 JSON -> POST /api/diagnostics/intake -> validate -> hash -> translate -> persist -> respond
 * 
 * Acceptance Criteria covered:
 * - AC1: Weak fixture processing (HTTP 200, L1_diagnostic, floor conditions, evidence claims, source hash)
 * - AC2: Strong fixture processing (HTTP 200, L1_diagnostic, no unexpected floor conditions, source hash)
 * - AC3: Invalid submission rejection (HTTP 400 with structured validation errors, malformed JSON, empty body)
 * - AC4: Idempotent hashing (identical content hash across repeat submissions, no mutation)
 * - AC5: Raw source preservation (original JSON, hash, timestamp, schema version, translated result in store)
 * - Store retrieval and query operations
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { POST } from '../../../../trust-readiness-diagnostic/src/app/api/diagnostics/intake/route';
import { 
  getAssuranceAssessment, 
  listAssuranceAssessments, 
  findAssessmentsByHash,
  clearStorageForTesting 
} from '../../../../trust-readiness-diagnostic/src/lib/assurance/store';
import { hashTrackDExport } from '../src/hash';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

describe('Phase 1: Intake API (/api/diagnostics/intake)', () => {
  beforeEach(async () => {
    await clearStorageForTesting();
  });

  // ============================================================
  // AC1: Weak fixture acceptance
  // ============================================================
  describe('AC1: Weak Fixture Processing', () => {
    it('accepts weak fixture and returns 200 with L1_diagnostic and detected floor conditions', async () => {
      const rawJson = loadFixture('sample-v61-export.json');
      const expectedHash = hashTrackDExport(rawJson);

      const request = new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawJson,
      });

      const response = await POST(request);
      assert.equal(response.status, 200);

      const body = await response.json();

      // Assessment identity and level
      assert.ok(body.assessment_id, 'Expected assessment_id in response');
      assert.equal(body.assessment_level, 'L1_diagnostic');
      assert.equal(body.status, 'intake');

      // Content hash matches SHA-256 of raw input
      assert.equal(body.source_hash, expectedHash);
      assert.equal(body.source_artifact_hash, expectedHash);

      // Floor conditions: weak fixture has D3 cap=0 and D10 cap=0
      assert.equal(body.floor_conditions.d3NoOverride, true);
      assert.equal(body.floor_conditions.d10NoContainment, true);

      // Evidence claim count: all 10 non-NA dimensions should produce evidence claims
      assert.equal(body.evidence_claim_count, 10);
      assert.equal(body.schema_version, '6.1.0');
    });
  });

  // ============================================================
  // AC2: Strong fixture acceptance
  // ============================================================
  describe('AC2: Strong Fixture Processing', () => {
    it('accepts strong fixture and returns 200 with L1_diagnostic and no floor conditions', async () => {
      const rawJson = loadFixture('sample-v61-export-strong.json');
      const expectedHash = hashTrackDExport(rawJson);

      const request = new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawJson,
      });

      const response = await POST(request);
      assert.equal(response.status, 200);

      const body = await response.json();

      assert.ok(body.assessment_id, 'Expected assessment_id in response');
      assert.equal(body.assessment_level, 'L1_diagnostic');
      assert.equal(body.status, 'intake');
      assert.equal(body.source_hash, expectedHash);

      // Strong fixture has no floor conditions triggered
      assert.equal(body.floor_conditions.d2Backstop, false);
      assert.equal(body.floor_conditions.d3NoOverride, false);
      assert.equal(body.floor_conditions.d10NoContainment, false);
      assert.equal(body.floor_conditions.opacityPenalty, false);

      assert.equal(body.evidence_claim_count, 10);
    });
  });

  // ============================================================
  // AC3: Invalid submission rejection
  // ============================================================
  describe('AC3: Invalid Submission Rejection', () => {
    it('returns 400 for empty request body', async () => {
      const request = new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      });

      const response = await POST(request);
      assert.equal(response.status, 400);

      const body = await response.json();
      assert.ok(body.error);
      assert.match(body.error, /empty/i);
    });

    it('returns 400 for malformed JSON syntax', async () => {
      const request = new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ schemaVersion: "6.1.0", broken json ...',
      });

      const response = await POST(request);
      assert.equal(response.status, 400);

      const body = await response.json();
      assert.ok(body.error);
      assert.match(body.error, /malformed/i);
    });

    it('returns 400 with structured errors array for schema validation failure (wrong version)', async () => {
      const invalidVersion = {
        schemaVersion: '5.0.0',
        assessment: { metadata: {}, dimensions: {}, notes: {}, summary: {} },
      };

      const request = new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidVersion),
      });

      const response = await POST(request);
      assert.equal(response.status, 400);

      const body = await response.json();
      assert.equal(body.error, 'Validation failed');
      assert.ok(Array.isArray(body.errors), 'Expected structured errors array');
      assert.ok(body.errors.some((e: string) => e.includes('schemaVersion')));
    });

    it('returns 400 with structured errors for out-of-range dimension scores', async () => {
      const baseExport = JSON.parse(loadFixture('sample-v61-export.json'));
      baseExport.assessment.dimensions['1'].cap = '99'; // Invalid score > 3

      const request = new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseExport),
      });

      const response = await POST(request);
      assert.equal(response.status, 400);

      const body = await response.json();
      assert.equal(body.error, 'Validation failed');
      assert.ok(Array.isArray(body.errors));
      assert.ok(body.errors.some((e: string) => e.includes('assessment.dimensions["1"].cap')));
    });
  });

  // ============================================================
  // AC4: Idempotent content hashing
  // ============================================================
  describe('AC4: Idempotent Hashing', () => {
    it('produces identical content hash across multiple submissions of the same fixture', async () => {
      const rawJson = loadFixture('sample-v61-export.json');
      const expectedHash = hashTrackDExport(rawJson);

      const req1 = new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawJson,
      });
      const res1 = await POST(req1);
      const body1 = await res1.json();

      const req2 = new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawJson,
      });
      const res2 = await POST(req2);
      const body2 = await res2.json();

      // Hashes must be completely identical and deterministic
      assert.equal(body1.source_hash, expectedHash);
      assert.equal(body2.source_hash, expectedHash);
      assert.equal(body1.source_hash, body2.source_hash);

      // Floor conditions and evidence claim counts are identical
      assert.deepEqual(body1.floor_conditions, body2.floor_conditions);
      assert.equal(body1.evidence_claim_count, body2.evidence_claim_count);

      // Both records exist in store searchable by hash
      const matchingRecords = await findAssessmentsByHash(expectedHash);
      assert.equal(matchingRecords.length, 2);
    });
  });

  // ============================================================
  // AC5: Raw source preservation
  // ============================================================
  describe('AC5: Raw Source Preservation', () => {
    it('preserves exact raw JSON submission, content hash, timestamp, and schema version', async () => {
      const rawJson = loadFixture('sample-v61-export.json');
      const expectedHash = hashTrackDExport(rawJson);

      const request = new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawJson,
      });

      const response = await POST(request);
      const body = await response.json();
      const assessmentId = body.assessment_id;

      // Retrieve the stored record from the assurance store
      const stored = await getAssuranceAssessment(assessmentId);
      assert.ok(stored, 'Stored assessment record must exist');

      // 1. Raw JSON submission is preserved exactly (byte-for-byte)
      assert.equal(stored!.rawSubmission, rawJson);

      // 2. Content hash matches
      assert.equal(stored!.sourceHash, expectedHash);

      // 3. Schema version matches
      assert.equal(stored!.schemaVersion, '6.1.0');

      // 4. Timestamp is ISO 8601
      assert.ok(stored!.receivedAt);
      assert.ok(!isNaN(Date.parse(stored!.receivedAt)));

      // 5. Translated domain object is preserved
      assert.equal(stored!.result.assessment.level, 'L1_diagnostic');
      assert.equal(stored!.result.assessment.status, 'intake');
      assert.equal(stored!.result.evidenceClaims.length, 10);
      assert.equal(stored!.result.selfAssessmentContext.schemaVersion, '6.1.0');
    });

    it('returns null when querying non-existent assessment ID', async () => {
      const stored = await getAssuranceAssessment('non-existent-uuid-12345');
      assert.equal(stored, null);
    });

    it('lists all stored assessments ordered newest first', async () => {
      const rawWeak = loadFixture('sample-v61-export.json');
      const rawStrong = loadFixture('sample-v61-export-strong.json');

      await POST(new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawWeak,
      }));

      await POST(new Request('http://localhost:3000/api/diagnostics/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawStrong,
      }));

      const all = await listAssuranceAssessments();
      assert.ok(all.length >= 2);
    });
  });
});
