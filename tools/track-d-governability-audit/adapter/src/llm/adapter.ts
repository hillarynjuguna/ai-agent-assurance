import type { SeededAuthorityMap } from '../authority-map-seed';
import type { SoftDimensionDraftBatch } from '../soft-dimensions';
import type { LlmArchitectureExtractionOutput, LlmFindingDraftOutput, LlmRunMetadata } from './types';

/**
 * LlmAdapter — the provider-agnostic interface for all LLM calls in Phase 5.
 *
 * This abstraction ensures:
 * 1. Tests can inject a fully deterministic mock without HTTP.
 * 2. Live providers (NVIDIA NIM / OpenAI-compatible, Anthropic, Gemini, Groq) are drop-in implementations.
 * 3. Run metadata is always recorded regardless of provider.
 */
export interface LlmAdapter {
  readonly modelProvider: string;
  readonly modelId: string;
  readonly promptVersion: string;

  /**
   * Extract candidate Authority Map nodes and edges from source material.
   * Must produce LlmArchitectureExtractionOutput conforming to the schema.
   */
  extractArchitecture(
    systemId: string,
    systemDescription: string,
    authorityMapSummary: string,
    existingMap: SeededAuthorityMap
  ): Promise<LlmArchitectureExtractionOutput>;

  /**
   * Draft candidate findings from soft dimensions.
   * Must produce LlmFindingDraftOutput conforming to the schema.
   * The LLM must not produce evidence_level above E1 — enforced by the
   * validation layer after this call, not by trusting the LLM.
   */
  draftFindings(
    systemSnapshotId: string,
    softDimensions: SoftDimensionDraftBatch,
    existingMap: SeededAuthorityMap,
    systemDescription: string,
    authorityMapSummary: string
  ): Promise<LlmFindingDraftOutput>;
}

/**
 * Base helper to generate run metadata. Called by all adapters.
 */
export function buildRunMetadata(
  adapter: LlmAdapter,
  systemSnapshotId: string,
  sourceHash: string,
  executedAt: string,
  durationMs: number,
  isSimulated: boolean
): LlmRunMetadata {
  return {
    runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    systemSnapshotId,
    sourceHash,
    modelProvider: adapter.modelProvider,
    modelId: adapter.modelId,
    promptVersion: adapter.promptVersion,
    executedAt,
    durationMs,
    isSimulated,
  };
}
