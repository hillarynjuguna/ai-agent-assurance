import { DiagnosticReportRecord, PaymentStatus } from "./types";
import fs from "node:fs/promises";
import path from "node:path";
import { kv } from "@vercel/kv";

// Local report storage for the manual-fulfillment MVP.
// Supported modes:
// - "file": local filesystem storage under .data/reports
// - "memory": transient process memory, useful for tests only
// - "kv": Vercel KV storage for production deployments
const memoryStore = new Map<string, DiagnosticReportRecord>();

const STORAGE_DIR = path.join(process.cwd(), ".data", "reports");

function storageMode() {
  const mode = process.env.REPORT_STORE_MODE;
  if (mode === "kv") return "kv";
  if (mode === "memory") return "memory";
  return "file";
}

async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch {
    // Ignore if directory exists or cannot be created
  }
}

export async function saveReport(report: DiagnosticReportRecord): Promise<void> {
  memoryStore.set(report.id, report);
  const mode = storageMode();
  
  if (mode === "memory") {
    return;
  }
  
  if (mode === "kv") {
    try {
      await kv.set(`report:${report.id}`, report);
      await kv.sadd("reports:ids", report.id);
    } catch (err) {
      console.warn(`[ReportStore] KV write failed for ${report.id}, using memory store fallback:`, err);
    }
    return;
  }

  try {
    await ensureStorageDir();
    const filePath = path.join(STORAGE_DIR, `${report.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf-8");
  } catch (err) {
    console.warn(`[ReportStore] Filesystem write failed for ${report.id}, using memory store fallback:`, err);
  }
}

export async function getReport(id: string): Promise<DiagnosticReportRecord | null> {
  if (memoryStore.has(id)) {
    return memoryStore.get(id)!;
  }
  
  const mode = storageMode();
  if (mode === "memory") {
    return null;
  }
  
  if (mode === "kv") {
    try {
      const report = await kv.get<DiagnosticReportRecord>(`report:${id}`);
      if (report) {
        memoryStore.set(report.id, report);
      }
      return report;
    } catch (err) {
      console.warn(`[ReportStore] KV read failed for ${id}:`, err);
      return null;
    }
  }

  try {
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const report = JSON.parse(content) as DiagnosticReportRecord;
    memoryStore.set(report.id, report);
    return report;
  } catch {
    return null;
  }
}

export async function listReports(): Promise<DiagnosticReportRecord[]> {
  let reports: DiagnosticReportRecord[] = Array.from(memoryStore.values());
  const mode = storageMode();
  
  if (mode === "memory") {
    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (mode === "kv") {
    try {
      const ids = await kv.smembers("reports:ids");
      if (ids && ids.length > 0) {
        const keys = ids.map((id) => `report:${id}`);
        // kv.mget requires keys to be passed as variadic arguments
        const kvReports = await kv.mget<DiagnosticReportRecord[]>(...keys);
        
        // Sync to memoryStore and merge
        for (const report of kvReports) {
          if (report) {
            memoryStore.set(report.id, report);
          }
        }
        reports = Array.from(memoryStore.values());
      }
    } catch (err) {
      console.warn("[ReportStore] KV list failed:", err);
    }
    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    await ensureStorageDir();
    const files = await fs.readdir(STORAGE_DIR);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const id = file.replace(".json", "");
        if (!memoryStore.has(id)) {
          const content = await fs.readFile(path.join(STORAGE_DIR, file), "utf-8");
          const report = JSON.parse(content) as DiagnosticReportRecord;
          memoryStore.set(report.id, report);
          reports.push(report);
        }
      }
    }
  } catch (err) {
    console.warn("[ReportStore] Could not read report directory:", err);
  }
  return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateReportPaymentStatus(
  id: string,
  status: PaymentStatus
): Promise<DiagnosticReportRecord | null> {
  const report = await getReport(id);
  if (!report) {
    return null;
  }
  report.paymentStatus = status;
  await saveReport(report);
  return report;
}
