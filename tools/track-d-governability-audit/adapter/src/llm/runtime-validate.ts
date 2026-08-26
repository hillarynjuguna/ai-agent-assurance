import type {
  LlmArchitectureExtractionOutput,
  LlmFindingDraftOutput,
  LlmCandidateFinding,
  LlmCandidateNode,
  LlmCandidateEdge,
  LlmContradiction,
} from './types';

export const DEFAULT_MAX_LLM_RESPONSE_CHARS = 100_000;

export class LlmRuntimeValidationError extends Error {
  readonly operation: 'architecture_extraction' | 'finding_draft';
  readonly errors: string[];

  constructor(
    operation: 'architecture_extraction' | 'finding_draft',
    errors: string[],
  ) {
    super(`LLM ${operation} response failed runtime validation: ${errors.join('; ')}`);
    this.name = 'LlmRuntimeValidationError';
    this.operation = operation;
    this.errors = errors;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function checkAllowedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      errors.push(`${path}.${key} is not allowed`);
    }
  }
}

function requireNonEmptyString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[],
): void {
  if (!nonEmptyString(value[key])) {
    errors.push(`${path}.${key} must be a non-empty string`);
  }
}

function requireEnum(
  value: Record<string, unknown>,
  key: string,
  allowed: readonly string[],
  path: string,
  errors: string[],
): void {
  if (typeof value[key] !== 'string' || !allowed.includes(value[key])) {
    errors.push(`${path}.${key} must be one of: ${allowed.join(', ')}`);
  }
}

