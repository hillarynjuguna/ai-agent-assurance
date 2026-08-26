import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const schemaRoot = join(process.cwd(), "..", "..", "..", "docs", "assurance-mvp-spec", "db");
const schema001 = readFileSync(join(schemaRoot, "001_init_schema.sql"), "utf8");
const schema002 = readFileSync(join(process.cwd(), "db", "002_track_d_intake.sql"), "utf8");
const schema003 = readFileSync(join(schemaRoot, "003_phase6_decision_layer.sql"), "utf8");

describe("Phase 6 canonical migration", () => {
  let db: PGlite;
  let assessmentId: string;
  let reviewerId: string;
  let findingId: string;
  let snapshotId: string;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(schema001);
    await db.exec(schema002);
    await db.exec(schema003);

    const client = await db.query<{ id: string }>(`INSERT INTO clients (name, contact_email) VALUES ('Phase 6 Test', 'phase6@example.com') RETURNING id`);
    const system = await db.query<{ id: string }>(`INSERT INTO systems (client_id, name) VALUES ($1, 'Test Agent') RETURNING id`, [client.rows[0].id]);
    const reviewer = await db.query<{ id: string }>(`INSERT INTO reviewers (name, role) VALUES ('Internal Validator', 'internal_validator') RETURNING id`);
    reviewerId = reviewer.rows[0].id;
    const assessment = await db.query<{ id: string }>(`INSERT INTO assessments (client_id, system_id, level, status, assigned_reviewer_id) VALUES ($1, $2, 'L2_validated', 'intake', $3) RETURNING id`, [client.rows[0].id, system.rows[0].id, reviewerId]);
    assessmentId = assessment.rows[0].id;
    const node = await db.query<{ id: string }>(`INSERT INTO authority_map_nodes (system_id, node_type, name) VALUES ($1, 'agent', 'Test Agent') RETURNING id`, [system.rows[0].id]);
    const framework = await db.query<{ id: string }>(`INSERT INTO framework_references (framework, reference_code, title, layer) VALUES ('OWASP_ASI', 'ASI01', 'Irreversible action', 'security_posture') RETURNING id`);
    const finding = await db.query<{ id: string }>(`INSERT INTO findings (assessment_id, framework_reference_id, authority_map_node_id, title, description, severity, confidence, evidence_level, drafted_by) VALUES ($1, $2, $3, 'Critical finding', 'A test finding', 'critical', 'moderate', 'E1_documented', 'test_harness') RETURNING id`, [assessmentId, framework.rows[0].id, node.rows[0].id]);
    findingId = finding.rows[0].id;
    snapshotId = "snapshot-test-001";
  });

  it("applies the Phase 6 tables and rejects report_ready until material findings have dispositions", async () => {
    await assert.rejects(
      () => db.query(`UPDATE assessments SET status = 'report_ready' WHERE id = $1`, [assessmentId]),
      /material finding/,
    );

    await db.query(`INSERT INTO phase6_reviewer_decisions (decision_version, assessment_id, finding_id, reviewer_id, reviewer_role, decision, disposition, evidence_snapshot_hash, reasoning, system_snapshot_id) VALUES (1, $1, $2, $3, 'internal_validator', 'accept', 'confirmed', 'hash', 'Reviewed against the snapshot.', $4)`, [assessmentId, findingId, reviewerId, snapshotId]);
    await db.query(`UPDATE assessments SET status = 'report_ready' WHERE id = $1`, [assessmentId]);
    const result = await db.query<{ status: string }>(`SELECT status FROM assessments WHERE id = $1`, [assessmentId]);
    assert.equal(result.rows[0].status, "report_ready");
  });

  it("enforces append-only attestation semantics and rejects cryptographic-signature claims", async () => {
    await assert.rejects(
      () => db.query(`INSERT INTO phase6_attestations (assessment_id, reviewer_id, reviewer_role, system_snapshot_id, report_version, report_hash, decision, scope, is_cryptographic_signature) VALUES ($1, $2, 'internal_validator', $3, 'phase6-v1', 'hash', 'attested', 'test scope', true)`, [assessmentId, reviewerId, snapshotId]),
      /is_cryptographic_signature|check constraint/,
    );

    await db.query(`INSERT INTO phase6_report_artifacts (assessment_id, system_snapshot_id, report_version, substantive_hash, report_hash, source_state_fingerprint, markdown) VALUES ($1, $2, 'phase6-v1', 'substantive', 'report', 'fingerprint', '# Report')`, [assessmentId, snapshotId]);
    await db.query(`INSERT INTO phase6_attestations (assessment_id, reviewer_id, reviewer_role, system_snapshot_id, report_version, report_hash, decision, scope) VALUES ($1, $2, 'internal_validator', $3, 'phase6-v1', 'report', 'attested_with_residual_risk', 'test scope')`, [assessmentId, reviewerId, snapshotId]);
    const count = await db.query<{ count: string }>(`SELECT count(*)::text AS count FROM phase6_attestations WHERE assessment_id = $1`, [assessmentId]);
    assert.equal(count.rows[0].count, "1");
  });
});
