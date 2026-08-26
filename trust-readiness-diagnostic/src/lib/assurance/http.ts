import { NextResponse } from "next/server";
import { Phase6Error, phase6ErrorResponse } from "./phase6-service";

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) throw new Phase6Error("Request body must be a JSON object", 400, "invalid_body");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Phase6Error("Malformed JSON request body", 400, "invalid_json");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Phase6Error("Request body must be a JSON object", 400, "invalid_body");
  }
  return parsed as Record<string, unknown>;
}

export function phase6Response(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function phase6ErrorResponseJson(error: unknown): NextResponse {
  const status = error instanceof Phase6Error ? error.status : 500;
  return NextResponse.json(phase6ErrorResponse(error), { status });
}
