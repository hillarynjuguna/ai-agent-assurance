import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { 
  validateTrackDExport, 
  hashTrackDExport, 
  translateTrackDToAssurance,
  seedAuthorityMapFromTrackD,
  executeDeterministicRules,
  generateAssessmentFindings
} from "../../../../../../tools/track-d-governability-audit/adapter/src/index";
import { 
  saveAssuranceAssessment, 
  type StoredAssuranceAssessment 
} from "../../../../lib/assurance/store";

export async function POST(req: Request) {
  try {
    const rawText = await req.text();
    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "Request body cannot be empty" },
        { status: 400 }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : "Malformed JSON syntax";
      return NextResponse.json(
        { error: "Malformed JSON in request body", details: message },
        { status: 400 }
      );
    }

    // 1. Validate Track D v6.1 export schema
    const validation = validateTrackDExport(parsedJson);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // 2. Deterministic content hashing of the exact raw submission
    const sourceHash = hashTrackDExport(rawText);
    const receivedAt = new Date().toISOString();

    // 3. Translate validated export into Assurance MVP domain types
    const translatedResult = translateTrackDToAssurance(
      validation.data,
      sourceHash,
      receivedAt
    );

    // 4. Generate persistent assessment identifier (UUID v4)
    const assessmentId = crypto.randomUUID();

    // 5. Phase 3: Seed Authority Map conservatively strictly from exported data
    const authorityMap = seedAuthorityMapFromTrackD(
      validation.data,
      sourceHash,
      assessmentId
    );

    // 6. Phase 3: Execute deterministic rules against Authority Map structure
    const ruleExecution = executeDeterministicRules(
      authorityMap.edges,
      authorityMap.nodes
    );

    // 7. Phase 3: Generate traceable Assessment Findings
    const findings = generateAssessmentFindings(
      ruleExecution.findings,
      assessmentId
    );

    // 8. Persist record with raw submission, translated result, authority map, and findings
    const record: StoredAssuranceAssessment = {
      id: assessmentId,
      sourceHash,
      receivedAt,
      schemaVersion: validation.data.schemaVersion,
      rawSubmission: rawText,
      result: translatedResult,
      authorityMap,
      findings
    };

    await saveAssuranceAssessment(record);

    // 9. Return structured response adhering to response contract
    return NextResponse.json({
      assessment_id: assessmentId,
      assessment_level: translatedResult.assessment.level,
      status: translatedResult.assessment.status,
      source_hash: sourceHash,
      source_artifact_hash: sourceHash,
      floor_conditions: translatedResult.floorConditions,
      evidence_claim_count: translatedResult.evidenceClaims.length,
      findings_count: findings.length,
      findings,
      authority_map: {
        node_count: authorityMap.nodes.length,
        edge_count: authorityMap.edges.length,
      },
      received_at: receivedAt,
      schema_version: validation.data.schemaVersion,
      // camelCase aliases for client convenience
      assessmentId,
      assessmentLevel: translatedResult.assessment.level,
      sourceHash,
      floorConditions: translatedResult.floorConditions,
      evidenceClaimCount: translatedResult.evidenceClaims.length,
      findingsCount: findings.length,
      receivedAt,
      schemaVersion: validation.data.schemaVersion,
    });
  } catch (err: unknown) {
    console.error("[AssuranceIntakeAPI] Unhandled error during intake:", err);
    return NextResponse.json(
      { error: "Internal Server Error during assurance intake processing" },
      { status: 500 }
    );
  }
}
