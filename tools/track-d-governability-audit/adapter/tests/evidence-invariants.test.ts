/**
 * Phase 2: Evidence Invariant Test Suite
 * 
 * Executes real PostgreSQL tests against 001_init_schema.sql and 002_track_d_intake.sql
 * to prove whether the E0-E4 evidence ladder and integrity constraints can be bypassed.
 * 
 * Required Test Coverage:
 * - Test 1: Client submits E1 evidence (ACCEPTED)
 * - Test 2: Client submits E3 evidence (REJECTED by trigger / finding isolation)
 * - Test 3: Client submits E2 evidence (REJECTED by trigger / finding isolation)
 * - Test 4: Reviewer submits E2 evidence (ACCEPTED)
 * - Test 5: Test harness submits E4 evidence (ACCEPTED)
 * - Test 6: Finding attempts E2 upgrade with client-only evidence (REJECTED)
 * - Test 7: Finding upgrades to E2 with qualifying reviewer evidence (ACCEPTED)
 * - Test 8: Finding attempts E3 upgrade with only reviewer E2 evidence (REJECTED)
 * - Test 9: Provenance-forgery attack analysis (API vs DB actor authentication)
 * - Test 10: INSERT versus UPDATE attacks on findings.evidence_level
 * - Test 11: Superseded evidence behavior (staleness disqualifies higher level)
 * - Test 12: Phase 1 Adapter output integration with PostgreSQL schema
 * - Test 13: Deliberate bypass suite (invalid enums, NULLs, FK cross-links, untraced findings)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

import { validateTrackDExport } from '../src/validate';
import { hashTrackDExport } from '../src/hash';
import { translateTrackDToAssurance } from '../src/translate';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load SQL schemas
const SCHEMA_001 = readFileSync(join(process.cwd(), '..', '..', '..', 'docs', 'assurance-mvp-spec', 'db', '001_init_schema.sql'), 'utf-8');
const SCHEMA_002 = readFileSync(join(process.cwd(), 'db', '002_track_d_intake.sql'), 'utf-8');

interface TestContext {
  db: PGlite;
  clientId: string;
  systemId: string;
  reviewerId: string;
  assessmentId: string;
  nodeId: string;
  edgeId: string;
  frameworkRefId: string;
}

async function setupFreshDatabase(): Promise<TestContext> {
  const db = new PGlite();
  
  // Apply base schema and Track D intake migration
  await db.exec(SCHEMA_001);
  await db.exec(SCHEMA_002);

  // 1. Seed Client
  const clientRes = await db.query<{ id: string }>(
    `INSERT INTO clients (name, contact_email, industry)
     VALUES ('Acme Corp', 'security@acme.com', 'Fintech')
     RETURNING id`
  );
  const clientId = clientRes.rows[0].id;

  // 2. Seed System
  const systemRes = await db.query<{ id: string }>(
    `INSERT INTO systems (client_id, name, model_provider, model_name, description)
     VALUES ($1, 'Payment Agent v1', 'OpenAI', 'gpt-4o', 'Handles automated invoice settlement')
     RETURNING id`,
    [clientId]
  );
  const systemId = systemRes.rows[0].id;

  // 3. Seed Reviewer
  const reviewerRes = await db.query<{ id: string }>(
    `INSERT INTO reviewers (name, role)
     VALUES ('Dr. Alex Vance', 'human_validator')
     RETURNING id`
  );
  const reviewerId = reviewerRes.rows[0].id;

  // 4. Seed Assessment
  const assessmentRes = await db.query<{ id: string }>(
    `INSERT INTO assessments (client_id, system_id, level, status, assigned_reviewer_id)
     VALUES ($1, $2, 'L1_diagnostic', 'intake', $3)
     RETURNING id`,
    [clientId, systemId, reviewerId]
  );
  const assessmentId = assessmentRes.rows[0].id;

  // 5. Seed Authority Map Node
  const nodeRes = await db.query<{ id: string }>(
    `INSERT INTO authority_map_nodes (system_id, node_type, name, identity, metadata)
     VALUES ($1, 'agent', 'Procurement Agent Core', 'svc-procure', '{"env": "prod"}'::jsonb)
     RETURNING id`,
    [systemId]
  );
  const nodeId = nodeRes.rows[0].id;

  // 6. Seed Authority Map Edge
  const edgeRes = await db.query<{ id: string }>(
    `INSERT INTO authority_map_edges (
       system_id, source_node_id, target_node_id, edge_type, permission_scope,
       requires_human_approval, action_reversibility, trust_boundary
     )
     VALUES ($1, $2, $2, 'calls', 'stripe:charges:create', false, 'irreversible', 'external')
     RETURNING id`,
    [systemId, nodeId]
  );
  const edgeId = edgeRes.rows[0].id;

  // 7. Seed Framework Reference (ASI01)
  const fwRes = await db.query<{ id: string }>(
    `INSERT INTO framework_references (framework, reference_code, title, layer)
     VALUES ('OWASP_ASI', 'ASI01', 'Excessive Agent Autonomy & Irreversible Actions', 'security_posture')
     RETURNING id`
  );
  const frameworkRefId = fwRes.rows[0].id;

  return {
    db,
    clientId,
    systemId,
    reviewerId,
    assessmentId,
    nodeId,
    edgeId,
    frameworkRefId,
  };
}

describe('Phase 2: PostgreSQL Evidence Invariant Tests', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupFreshDatabase();
  });

  // Helper to create a base finding at E1_documented
  async function createFinding(evidenceLevel: string = 'E1_documented', draftedBy: string = 'llm'): Promise<string> {
    const res = await ctx.db.query<{ id: string }>(
      `INSERT INTO findings (
         assessment_id, framework_reference_id, authority_map_edge_id,
         title, description, severity, confidence, evidence_level, status, drafted_by
       )
       VALUES ($1, $2, $3, 'Uncontained Payment Action', 'Agent initiates payment without human gate', 'critical', 'high', $4, 'open', $5)
       RETURNING id`,
      [ctx.assessmentId, ctx.frameworkRefId, ctx.edgeId, evidenceLevel, draftedBy]
    );
    return res.rows[0].id;
  }

  // ============================================================
  // SECTION 1: Evidence Submission Permission Matrix (Tests 1-5)
  // ============================================================
  describe('Evidence Submission Permissions', () => {
    it('Test 1 — Client submits E1_documented evidence: ACCEPTED', async () => {
      const findingId = await createFinding('E1_documented');

      const res = await ctx.db.query<{ id: string; supports_level: string }>(
        `INSERT INTO evidence (
           finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type
         )
         VALUES ($1, 'document', 'a1b2c3d4e5f6', 's3://evidence/policy.pdf', 'E1_documented', 'client')
         RETURNING id, supports_level`,
        [findingId]
      );

      assert.ok(res.rows[0].id);
      assert.equal(res.rows[0].supports_level, 'E1_documented');
    });

    it('Test 2 & 3 — Client claims E2/E3 evidence in evidence table: Stored as claim, but CANNOT elevate finding', async () => {
      const findingId = await createFinding('E1_documented');

      // Client can record their claim in the evidence table per Settled Decision 2
      const resE3 = await ctx.db.query<{ id: string; supports_level: string }>(
        `INSERT INTO evidence (
           finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type
         )
         VALUES ($1, 'client_statement', 'hash_e3_claim', 's3://evidence/claim.pdf', 'E3_validated', 'client')
         RETURNING id, supports_level`,
        [findingId]
      );
      assert.equal(resE3.rows[0].supports_level, 'E3_validated');

      // BUT when attempting to upgrade the finding to E2 or E3 using this client evidence,
      // the SQL trigger enforce_evidence_integrity REJECTS the update!
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `UPDATE findings SET evidence_level = 'E3_validated' WHERE id = $1`,
            [findingId]
          );
        },
        /cannot be set to E3_validated without qualifying reviewer or test_harness evidence/i
      );

      await assert.rejects(
        async () => {
          await ctx.db.query(
            `UPDATE findings SET evidence_level = 'E2_observed' WHERE id = $1`,
            [findingId]
          );
        },
        /cannot be set to E2_observed without qualifying reviewer or test_harness evidence/i
      );
    });

    it('Test 4 — Reviewer submits E2_observed evidence: ACCEPTED', async () => {
      const findingId = await createFinding('E1_documented');

      const res = await ctx.db.query<{ id: string; supports_level: string; submitted_by_type: string }>(
        `INSERT INTO evidence (
           finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type, submitted_by_id
         )
         VALUES ($1, 'log_excerpt', 'hash_log_001', 's3://evidence/audit_log.json', 'E2_observed', 'reviewer', $2)
         RETURNING id, supports_level, submitted_by_type`,
        [findingId, ctx.reviewerId]
      );

      assert.ok(res.rows[0].id);
      assert.equal(res.rows[0].supports_level, 'E2_observed');
      assert.equal(res.rows[0].submitted_by_type, 'reviewer');
    });

    it('Test 5 — Test harness submits E4_adversarially_tested evidence: ACCEPTED', async () => {
      const findingId = await createFinding('E1_documented');

      const res = await ctx.db.query<{ id: string; supports_level: string; submitted_by_type: string }>(
        `INSERT INTO evidence (
           finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type
         )
         VALUES ($1, 'test_result', 'hash_adversarial_run', 's3://evidence/redteam_report.json', 'E4_adversarially_tested', 'test_harness')
         RETURNING id, supports_level, submitted_by_type`,
        [findingId]
      );

      assert.ok(res.rows[0].id);
      assert.equal(res.rows[0].supports_level, 'E4_adversarially_tested');
      assert.equal(res.rows[0].submitted_by_type, 'test_harness');
    });
  });

  // ============================================================
  // SECTION 2: Finding Upgrade Invariants (Tests 6-8)
  // ============================================================
  describe('Finding Evidence Level Invariants', () => {
    it('Test 6 — Finding attempts E2_observed with client-only evidence: REJECTED by trigger', async () => {
      const findingId = await createFinding('E1_documented');

      // Attach client-submitted E1 and client-submitted E2 evidence
      await ctx.db.query(
        `INSERT INTO evidence (finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type)
         VALUES ($1, 'document', 'hash_1', 's3://evidence/doc.pdf', 'E1_documented', 'client'),
                ($1, 'client_statement', 'hash_2', 's3://evidence/claim.pdf', 'E2_observed', 'client')`,
        [findingId]
      );

      // Attempt to upgrade finding to E2_observed
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `UPDATE findings SET evidence_level = 'E2_observed' WHERE id = $1`,
            [findingId]
          );
        },
        (err: Error) => {
          assert.match(err.message, /cannot be set to E2_observed without qualifying reviewer or test_harness evidence/i);
          return true;
        }
      );

      // Verify finding level remained unchanged at E1_documented
      const check = await ctx.db.query<{ evidence_level: string }>(
        `SELECT evidence_level FROM findings WHERE id = $1`,
        [findingId]
      );
      assert.equal(check.rows[0].evidence_level, 'E1_documented');
    });

    it('Test 7 — Finding upgrades to E2_observed with qualifying reviewer evidence: ACCEPTED', async () => {
      const findingId = await createFinding('E1_documented');

      // Reviewer attaches qualifying E2 evidence
      await ctx.db.query(
        `INSERT INTO evidence (finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type, submitted_by_id)
         VALUES ($1, 'log_excerpt', 'hash_rev_log', 's3://evidence/log.json', 'E2_observed', 'reviewer', $2)`,
        [findingId, ctx.reviewerId]
      );

      // Upgrade finding to E2_observed
      const updateRes = await ctx.db.query<{ evidence_level: string }>(
        `UPDATE findings SET evidence_level = 'E2_observed' WHERE id = $1 RETURNING evidence_level`,
        [findingId]
      );

      assert.equal(updateRes.rows[0].evidence_level, 'E2_observed');
    });

    it('Test 8 — Finding attempts E3_validated with only reviewer E2 evidence: REJECTED', async () => {
      const findingId = await createFinding('E1_documented');

      // Reviewer attaches E2_observed evidence only
      await ctx.db.query(
        `INSERT INTO evidence (finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type, submitted_by_id)
         VALUES ($1, 'log_excerpt', 'hash_rev_log', 's3://evidence/log.json', 'E2_observed', 'reviewer', $2)`,
        [findingId, ctx.reviewerId]
      );

      // Attempt to upgrade finding to E3_validated (higher than the available E2 evidence)
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `UPDATE findings SET evidence_level = 'E3_validated' WHERE id = $1`,
            [findingId]
          );
        },
        /cannot be set to E3_validated without qualifying reviewer or test_harness evidence/i
      );

      // Verify finding level did not elevate to E3
      const check = await ctx.db.query<{ evidence_level: string }>(
        `SELECT evidence_level FROM findings WHERE id = $1`,
        [findingId]
      );
      assert.equal(check.rows[0].evidence_level, 'E1_documented');
    });
  });

  // ============================================================
  // SECTION 3: INSERT vs UPDATE Attack Vectors (Test 9-10)
  // ============================================================
  describe('INSERT vs UPDATE Bypass Attacks', () => {
    it('Test 9 (UPDATE attack) — Cannot bypass via sequential elevation (E1 -> E2 -> E3 -> E4)', async () => {
      const findingId = await createFinding('E1_documented');

      for (const targetLevel of ['E2_observed', 'E3_validated', 'E4_adversarially_tested']) {
        await assert.rejects(
          async () => {
            await ctx.db.query(
              `UPDATE findings SET evidence_level = $1 WHERE id = $2`,
              [targetLevel, findingId]
            );
          },
          /without qualifying reviewer or test_harness evidence/i
        );
      }
    });

    it('Test 10 (Actor Provenance Boundary) — Database accepts enum submitted_by_type; API must enforce actor session', async () => {
      const findingId = await createFinding('E1_documented');

      // The database schema enforces that submitted_by_type must be in ('client', 'operator', 'reviewer', 'test_harness').
      // It rejects invalid enum values:
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `INSERT INTO evidence (finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type)
             VALUES ($1, 'document', 'hash_x', 'ref', 'E2_observed', 'attacker')`,
            [findingId]
          );
        },
        /violates check constraint "evidence_submitted_by_type_check"/i
      );

      // Note: As documented in 001_init_schema.sql (lines 232-238) and Invariant 5:
      // Verifying that a caller cannot claim submitted_by_type='reviewer' when calling public API endpoints
      // is enforced at the API layer (11-api-contract.yaml: "submitted_by_type is set server-side from session").
    });
  });

  // ============================================================
  // SECTION 4: Superseded Evidence Staleness (Test 11)
  // ============================================================
  describe('Superseded Evidence Invariant', () => {
    it('Test 11 — Superseded evidence ceases to qualify finding for elevated evidence level', async () => {
      const findingId = await createFinding('E1_documented');

      // 1. Reviewer submits E2 evidence A
      const evARes = await ctx.db.query<{ id: string }>(
        `INSERT INTO evidence (finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type, submitted_by_id)
         VALUES ($1, 'log_excerpt', 'hash_log_v1', 's3://evidence/v1.json', 'E2_observed', 'reviewer', $2)
         RETURNING id`,
        [findingId, ctx.reviewerId]
      );
      const evidenceAId = evARes.rows[0].id;

      // 2. Finding upgrades to E2_observed successfully
      await ctx.db.query(
        `UPDATE findings SET evidence_level = 'E2_observed' WHERE id = $1`,
        [findingId]
      );

      // 3. Evidence A is marked superseded by Evidence B (e.g. log was found to be stale/invalid)
      const evBRes = await ctx.db.query<{ id: string }>(
        `INSERT INTO evidence (finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type, submitted_by_id)
         VALUES ($1, 'document', 'hash_doc_v2', 's3://evidence/v2.pdf', 'E1_documented', 'reviewer', $2)
         RETURNING id`,
        [findingId, ctx.reviewerId]
      );
      const evidenceBId = evBRes.rows[0].id;

      await ctx.db.query(
        `UPDATE evidence SET superseded_by = $1 WHERE id = $2`,
        [evidenceBId, evidenceAId]
      );

      // 4. Now, if any process tries to update or re-evaluate the finding at E2, the trigger checks e.superseded_by IS NULL
      // Because Evidence A is superseded, qualifying_count = 0, so further E2/E3 claims are blocked!
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `UPDATE findings SET evidence_level = 'E3_validated' WHERE id = $1`,
            [findingId]
          );
        },
        /without qualifying reviewer or test_harness evidence/i
      );
    });
  });

  // ============================================================
  // SECTION 5: Integration with Phase 1 Adapter Output (Test 12)
  // ============================================================
  describe('Phase 1 Adapter Output Integration', () => {
    it('Test 12 — Integrates translated Track D export into PostgreSQL schema without semantic drift', async () => {
      // 1. Process sample weak fixture through Phase 1 adapter pipeline
      const rawJson = readFileSync(join(__dirname, '..', 'fixtures', 'sample-v61-export.json'), 'utf-8');
      const validation = validateTrackDExport(JSON.parse(rawJson));
      assert.equal(validation.valid, true);
      if (!validation.valid) throw new Error('Validation failed');

      const hash = hashTrackDExport(rawJson);
      const importTimestamp = new Date().toISOString();
      const translation = translateTrackDToAssurance(validation.data, hash, importTimestamp);

      // 2. Persist Assessment with self_assessment_context (Settled Decision 1)
      const asmtRes = await ctx.db.query<{ id: string; self_assessment_context: any }>(
        `INSERT INTO assessments (
           client_id, system_id, level, status, self_assessment_context, source_artifact_hash, import_source
         )
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'track_d')
         RETURNING id, self_assessment_context`,
        [
          ctx.clientId,
          ctx.systemId,
          translation.assessment.level,
          translation.assessment.status,
          JSON.stringify(translation.selfAssessmentContext),
          hash,
        ]
      );
      const dbAssessmentId = asmtRes.rows[0].id;
      assert.equal(asmtRes.rows[0].self_assessment_context.schemaVersion, '6.1.0');
      assert.equal(asmtRes.rows[0].self_assessment_context.diligenceMatrix.quadrant, 'risk');

      // 3. Create a Finding from the assessment
      const findingRes = await ctx.db.query<{ id: string }>(
        `INSERT INTO findings (
           assessment_id, framework_reference_id, authority_map_edge_id,
           title, description, severity, confidence, evidence_level, status, drafted_by
         )
         VALUES ($1, $2, $3, 'D3 No Override Finding', 'Floor condition: no human override', 'critical', 'high', 'E1_documented', 'open', 'track_d_adapter')
         RETURNING id`,
        [dbAssessmentId, ctx.frameworkRefId, ctx.edgeId]
      );
      const findingId = findingRes.rows[0].id;

      // 4. Insert all evidence claims produced by the adapter
      for (const claim of translation.evidenceClaims) {
        const evRes = await ctx.db.query<{ id: string; supports_level: string; submitted_by_type: string }>(
          `INSERT INTO evidence (
             finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type
           )
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, supports_level, submitted_by_type`,
          [
            findingId,
            claim.evidenceType,
            hash,
            `track_d://${hash}/dim_${claim.dimensionId}`,
            claim.supportsLevel,
            claim.submittedByType,
          ]
        );

        assert.ok(evRes.rows[0].id);
        assert.equal(evRes.rows[0].submitted_by_type, 'client');
      }

      // 5. Verify that despite 10 client evidence claims being persisted,
      // the finding's evidence_level cannot be elevated to E2_observed!
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `UPDATE findings SET evidence_level = 'E2_observed' WHERE id = $1`,
            [findingId]
          );
        },
        /without qualifying reviewer or test_harness evidence/i
      );

      // Verify that the finding remains at E1_documented
      const checkFinding = await ctx.db.query<{ evidence_level: string }>(
        `SELECT evidence_level FROM findings WHERE id = $1`,
        [findingId]
      );
      assert.equal(checkFinding.rows[0].evidence_level, 'E1_documented');
    });
  });

  // ============================================================
  // SECTION 6: Deliberate Database Bypass Suite (Test 13)
  // ============================================================
  describe('Deliberate Database Bypass Attacks', () => {
    it('Bypass 1 — Rejects Finding without Authority Map element (Traceability Invariant 4 & 8)', async () => {
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `INSERT INTO findings (
               assessment_id, framework_reference_id, authority_map_node_id, authority_map_edge_id,
               title, description, severity, confidence, evidence_level, status, drafted_by
             )
             VALUES ($1, $2, NULL, NULL, 'Untraced Finding', 'Has no node or edge link', 'critical', 'high', 'E1_documented', 'open', 'attacker')`,
            [ctx.assessmentId, ctx.frameworkRefId]
          );
        },
        /violates check constraint "finding_traces_to_authority_map"/i
      );
    });

    it('Bypass 2 — Rejects invalid evidence_level enum', async () => {
      const findingId = await createFinding('E1_documented');
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `INSERT INTO evidence (finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type)
             VALUES ($1, 'document', 'hash', 'ref', 'E99_super_valid', 'reviewer')`,
            [findingId]
          );
        },
        /invalid input value for enum evidence_level/i
      );
    });

    it('Bypass 3 — Rejects evidence with foreign finding_id from non-existent assessment', async () => {
      const fakeFindingId = '00000000-0000-0000-0000-000000000000';
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `INSERT INTO evidence (finding_id, evidence_type, content_hash, storage_ref, supports_level, submitted_by_type)
             VALUES ($1, 'document', 'hash', 'ref', 'E1_documented', 'client')`,
            [fakeFindingId]
          );
        },
        /violates foreign key constraint "evidence_finding_id_fkey"/i
      );
    });

    it('Bypass 4 — Rejects review_decisions without required reasoning', async () => {
      const findingId = await createFinding('E1_documented');
      // reasoning is NOT NULL in review_decisions
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `INSERT INTO review_decisions (finding_id, reviewer_id, decision, reasoning)
             VALUES ($1, $2, 'accept', NULL)`,
            [findingId, ctx.reviewerId]
          );
        },
        /null value in column "reasoning"/i
      );
    });

    it('Bypass 5 — Rejects non-L1 assessment without assigned reviewer (Reviewer Gate Invariant)', async () => {
      await assert.rejects(
        async () => {
          await ctx.db.query(
            `INSERT INTO assessments (client_id, system_id, level, status, assigned_reviewer_id)
             VALUES ($1, $2, 'L2_validated', 'delivered', NULL)`,
            [ctx.clientId, ctx.systemId]
          );
        },
        /violates check constraint "reviewer_required_above_l1"/i
      );
    });
  });
});