function validateContradictions(
  value: unknown,
  path: string,
  errors: string[],
): value is LlmContradiction[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return false;
  }

  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${itemPath} must be an object`);
      return;
    }
    checkAllowedKeys(item, ['subject', 'source_a_excerpt', 'source_b_excerpt', 'status'], itemPath, errors);
    requireNonEmptyString(item, 'subject', itemPath, errors);
    requireNonEmptyString(item, 'source_a_excerpt', itemPath, errors);
    requireNonEmptyString(item, 'source_b_excerpt', itemPath, errors);
    requireEnum(item, 'status', ['unresolved'], itemPath, errors);
  });
  return true;
}

function validateFindingDraftShape(value: unknown): value is LlmFindingDraftOutput {
  const errors: string[] = [];
  if (!isRecord(value)) {
    errors.push('response must be an object');
  } else {
    checkAllowedKeys(value, ['findings', 'contradictions', 'unknowns'], 'response', errors);

    if (!Array.isArray(value.findings)) {
      errors.push('response.findings must be an array');
    } else {
      value.findings.forEach((item, index) => {
        const path = `response.findings[${index}]`;
        if (!isRecord(item)) {
          errors.push(`${path} must be an object`);
          return;
        }
        checkAllowedKeys(
          item,
          [
            'title', 'description', 'severity', 'confidence', 'evidence_level',
            'framework_reference_code', 'authority_map_ref', 'basis',
            'self_assessed_certainty_note',
          ],
          path,
          errors,
        );
        requireNonEmptyString(item, 'title', path, errors);
        requireNonEmptyString(item, 'description', path, errors);
        requireEnum(item, 'severity', ['critical', 'high', 'medium', 'low', 'informational'], path, errors);
        requireEnum(item, 'confidence', ['low', 'moderate', 'high'], path, errors);
        requireEnum(item, 'evidence_level', ['E0_claimed', 'E1_documented'], path, errors);
        requireNonEmptyString(item, 'framework_reference_code', path, errors);
        requireNonEmptyString(item, 'basis', path, errors);

        const ref = item.authority_map_ref;
        if (!isRecord(ref)) {
          errors.push(`${path}.authority_map_ref must be an object`);
        } else {
          checkAllowedKeys(ref, ['node_id', 'edge_id', 'is_llm_proposed'], `${path}.authority_map_ref`, errors);
          const hasNode = nonEmptyString(ref.node_id);
          const hasEdge = nonEmptyString(ref.edge_id);
          if (!hasNode && !hasEdge) {
            errors.push(`${path}.authority_map_ref must contain node_id or edge_id`);
          } else if (hasNode && hasEdge) {
            errors.push(`${path}.authority_map_ref must contain exactly one of node_id or edge_id`);
          }
          if (ref.node_id !== undefined && !nonEmptyString(ref.node_id)) {
            errors.push(`${path}.authority_map_ref.node_id must be a non-empty string when present`);
          }
          if (ref.edge_id !== undefined && !nonEmptyString(ref.edge_id)) {
            errors.push(`${path}.authority_map_ref.edge_id must be a non-empty string when present`);
          }
          if (ref.is_llm_proposed !== undefined && typeof ref.is_llm_proposed !== 'boolean') {
            errors.push(`${path}.authority_map_ref.is_llm_proposed must be a boolean when present`);
          }
        }
        if (item.self_assessed_certainty_note !== undefined && typeof item.self_assessed_certainty_note !== 'string') {
          errors.push(`${path}.self_assessed_certainty_note must be a string when present`);
        }
      });
    }

    validateContradictions(value.contradictions, 'response.contradictions', errors);
    if (!Array.isArray(value.unknowns) || !value.unknowns.every(nonEmptyString)) {
      errors.push('response.unknowns must be an array of non-empty strings');
    }
  }

  if (errors.length > 0) {
    throw new LlmRuntimeValidationError('finding_draft', errors);
  }
  return true;
}

function validateArchitectureExtractionShape(value: unknown): value is LlmArchitectureExtractionOutput {
  const errors: string[] = [];
  if (!isRecord(value)) {
    errors.push('response must be an object');
  } else {
    checkAllowedKeys(
      value,
      ['nodes', 'edges', 'extraction_confidence', 'unresolved_questions', 'contradictions'],
      'response',
      errors,
    );
    if (!Array.isArray(value.nodes)) {
      errors.push('response.nodes must be an array');
    } else {
      value.nodes.forEach((item, index) => {
        const path = `response.nodes[${index}]`;
        if (!isRecord(item)) {
          errors.push(`${path} must be an object`);
          return;
        }
        checkAllowedKeys(item, ['temp_id', 'node_type', 'name', 'identity', 'source_excerpt'], path, errors);
        requireNonEmptyString(item, 'temp_id', path, errors);
        requireEnum(item, 'node_type', ['agent', 'model', 'memory', 'tool', 'api', 'data_source', 'external_agent', 'identity'], path, errors);
        requireNonEmptyString(item, 'name', path, errors);
        requireNonEmptyString(item, 'source_excerpt', path, errors);
        if (item.identity !== undefined && typeof item.identity !== 'string') {
          errors.push(`${path}.identity must be a string when present`);
        }
      });
    }
    if (!Array.isArray(value.edges)) {
      errors.push('response.edges must be an array');
    } else {
      value.edges.forEach((item, index) => {
        const path = `response.edges[${index}]`;
        if (!isRecord(item)) {
          errors.push(`${path} must be an object`);
          return;
        }
        checkAllowedKeys(
          item,
          [
            'source_temp_id', 'target_temp_id', 'edge_type', 'permission_scope',
            'requires_human_approval', 'data_classification', 'action_reversibility',
            'source_excerpt',
          ],
          path,
          errors,
        );
        requireNonEmptyString(item, 'source_temp_id', path, errors);
        requireNonEmptyString(item, 'target_temp_id', path, errors);
        requireEnum(item, 'edge_type', ['reads', 'writes', 'calls', 'delegates_to', 'authenticates_as'], path, errors);
        requireNonEmptyString(item, 'permission_scope', path, errors);
        if (item.requires_human_approval !== null && typeof item.requires_human_approval !== 'boolean') {
          errors.push(`${path}.requires_human_approval must be boolean or null`);
        }
        if (item.data_classification !== null && !['public', 'internal', 'confidential', 'restricted'].includes(item.data_classification as string)) {
          errors.push(`${path}.data_classification must be a supported value or null`);
        }
        if (item.action_reversibility !== null && !['reversible', 'partially_reversible', 'irreversible'].includes(item.action_reversibility as string)) {
          errors.push(`${path}.action_reversibility must be a supported value or null`);
        }
        requireNonEmptyString(item, 'source_excerpt', path, errors);
      });
    }
    requireEnum(value, 'extraction_confidence', ['low', 'moderate', 'high'], 'response', errors);
    if (!Array.isArray(value.unresolved_questions) || !value.unresolved_questions.every(nonEmptyString)) {
      errors.push('response.unresolved_questions must be an array of non-empty strings');
    }
    validateContradictions(value.contradictions, 'response.contradictions', errors);
  }

  if (errors.length > 0) {
    throw new LlmRuntimeValidationError('architecture_extraction', errors);
  }
  return true;
}

function parseAndValidate<T>(
  rawJson: string,
  operation: 'architecture_extraction' | 'finding_draft',
  maxResponseChars = DEFAULT_MAX_LLM_RESPONSE_CHARS,
): T {
  const errors: string[] = [];
  if (typeof rawJson !== 'string' || rawJson.trim().length === 0) {
    errors.push('response body must be a non-empty string');
  } else if (rawJson.length > maxResponseChars) {
    errors.push(`response body exceeds maximum size of ${maxResponseChars} characters`);
  }
  if (errors.length > 0) {
    throw new LlmRuntimeValidationError(operation, errors);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown JSON parse error';
    throw new LlmRuntimeValidationError(operation, [`invalid JSON: ${message}`]);
  }

  if (operation === 'architecture_extraction') {
    validateArchitectureExtractionShape(parsed);
  } else {
    validateFindingDraftShape(parsed);
  }
  return parsed as T;
}

export function parseAndValidateArchitectureExtraction(
  rawJson: string,
  maxResponseChars?: number,
): LlmArchitectureExtractionOutput {
  return parseAndValidate<LlmArchitectureExtractionOutput>(rawJson, 'architecture_extraction', maxResponseChars);
}

export function parseAndValidateFindingDraft(
  rawJson: string,
  maxResponseChars?: number,
): LlmFindingDraftOutput {
  return parseAndValidate<LlmFindingDraftOutput>(rawJson, 'finding_draft', maxResponseChars);
}

// Compile-time-only references keep the runtime guards aligned with the domain types.
export type RuntimeValidatedLlmTypes = LlmCandidateFinding | LlmCandidateNode | LlmCandidateEdge;
