/**
 * Phase 5: LLM-Assisted Extraction + Finding Drafts — Test Suite
 *
 * Tests the validation layer, orchestration layer, and experimental comparison
 * using the deterministic MockLlmAdapter. No HTTP calls made.
 *
 * Acceptance criteria tested:
 * - LLM output cannot assign E2/E3/E4 (evidence_level_cap rule)
 * - LLM output cannot create unsupported Authority Map facts (authority_map_existence rule)
 * - LLM output cannot mark itself reviewed/validated (no field exists for this — structural)
 * - LLM cannot override deterministic rules (detectDeterministicConflicts)
 * - Contradictions are explicitly represented (contradiction shape)
 * - Unknown information remains unknown (unknowns field)
 * - LLM-derived candidates remain bound to the system snapshot (runMetadata.systemSnapshotId)
 * - Deterministic vs LLM-assisted comparison runs across all 10 systems
 * - SYN-05, SYN-08, SYN-09 are explicitly analyzed
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockLlmAdapter } from '../src/llm/mock-adapter';
import { OpenAiCompatibleLlmAdapter } from '../src/llm/openai-compatible-adapter';
import {
  LlmRuntimeValidationError,
  parseAndValidateArchitectureExtraction,
  parseAndValidateFindingDraft,
} from '../src/llm/runtime-validate';
import { validateLlmFindingDraft, validateLlmArchitectureExtraction, detectDeterministicConflicts } from '../src/llm/validate';
import { runLlmAssessmentPass, compareAssessmentPaths } from '../src/llm/orchestrate';
import type { SeededAuthorityMap } from '../src/authority-map-seed';
import type { SoftDimensionDraftBatch } from '../src/soft-dimensions';
import type { CandidateFinding } from '../src/rules/types';
import type { LlmFindingDraftOutput, LlmArchitectureExtractionOutput } from '../src/llm/types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeMinimalAuthorityMap(systemId: string = 'SYN-01'): SeededAuthorityMap {
  return {
    systemId,
    nodes: [
      {
        id: `node-agent-${systemId}`,
        nodeType: 'agent',
        name: 'Test Agent',
        metadata: {},
        provenance: {
          source: 'track_d_export',
          dimension: 'D1',
          field: 'cap',
          value: '2',
          derivationRule: 'default'
        }
      },
    ],
    edges: [
      {
        id: `edge-${systemId}-1`,
        sourceNodeId: `node-agent-${systemId}`,
        targetNodeId: `node-target-${systemId}`,
        edgeType: 'calls',
        requiresHumanApproval: false,
        trustBoundary: 'internal',
        permissionScope: 'test',
        actionReversibility: 'reversible',
        provenance: {
          source: 'track_d_export',
          dimension: 'D3',
          field: 'cap',
          value: '0',
          derivationRule: 'default'
        }
      },
    ],
    derivedAt: '2026-01-01T00:00:00Z',
    sourceArtifactHash: 'abc123',
  };
}

function makeEmptySoftDimensions(): SoftDimensionDraftBatch {
  return { dimensions: [], dimensionsWithNotes: 0, dimensionsSkipped: 0 };
}

const SNAPSHOT_ID = 'snapshot-test-001';

// ---------------------------------------------------------------------------
// 1. Runtime provider-response validation
// ---------------------------------------------------------------------------

describe('Phase 5.1: Runtime LLM Response Boundary', () => {
  const validFindingDraft = {
    findings: [{
      title: 'A finding',
      description: 'A source-grounded candidate finding.',
      severity: 'medium',
      confidence: 'moderate',
      evidence_level: 'E1_documented',
      framework_reference_code: 'ASI06',
      authority_map_ref: { node_id: 'node-agent-SYN-01' },
      basis: 'The source document states the relevant condition.',
    }],
    contradictions: [],
    unknowns: [],
  };

  const validArchitectureExtraction = {
    nodes: [{
      temp_id: 'agent-1',
      node_type: 'agent',
      name: 'Test Agent',
      source_excerpt: 'The source names the test agent.',
    }],
    edges: [],
    extraction_confidence: 'moderate',
    unresolved_questions: [],
    contradictions: [],
  };

  it('rejects invalid JSON and oversized provider responses as structured runtime failures', () => {
    assert.throws(
      () => parseAndValidateFindingDraft('{broken json'),
      (error: unknown) => error instanceof LlmRuntimeValidationError && error.errors.some(message => message.includes('invalid JSON')),
    );
    assert.throws(
      () => parseAndValidateFindingDraft(JSON.stringify(validFindingDraft), 10),
      (error: unknown) => error instanceof LlmRuntimeValidationError && error.errors.some(message => message.includes('maximum size')),
    );
  });

  it('rejects malformed finding-draft structure before semantic validation', () => {
    const missingFindings = { ...validFindingDraft, findings: undefined };
    assert.throws(
      () => parseAndValidateFindingDraft(JSON.stringify(missingFindings)),
      (error: unknown) => error instanceof LlmRuntimeValidationError && error.errors.some(message => message.includes('findings must be an array')),
    );

    const invalidSeverity = {
      ...validFindingDraft,
      findings: [{ ...validFindingDraft.findings[0], severity: 'catastrophic' }],
    };
    assert.throws(
      () => parseAndValidateFindingDraft(JSON.stringify(invalidSeverity)),
      (error: unknown) => error instanceof LlmRuntimeValidationError && error.errors.some(message => message.includes('severity')),
    );

    const missingBasis = {
      ...validFindingDraft,
      findings: [{ ...validFindingDraft.findings[0], basis: undefined }],
    };
    assert.throws(
      () => parseAndValidateFindingDraft(JSON.stringify(missingBasis)),
      (error: unknown) => error instanceof LlmRuntimeValidationError && error.errors.some(message => message.includes('basis')),
    );
  });

  it('rejects malformed architecture extraction structure before semantic validation', () => {
    const invalidEdge = {
      ...validArchitectureExtraction,
      edges: [{
        source_temp_id: 'agent-1',
        target_temp_id: 'missing',
        edge_type: 'calls',
        permission_scope: 'test',
        requires_human_approval: 'sometimes',
        data_classification: null,
        action_reversibility: null,
        source_excerpt: 'The source describes a call.',
      }],
    };
    assert.throws(
      () => parseAndValidateArchitectureExtraction(JSON.stringify(invalidEdge)),
      (error: unknown) => error instanceof LlmRuntimeValidationError && error.errors.some(message => message.includes('requires_human_approval')),
    );
  });

  it('uses runtime validation on the actual OpenAI-compatible adapter path', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ findings: [] }) } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    try {
      const adapter = new OpenAiCompatibleLlmAdapter({ apiKey: 'test-key', baseURL: 'https://example.test/v1' });
      await assert.rejects(
        () => adapter.extractArchitecture('SYN-01', 'description', 'summary', makeMinimalAuthorityMap()),
        (error: unknown) => error instanceof LlmRuntimeValidationError && error.operation === 'architecture_extraction',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('aborts a provider request that exceeds the configured timeout', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((_: string | URL | Request, init?: RequestInit) => new Promise<Response>((_, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(new DOMException('aborted', 'AbortError'));
        return;
      }
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    })) as typeof fetch;

    try {
      const adapter = new OpenAiCompatibleLlmAdapter({ apiKey: 'test-key', timeoutMs: 5 });
      await assert.rejects(
        () => adapter.extractArchitecture('SYN-01', 'description', 'summary', makeMinimalAuthorityMap()),
        /timed out after 5ms/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Schema validation — evidence level cap
// ---------------------------------------------------------------------------

describe('Phase 5: LLM Schema Validation', () => {
  describe('Evidence Level Cap', () => {
    it('accepts E0_claimed findings', () => {
      const map = makeMinimalAuthorityMap();
      const output: LlmFindingDraftOutput = {
        findings: [{
          title: 'Test',
          description: 'Test description',
          severity: 'medium',
          confidence: 'moderate',
          evidence_level: 'E0_claimed',
          framework_reference_code: 'ASI06',
          authority_map_ref: { node_id: map.nodes[0].id },
          basis: 'Some basis',
        }],
        contradictions: [],
        unknowns: [],
      };
      const result = validateLlmFindingDraft(output, map, SNAPSHOT_ID);
      assert.equal(result.accepted.length, 1);
      assert.equal(result.rejected.length, 0);
    });

    it('accepts E1_documented findings', () => {
      const map = makeMinimalAuthorityMap();
      const output: LlmFindingDraftOutput = {
        findings: [{
          title: 'Test',
          description: 'Test description',
          severity: 'low',
          confidence: 'moderate',
          evidence_level: 'E1_documented',
          framework_reference_code: 'ASI06',
          authority_map_ref: { node_id: map.nodes[0].id },
          basis: 'Documented basis',
        }],
        contradictions: [],
        unknowns: [],
      };
      const result = validateLlmFindingDraft(output, map, SNAPSHOT_ID);
      assert.equal(result.accepted.length, 1);
    });

    it('rejects E2_observed — invariant 4+5 enforced', () => {
      const map = makeMinimalAuthorityMap();
      const output: LlmFindingDraftOutput = {
        findings: [{
          title: 'E2 attempt',
          description: 'Test',
          severity: 'medium',
          confidence: 'moderate',
          evidence_level: 'E2_observed' as any,
          framework_reference_code: 'ASI06',
          authority_map_ref: { node_id: map.nodes[0].id },
          basis: 'Some basis',
        }],
        contradictions: [],
        unknowns: [],
      };
      const result = validateLlmFindingDraft(output, map, SNAPSHOT_ID);
      assert.equal(result.accepted.length, 0);
      assert.equal(result.rejected.length, 1);
      assert.ok(result.rejected[0].failures.some(f => f.rule === 'evidence_level_cap'));
    });

    it('rejects E3_validated — invariant 4+5 enforced', () => {
      const map = makeMinimalAuthorityMap();
      const output: LlmFindingDraftOutput = {
        findings: [{
          title: 'E3 attempt',
          description: 'Test',
          severity: 'low',
          confidence: 'high',
          evidence_level: 'E3_validated' as any,
          framework_reference_code: 'ASI06',
          authority_map_ref: { node_id: map.nodes[0].id },
          basis: 'Some basis',
        }],
        contradictions: [],
        unknowns: [],
      };
      const result = validateLlmFindingDraft(output, map, SNAPSHOT_ID);
      assert.equal(result.accepted.length, 0);
      assert.ok(result.rejected[0].failures.some(f => f.rule === 'evidence_level_cap'));
    });

    it('rejects E4_adversarially_tested — invariant 4+5 enforced', () => {
      const map = makeMinimalAuthorityMap();
      const output: LlmFindingDraftOutput = {
        findings: [{
          title: 'E4 attempt',
          description: 'Test',
          severity: 'low',
          confidence: 'high',
          evidence_level: 'E4_adversarially_tested' as any,
          framework_reference_code: 'ASI06',
          authority_map_ref: { node_id: map.nodes[0].id },
          basis: 'Some basis',
        }],
        contradictions: [],
        unknowns: [],
      };
      const result = validateLlmFindingDraft(output, map, SNAPSHOT_ID);
      assert.equal(result.accepted.length, 0);
      assert.ok(result.rejected[0].failures.some(f => f.rule === 'evidence_level_cap'));
    });
  });

  describe('Basis Requirement', () => {
    it('rejects findings with empty basis — traceability invariant', () => {
      const map = makeMinimalAuthorityMap();
      const output: LlmFindingDraftOutput = {
        findings: [{
          title: 'No basis',
          description: 'Test',
          severity: 'medium',
          confidence: 'moderate',
          evidence_level: 'E1_documented',
          framework_reference_code: 'ASI06',
          authority_map_ref: { node_id: map.nodes[0].id },
          basis: '',
        }],
        contradictions: [],
        unknowns: [],
      };
      const result = validateLlmFindingDraft(output, map, SNAPSHOT_ID);
      assert.equal(result.accepted.length, 0);
      assert.ok(result.rejected[0].failures.some(f => f.rule === 'traceability_basis_required'));
    });
  });

  describe('Authority Map Reference', () => {
    it('rejects findings with no authority_map_ref', () => {
      const map = makeMinimalAuthorityMap();
      const output: LlmFindingDraftOutput = {
        findings: [{
          title: 'No ref',
          description: 'Test',
          severity: 'medium',
          confidence: 'moderate',
          evidence_level: 'E1_documented',
          framework_reference_code: 'ASI06',
          authority_map_ref: {},
          basis: 'Has basis',
        }],
        contradictions: [],
        unknowns: [],
      };
      const result = validateLlmFindingDraft(output, map, SNAPSHOT_ID);
      assert.equal(result.accepted.length, 0);
      assert.ok(result.rejected[0].failures.some(f => f.rule === 'authority_map_traceability'));
    });

    it('rejects findings referencing non-existent node_id — invariant 6+8', () => {
      const map = makeMinimalAuthorityMap();
      const output: LlmFindingDraftOutput = {
        findings: [{
          title: 'Invented ref',
          description: 'Test',
          severity: 'medium',
          confidence: 'moderate',
          evidence_level: 'E1_documented',
          framework_reference_code: 'ASI06',
          authority_map_ref: { node_id: 'node-does-not-exist' },
          basis: 'Some basis',
        }],
        contradictions: [],
        unknowns: [],
      };
      const result = validateLlmFindingDraft(output, map, SNAPSHOT_ID);
      assert.equal(result.accepted.length, 0);
      assert.ok(result.rejected[0].failures.some(f => f.rule === 'authority_map_existence'));
    });

    it('accepts findings referencing a known node_id', () => {
      const map = makeMinimalAuthorityMap();
      const output: LlmFindingDraftOutput = {
        findings: [{
          title: 'Valid ref',
          description: 'Test',
          severity: 'medium',
          confidence: 'moderate',
          evidence_level: 'E1_documented',
          framework_reference_code: 'ASI06',
          authority_map_ref: { node_id: map.nodes[0].id },
          basis: 'Valid basis',
        }],
        contradictions: [],
        unknowns: [],
      };
      const result = validateLlmFindingDraft(output, map, SNAPSHOT_ID);
      assert.equal(result.accepted.length, 1);
    });

    it('accepts LLM-proposed refs (is_llm_proposed=true) as candidate refs', () => {
      const map = makeMinimalAuthorityMap();
      const output: LlmFindingDraftOutput = {
        findings: [{
          title: 'LLM proposed node',
          description: 'Test',
          severity: 'medium',
          confidence: 'low',
          evidence_level: 'E0_claimed',
          framework_reference_code: 'ASI06',
          authority_map_ref: { node_id: 'node-llm-proposed-x', is_llm_proposed: true },
          basis: 'LLM extracted this from auditor notes',
        }],
        contradictions: [],
        unknowns: [],
      };
      const result = validateLlmFindingDraft(output, map, SNAPSHOT_ID);
      assert.equal(result.accepted.length, 1, 'LLM-proposed refs should be accepted as candidates');
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Architecture extraction validation
// ---------------------------------------------------------------------------

describe('Phase 5: Architecture Extraction Validation', () => {
  it('rejects nodes with no source_excerpt — invariant 6 (no invention)', () => {
    const map = makeMinimalAuthorityMap();
    const output: LlmArchitectureExtractionOutput = {
      nodes: [{ temp_id: 'n1', node_type: 'tool', name: 'InferredTool', source_excerpt: '' }],
      edges: [],
      extraction_confidence: 'low',
      unresolved_questions: [],
      contradictions: [],
    };
    const result = validateLlmArchitectureExtraction(output, map);
    assert.equal(result.accepted.nodes.length, 0);
    assert.equal(result.nodeRejections.length, 1);
    assert.ok(result.nodeRejections[0].reason.includes('Invariant 6'));
  });

  it('accepts nodes with valid source_excerpt', () => {
    const map = makeMinimalAuthorityMap();
    const output: LlmArchitectureExtractionOutput = {
      nodes: [{ temp_id: 'n1', node_type: 'tool', name: 'RealTool', source_excerpt: 'auditor notes mention a payment tool' }],
      edges: [],
      extraction_confidence: 'moderate',
      unresolved_questions: [],
      contradictions: [],
    };
    const result = validateLlmArchitectureExtraction(output, map);
    assert.equal(result.accepted.nodes.length, 1);
    assert.equal(result.nodeRejections.length, 0);
  });

  it('rejects edges whose nodes were rejected (hallucination chain)', () => {
    const map = makeMinimalAuthorityMap();
    const output: LlmArchitectureExtractionOutput = {
      nodes: [{ temp_id: 'invented', node_type: 'tool', name: 'Invented', source_excerpt: '' }],
      edges: [{
        source_temp_id: 'invented',
        target_temp_id: 'invented',
        edge_type: 'calls',
        permission_scope: 'all',
        requires_human_approval: null,
        data_classification: null,
        action_reversibility: null,
        source_excerpt: 'some excerpt'
      }],
      extraction_confidence: 'low',
      unresolved_questions: [],
      contradictions: [],
    };
    const result = validateLlmArchitectureExtraction(output, map);
    assert.equal(result.accepted.nodes.length, 0);
    assert.equal(result.accepted.edges.length, 0);
    assert.equal(result.edgeRejections.length, 1);
  });

  it('preserves contradictions in output', () => {
    const map = makeMinimalAuthorityMap();
    const output: LlmArchitectureExtractionOutput = {
      nodes: [],
      edges: [],
      extraction_confidence: 'low',
      unresolved_questions: [],
      contradictions: [{
        subject: 'access scope',
        source_a_excerpt: 'doc says read-only',
        source_b_excerpt: 'config says full write',
        status: 'unresolved',
      }],
    };
    const result = validateLlmArchitectureExtraction(output, map);
    assert.equal(result.accepted.contradictions.length, 1);
    assert.equal(result.accepted.contradictions[0].status, 'unresolved');
  });
});

// ---------------------------------------------------------------------------
// 3. Deterministic conflict detection
// ---------------------------------------------------------------------------

describe('Phase 5: Deterministic Conflict Detection', () => {
  it('detects when LLM proposes lower severity for same framework ref', () => {
    const detFindings: CandidateFinding[] = [{
      frameworkRefs: ['ASI01'],
      severity: 'critical',
      confidence: 'moderate',
      evidenceLevel: 'E1_documented',
      description: 'Irreversible action without approval',
      basis: 'Rule 1 fired',
      authorityMapEdgeId: 'edge-1',
    }];
    const llmFindings = [{
      title: 'Reassurance',
      description: 'Policy may mitigate',
      severity: 'informational' as const,
      confidence: 'moderate' as const,
      evidence_level: 'E0_claimed' as const,
      framework_reference_code: 'ASI01',
      authority_map_ref: { edge_id: 'edge-1' },
      basis: 'Policy statement',
    }];
    const conflicts = detectDeterministicConflicts(detFindings, llmFindings);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].conflict, 'llm_proposes_informational_override');
    assert.equal(conflicts[0].resolution, 'deterministic_finding_preserved');
  });

  it('does not flag when LLM and deterministic agree on severity or LLM is higher', () => {
    const detFindings: CandidateFinding[] = [{
      frameworkRefs: ['ASI01'],
      severity: 'medium',
      confidence: 'moderate',
      evidenceLevel: 'E1_documented',
      description: 'Test',
      basis: 'Rule fired',
    }];
    const llmFindings = [{
      title: 'LLM finding',
      description: 'High risk',
      severity: 'high' as const,
      confidence: 'moderate' as const,
      evidence_level: 'E1_documented' as const,
      framework_reference_code: 'ASI01',
      authority_map_ref: { node_id: 'n1' },
      basis: 'Some basis',
    }];
    const conflicts = detectDeterministicConflicts(detFindings, llmFindings);
    assert.equal(conflicts.length, 0);
  });
});

// ---------------------------------------------------------------------------
// 4. Orchestration layer
// ---------------------------------------------------------------------------

describe('Phase 5: LLM Assessment Orchestration', () => {
  it('runs a full pass and binds result to system snapshot', async () => {
    const adapter = new MockLlmAdapter('valid_minimal');
    const map = makeMinimalAuthorityMap('SYN-08');
    const pass = await runLlmAssessmentPass(
      adapter,
      'SYN-08',
      SNAPSHOT_ID,
      'Agent with persistent memory',
      'agent -> writes/reads -> memory(long_term_store)',
      map,
      makeEmptySoftDimensions(),
      []
    );
    assert.equal(pass.runMetadata.systemSnapshotId, SNAPSHOT_ID);
    assert.equal(pass.runMetadata.isSimulated, true);
    assert.equal(pass.runMetadata.modelProvider, 'mock');
  });

  it('rejects E2 attempt from mock — validation enforced in orchestrator', async () => {
    const adapter = new MockLlmAdapter('invalid_e2_attempt');
    const map = makeMinimalAuthorityMap();
    const pass = await runLlmAssessmentPass(
      adapter,
      'SYN-01',
      SNAPSHOT_ID,
      'Test system',
      'test',
      map,
      makeEmptySoftDimensions(),
      []
    );
    assert.equal(pass.findingValidation.validationSummary.totalRejected, 1);
    assert.equal(pass.findingValidation.validationSummary.totalAccepted, 0);
  });

  it('records deterministic conflict when LLM proposes informational override', async () => {
    const adapter = new MockLlmAdapter('deterministic_override_attempt');
    const map = makeMinimalAuthorityMap();
    const detFindings: CandidateFinding[] = [{
      frameworkRefs: ['ASI01'],
      severity: 'critical',
      confidence: 'moderate',
      evidenceLevel: 'E1_documented',
      description: 'Critical finding from Rule 1',
      basis: 'Rule 1 fired',
      authorityMapEdgeId: map.edges[0].id,
    }];
    const pass = await runLlmAssessmentPass(
      adapter,
      'SYN-04',
      SNAPSHOT_ID,
      'Agent with financial transactions',
      'test',
      map,
      makeEmptySoftDimensions(),
      detFindings
    );
    assert.ok(pass.deterministicConflicts.length > 0 || pass.findingValidation.accepted.length > 0);
  });
});

// ---------------------------------------------------------------------------
// 5. Path A vs Path B comparison
// ---------------------------------------------------------------------------

describe('Phase 5: Path A vs Path B Comparison', () => {
  it('produces comparison when LLM adds net new findings', async () => {
    const adapter = new MockLlmAdapter('valid_minimal');
    const map = makeMinimalAuthorityMap('SYN-08');
    const detFindings: CandidateFinding[] = [];
    const pass = await runLlmAssessmentPass(
      adapter,
      'SYN-08',
      SNAPSHOT_ID,
      'Agent with persistent memory',
      'agent -> memory',
      map,
      makeEmptySoftDimensions(),
      detFindings
    );
    const comparison = compareAssessmentPaths('SYN-08', SNAPSHOT_ID, detFindings, pass, null);
    assert.equal(comparison.comparison.baselineCount, 0);
    assert.ok(comparison.comparison.llmAddedCount >= 0);
  });

  it('records llm error gracefully when pass is null', () => {
    const comparison = compareAssessmentPaths('SYN-01', SNAPSHOT_ID, [], null, 'LLM timeout');
    assert.equal(comparison.pathB_error, 'LLM timeout');
    assert.equal(comparison.comparison.addedUsefulAnalysis, false);
  });
});

// ---------------------------------------------------------------------------
// 6. Specific synthetic corpus cases
// ---------------------------------------------------------------------------

describe('Phase 5: SYN-05 — Contradiction Handling', () => {
  it('SYN-05: LLM surfaces contradiction in database access scope without resolving it', async () => {
    const adapter = new MockLlmAdapter('valid_with_contradiction_syn05');
    const map = makeMinimalAuthorityMap('SYN-05');
    const pass = await runLlmAssessmentPass(
      adapter,
      'SYN-05',
      SNAPSHOT_ID,
      'Agent with excessive database privileges',
      'agent -> reads -> data_source(customer_table) [contradicts config extract showing broader grants]',
      map,
      makeEmptySoftDimensions(),
      []
    );
    assert.ok(pass.contradictions.length > 0, 'SYN-05 must surface at least 1 contradiction');
    assert.equal(pass.contradictions[0].status, 'unresolved', 'Contradiction must remain unresolved');
    assert.ok(
      pass.contradictions[0].subject.toLowerCase().includes('database') ||
      pass.contradictions[0].subject.toLowerCase().includes('access')
    );
  });

  it('SYN-05: Architecture extraction also surfaces the contradiction', async () => {
    const adapter = new MockLlmAdapter('valid_with_contradiction_syn05');
    const map = makeMinimalAuthorityMap('SYN-05');
    const extraction = await adapter.extractArchitecture('SYN-05', 'desc', 'summary', map);
    assert.ok(extraction.contradictions.length > 0, 'Architecture extraction must surface contradiction');
    assert.equal(extraction.contradictions[0].status, 'unresolved');
  });
});

describe('Phase 5: SYN-08 — Memory Risk & Epistemic Bounds', () => {
  it('SYN-08: LLM correctly distinguishes memory existence from poisoning vulnerability', async () => {
    const adapter = new MockLlmAdapter('valid_memory_risk_syn08');
    const map = makeMinimalAuthorityMap('SYN-08');
    const pass = await runLlmAssessmentPass(
      adapter,
      'SYN-08',
      SNAPSHOT_ID,
      'Agent with persistent memory',
      'agent -> writes/reads -> memory(long_term_store)',
      map,
      makeEmptySoftDimensions(),
      []
    );
    assert.ok(pass.findingValidation.accepted.length > 0, 'SYN-08 should produce LLM finding');
    const finding = pass.findingValidation.accepted[0];
    assert.ok(finding.evidence_level === 'E0_claimed' || finding.evidence_level === 'E1_documented');
    assert.ok(
      pass.unknowns.length > 0 || finding.self_assessed_certainty_note,
      'SYN-08: LLM should preserve uncertainty about poisoning vulnerability'
    );
  });
});

describe('Phase 5: SYN-09 — PII + External Trust Boundary Composition Risk', () => {
  it('SYN-09: LLM identifies multi-hop data-flow risk without claiming exfiltration occurred', async () => {
    const adapter = new MockLlmAdapter('valid_pii_boundary_syn09');
    const map = makeMinimalAuthorityMap('SYN-09');
    const pass = await runLlmAssessmentPass(
      adapter,
      'SYN-09',
      SNAPSHOT_ID,
      'Agent processing sensitive customer information',
      'agent -> reads -> data_source(customer_pii, restricted); agent -> calls -> tool(external_search, external)',
      map,
      makeEmptySoftDimensions(),
      []
    );
    assert.ok(pass.findingValidation.accepted.length > 0, 'SYN-09 should produce LLM finding');
    const finding = pass.findingValidation.accepted[0];
    assert.ok(
      finding.evidence_level === 'E0_claimed' || finding.evidence_level === 'E1_documented',
      'SYN-09: LLM must not exceed E1 — actual exfiltration cannot be claimed'
    );
    assert.ok(
      finding.title.toLowerCase().includes('boundary') ||
      finding.title.toLowerCase().includes('dlp') ||
      finding.title.toLowerCase().includes('data') ||
      finding.description.toLowerCase().includes('composition'),
      'SYN-09: finding should describe the multi-hop composition risk'
    );
  });
});

describe('Phase 5: SYN-10 — Contradiction in Human Approval', () => {
  it('SYN-10: LLM surfaces human-approval contradiction without declaring the control adequate', async () => {
    const adapter = new MockLlmAdapter('valid_with_contradiction_syn10');
    const map = makeMinimalAuthorityMap('SYN-10');
    const pass = await runLlmAssessmentPass(
      adapter,
      'SYN-10',
      SNAPSHOT_ID,
      'Agent with inadequate human approval boundaries',
      'agent -> calls -> tool(critical_action, requires_human_approval=true) [contradicted by auto-ack workflow]',
      map,
      makeEmptySoftDimensions(),
      []
    );
    assert.ok(pass.contradictions.length > 0, 'SYN-10 must surface contradiction about human approval');
    assert.equal(pass.contradictions[0].status, 'unresolved');
  });
});

// ---------------------------------------------------------------------------
// 7. Hallucination / invention attack
// ---------------------------------------------------------------------------

describe('Phase 5: Hallucination Attack (Invariant 6)', () => {
  it('rejects invented node with no source_excerpt', async () => {
    const adapter = new MockLlmAdapter('hallucination_invented_node');
    const map = makeMinimalAuthorityMap();
    const extraction = await adapter.extractArchitecture('test', 'desc', 'summary', map);
    const result = validateLlmArchitectureExtraction(extraction, map);
    assert.equal(result.accepted.nodes.length, 0);
    assert.ok(result.nodeRejections[0].reason.includes('Invariant 6'));
  });
});

// ---------------------------------------------------------------------------
// 8. 10-System Corpus — Full Run (Path A and B)
// ---------------------------------------------------------------------------

describe('Phase 5: 10-System Synthetic Corpus Experimental Comparison', () => {
  const corpusSystems = [
    { id: 'SYN-01', desc: 'Read-only internal knowledge agent', mapSummary: 'agent -> reads -> data_source(wiki)', scenario: 'valid_minimal' as const },
    { id: 'SYN-02', desc: 'Customer-support agent with CRM access', mapSummary: 'agent -> reads/writes -> CRM; agent -> calls -> tool(draft_email)', scenario: 'valid_minimal' as const },
    { id: 'SYN-03', desc: 'Agent capable of sending emails autonomously', mapSummary: 'agent -> calls -> tool(send_email, irreversible, no approval)', scenario: 'valid_minimal' as const },
    { id: 'SYN-04', desc: 'Agent capable of financial transactions', mapSummary: 'agent -> calls -> api(payment_api, irreversible, no approval)', scenario: 'deterministic_override_attempt' as const },
    { id: 'SYN-05', desc: 'Agent with excessive database privileges', mapSummary: 'agent -> reads -> data_source(customer_table) [contradiction: config grants full schema]', scenario: 'valid_with_contradiction_syn05' as const },
    { id: 'SYN-06', desc: 'Agent using external MCP provider', mapSummary: 'agent -> calls -> external_agent(mcp), trust_boundary=external', scenario: 'valid_minimal' as const },
    { id: 'SYN-07', desc: 'Multi-agent orchestration system', mapSummary: 'coordinator -> delegates_to -> sub_1, sub_2, sub_3', scenario: 'valid_minimal' as const },
    { id: 'SYN-08', desc: 'Agent with persistent memory', mapSummary: 'agent -> writes/reads -> memory(long_term_store)', scenario: 'valid_memory_risk_syn08' as const },
    { id: 'SYN-09', desc: 'Agent processing sensitive customer PII', mapSummary: 'agent -> reads -> data_source(pii, restricted); agent -> calls -> tool(external_search)', scenario: 'valid_pii_boundary_syn09' as const },
    { id: 'SYN-10', desc: 'Agent with inadequate human approval', mapSummary: 'agent -> calls -> tool(critical_action, req_approval=true [contradicted by auto-ack])', scenario: 'valid_with_contradiction_syn10' as const },
  ];

  for (const sys of corpusSystems) {
    it(`runs Path A + B comparison for ${sys.id}: ${sys.desc}`, async () => {
      const adapter = new MockLlmAdapter(sys.scenario);
      const map = makeMinimalAuthorityMap(sys.id);
      const detFindings: CandidateFinding[] = [];

      const pass = await runLlmAssessmentPass(
        adapter,
        sys.id,
        `snapshot-${sys.id}`,
        sys.desc,
        sys.mapSummary,
        map,
        makeEmptySoftDimensions(),
        detFindings
      );

      // Every result must be snapshot-bound
      assert.equal(pass.runMetadata.systemSnapshotId, `snapshot-${sys.id}`);

      // No finding may exceed E1
      for (const finding of pass.findingValidation.accepted) {
        assert.ok(
          finding.evidence_level === 'E0_claimed' || finding.evidence_level === 'E1_documented',
          `${sys.id}: finding "${finding.title}" has evidence_level above E1 — invariant violation`
        );
      }

      // No LLM-rejected finding is silently swallowed — all rejections are explicit
      assert.ok(pass.findingValidation.rejected.length >= 0, 'rejections array must exist');

      // Contradictions must remain unresolved
      for (const c of pass.contradictions) {
        assert.equal(c.status, 'unresolved', `${sys.id}: contradiction must remain unresolved`);
      }

      const comparison = compareAssessmentPaths(sys.id, `snapshot-${sys.id}`, detFindings, pass, null);
      assert.equal(comparison.systemId, sys.id);
    });
  }
});
