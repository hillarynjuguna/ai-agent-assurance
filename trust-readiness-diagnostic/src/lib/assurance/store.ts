import fs from "node:fs/promises";
import path from "node:path";
import type { TrackDImportResult } from "../../../../tools/track-d-governability-audit/adapter/src/assurance-types";
import type { SeededAuthorityMap } from "../../../../tools/track-d-governability-audit/adapter/src/authority-map-seed";
import type { AssessmentFinding } from "../../../../tools/track-d-governability-audit/adapter/src/findings";
import type { SystemSnapshot } from "../../../../tools/track-d-governability-audit/adapter/src/snapshots/types";

/**
 * Stored Assurance Assessment Record
 * Preserves raw submission, hash integrity, received timestamp, schema version,
 * translated Assurance domain representation, frozen SystemSnapshot, seeded Authority Map, and deterministic findings.
 */
export interface StoredAssuranceAssessment {
  id: string;
  sourceHash: string;
  receivedAt: string;
  schemaVersion: string;
  rawSubmission: string;
  result: TrackDImportResult;
  snapshotId?: string;
  systemSnapshot?: SystemSnapshot;
  authorityMap?: SeededAuthorityMap;
  findings?: AssessmentFinding[];
}

const memoryStore = new Map<string, StoredAssuranceAssessment>();
const STORAGE_DIR = path.join(process.cwd(), ".data", "assurance", "assessments");

function storageMode(): "file" | "memory" {
  const mode = process.env.ASSURANCE_STORE_MODE;
  if (mode === "memory") return "memory";
  return "file";
}

async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch {
    // Ignore if directory exists
  }
}

/**
 * Persists an assurance assessment record.
 */
export async function saveAssuranceAssessment(record: StoredAssuranceAssessment): Promise<void> {
  memoryStore.set(record.id, record);

  const mode = storageMode();
  if (mode === "memory") {
    return;
  }

  try {
    await ensureStorageDir();
    const filePath = path.join(STORAGE_DIR, `${record.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf-8");
  } catch (err) {
    console.warn(`[AssuranceStore] Filesystem write failed for ${record.id}, using memory store fallback:`, err);
  }
}

/**
 * Retrieves a stored assurance assessment record by its ID.
 */
export async function getAssuranceAssessment(id: string): Promise<StoredAssuranceAssessment | null> {
  if (memoryStore.has(id)) {
    return memoryStore.get(id)!;
  }

  const mode = storageMode();
  if (mode === "memory") {
    return null;
  }

  try {
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const record = JSON.parse(content) as StoredAssuranceAssessment;
    memoryStore.set(record.id, record);
    return record;
  } catch {
    return null;
  }
}

/**
 * Lists all stored assurance assessment records, ordered by received date (newest first).
 */
export async function listAssuranceAssessments(): Promise<StoredAssuranceAssessment[]> {
  const mode = storageMode();
  if (mode === "memory") {
    return Array.from(memoryStore.values()).sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );
  }

  try {
    await ensureStorageDir();
    const files = await fs.readdir(STORAGE_DIR);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const id = file.replace(".json", "");
        if (!memoryStore.has(id)) {
          const content = await fs.readFile(path.join(STORAGE_DIR, file), "utf-8");
          const record = JSON.parse(content) as StoredAssuranceAssessment;
          memoryStore.set(record.id, record);
        }
      }
    }
  } catch (err) {
    console.warn("[AssuranceStore] Could not read storage directory:", err);
  }

  return Array.from(memoryStore.values()).sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
}

/**
 * Finds all stored assessments matching a given source content hash.
 */
export async function findAssessmentsByHash(sourceHash: string): Promise<StoredAssuranceAssessment[]> {
  const all = await listAssuranceAssessments();
  return all.filter((a) => a.sourceHash === sourceHash);
}

/**
 * Clears storage (primarily for test isolation).
 */
export async function clearStorageForTesting(): Promise<void> {
  memoryStore.clear();
  try {
    const files = await fs.readdir(STORAGE_DIR);
    for (const file of files) {
      if (file.endsWith(".json")) {
        await fs.unlink(path.join(STORAGE_DIR, file));
      }
    }
  } catch {
    // Ignore if directory doesn't exist
  }
}
