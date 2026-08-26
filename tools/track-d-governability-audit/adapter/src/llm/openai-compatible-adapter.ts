import type { LlmArchitectureExtractionOutput, LlmFindingDraftOutput } from './types';
import type { LlmAdapter } from './adapter';
import type { SeededAuthorityMap } from '../authority-map-seed';
import type { SoftDimensionDraftBatch } from '../soft-dimensions';
import {
  parseAndValidateArchitectureExtraction,
  parseAndValidateFindingDraft,
} from './runtime-validate';

export interface OpenAiCompatibleAdapterConfig {
  apiKey?: string;
  baseURL?: string; // e.g. "https://integrate.api.nvidia.com/v1" or "https://openrouter.ai/api/v1"
  model?: string;   // e.g. "meta/llama-3.3-70b-instruct" or "deepseek-ai/deepseek-r1"
  promptVersion?: string;
  timeoutMs?: number;
  maxRequestChars?: number;
  maxResponseChars?: number;
}

/**
 * Real LLM adapter communicating with any OpenAI-compatible API endpoint
 * (NVIDIA NIM / API, OpenRouter, Groq, local vLLM, etc.).
 *
 * It enforces JSON mode and returns typed structured payloads ready
 * for deterministic post-call validation.
 */
export class OpenAiCompatibleLlmAdapter implements LlmAdapter {
  readonly modelProvider: string;
  readonly modelId: string;
  readonly promptVersion: string;
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly timeoutMs: number;
  private readonly maxRequestChars: number;
  private readonly maxResponseChars: number;

  constructor(config: OpenAiCompatibleAdapterConfig = {}) {
    this.apiKey = config.apiKey || process.env.NVIDIA_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || '';
    this.baseURL = config.baseURL || process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    this.modelId = config.model || process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct';
    this.modelProvider = this.baseURL.includes('nvidia') ? 'nvidia' : 'openai-compatible';
    this.promptVersion = config.promptVersion || 'phase5-v1';
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxRequestChars = config.maxRequestChars ?? 100_000;
    this.maxResponseChars = config.maxResponseChars ?? 100_000;
  }

  private async callChatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error(`API key is required for ${this.modelProvider} LLM adapter. Set NVIDIA_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY.`);
    }

    if (systemPrompt.length + userPrompt.length > this.maxRequestChars) {
      throw new Error(`LLM request prompt exceeds maximum size of ${this.maxRequestChars} characters.`);
    }

    const url = `${this.baseURL.replace(/\/$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = (await response.text()).slice(0, 2_000);
        throw new Error(`LLM API request failed (${response.status} ${response.statusText}): ${errorText}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('LLM returned an empty response or invalid choices structure.');
      }

      return content;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`LLM API request timed out after ${this.timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async extractArchitecture(
    systemId: string,
    systemDescription: string,
    authorityMapSummary: string,
    _existingMap: SeededAuthorityMap
  ): Promise<LlmArchitectureExtractionOutput> {
    const systemPrompt = `You are an AI governance architecture extractor.
Turn source material into candidate Authority Map nodes and edges conforming to the architecture-extraction schema.
STRICT INVARIANTS:
1. Every node MUST have a non-empty "source_excerpt" quoting the exact source text. Do NOT invent nodes.
2. If evidence is missing, do NOT infer safety. Set fields to null or record in "unresolved_questions".
3. If source materials disagree, record the disagreement in "contradictions" with status: "unresolved". Do NOT resolve contradictions.
4. Output valid JSON matching:
{
  "nodes": [{ "temp_id": string, "node_type": "agent"|"model"|"memory"|"tool"|"api"|"data_source"|"external_agent"|"identity", "name": string, "identity"?: string, "source_excerpt": string }],
  "edges": [{ "source_temp_id": string, "target_temp_id": string, "edge_type": "reads"|"writes"|"calls"|"delegates_to"|"authenticates_as", "permission_scope": string, "requires_human_approval": boolean|null, "data_classification": "public"|"internal"|"confidential"|"restricted"|null, "action_reversibility": "reversible"|"partially_reversible"|"irreversible"|null, "source_excerpt": string }],
  "extraction_confidence": "low"|"moderate"|"high",
  "unresolved_questions": string[],
  "contradictions": [{ "subject": string, "source_a_excerpt": string, "source_b_excerpt": string, "status": "unresolved" }]
}`;

    const userPrompt = `System ID: ${systemId}
System Description: ${systemDescription}
Authority Map Summary / Intake Source: ${authorityMapSummary}`;

    const rawJson = await this.callChatCompletion(systemPrompt, userPrompt);
    return parseAndValidateArchitectureExtraction(rawJson, this.maxResponseChars);
  }

  async draftFindings(
    systemSnapshotId: string,
    softDimensions: SoftDimensionDraftBatch,
    existingMap: SeededAuthorityMap,
    systemDescription: string,
    authorityMapSummary: string
  ): Promise<LlmFindingDraftOutput> {
    const systemPrompt = `You are an AI governance finding-drafting component.
Draft candidate findings from soft-dimension context and architecture notes conforming to finding-draft schema.
STRICT INVARIANTS:
1. evidence_level MUST be "E0_claimed" or "E1_documented". You CANNOT and MUST NOT produce E2, E3, or E4.
2. Every finding MUST cite a non-empty "basis" from source material.
3. Every finding MUST link to an Authority Map node or edge via "authority_map_ref".
4. If source materials contradict, record in "contradictions" with status "unresolved". Do NOT resolve them.
5. Unknowns must be listed explicitly in "unknowns".
Output valid JSON matching:
{
  "findings": [{
    "title": string,
    "description": string,
    "severity": "critical"|"high"|"medium"|"low"|"informational",
    "confidence": "low"|"moderate"|"high",
    "evidence_level": "E0_claimed"|"E1_documented",
    "framework_reference_code": string,
    "authority_map_ref": { "node_id"?: string, "edge_id"?: string, "is_llm_proposed"?: boolean },
    "basis": string,
    "self_assessed_certainty_note"?: string
  }],
  "contradictions": [{ "subject": string, "source_a_excerpt": string, "source_b_excerpt": string, "status": "unresolved" }],
  "unknowns": string[]
}`;

    const userPrompt = `Snapshot ID: ${systemSnapshotId}
System Description: ${systemDescription}
Authority Map Summary: ${authorityMapSummary}
Existing Authority Map Nodes: ${JSON.stringify(existingMap.nodes.map(n => ({ id: n.id, type: n.nodeType, name: n.name })))}
Existing Authority Map Edges: ${JSON.stringify(existingMap.edges.map(e => ({ id: e.id, type: e.edgeType, src: e.sourceNodeId, tgt: e.targetNodeId })))}
Soft Dimensions Context: ${JSON.stringify(softDimensions.dimensions.map(d => ({ id: d.dimensionId, title: d.dimensionTitle, notes: d.auditorNotes, tags: d.regulatoryTags })))}`;

    const rawJson = await this.callChatCompletion(systemPrompt, userPrompt);
    return parseAndValidateFindingDraft(rawJson, this.maxResponseChars);
  }
}
