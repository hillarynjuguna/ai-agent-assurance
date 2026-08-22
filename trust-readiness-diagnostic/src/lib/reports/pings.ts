import { GumroadPingRecord } from "./types";
import fs from "node:fs/promises";
import path from "node:path";
import { getReport, updateReportPaymentStatus } from "./store";
import { kv } from "@vercel/kv";

const memoryPingStore = new Map<string, GumroadPingRecord>();
const PING_STORAGE_DIR = path.join(process.cwd(), ".data", "pings");

function storageMode() {
  const mode = process.env.REPORT_STORE_MODE;
  if (mode === "kv") return "kv";
  if (mode === "memory") return "memory";
  return "file";
}

async function ensurePingStorageDir() {
  try {
    await fs.mkdir(PING_STORAGE_DIR, { recursive: true });
  } catch {
    // Ignore error
  }
}

export async function savePing(ping: GumroadPingRecord): Promise<void> {
  memoryPingStore.set(ping.id, ping);
  const mode = storageMode();
  
  if (mode === "file") {
    try {
      await ensurePingStorageDir();
      const filePath = path.join(PING_STORAGE_DIR, `${ping.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(ping, null, 2), "utf-8");
    } catch (err) {
      console.warn(`[PingStore] Filesystem write failed for ping ${ping.id}:`, err);
    }
  } else if (mode === "kv") {
    try {
      await kv.set(`ping:${ping.id}`, ping);
      await kv.sadd("pings:ids", ping.id);
    } catch (err) {
      console.warn(`[PingStore] KV write failed for ping ${ping.id}:`, err);
    }
  }

  // Attempt auto-matching if reportId is present
  if (ping.reportId) {
    const report = await getReport(ping.reportId);
    if (report) {
      ping.matchedReportId = report.id;
      ping.matchStatus = "matched";
      await updateReportPaymentStatus(report.id, "paid");
      
      // Save updated ping
      memoryPingStore.set(ping.id, ping);
      if (mode === "file") {
        try {
          await fs.writeFile(path.join(PING_STORAGE_DIR, `${ping.id}.json`), JSON.stringify(ping, null, 2), "utf-8");
        } catch {}
      } else if (mode === "kv") {
        try {
          await kv.set(`ping:${ping.id}`, ping);
        } catch {}
      }
    } else {
      ping.matchedReportId = undefined;
      ping.matchStatus = "unmatched";
      memoryPingStore.set(ping.id, ping);
      if (mode === "file") {
        try {
          await fs.writeFile(path.join(PING_STORAGE_DIR, `${ping.id}.json`), JSON.stringify(ping, null, 2), "utf-8");
        } catch {}
      } else if (mode === "kv") {
        try {
          await kv.set(`ping:${ping.id}`, ping);
        } catch {}
      }
    }
  }
}

export async function listPings(): Promise<GumroadPingRecord[]> {
  let pings: GumroadPingRecord[] = Array.from(memoryPingStore.values());
  const mode = storageMode();
  
  if (mode === "memory") {
    return pings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (mode === "kv") {
    try {
      const ids = await kv.smembers("pings:ids");
      if (ids && ids.length > 0) {
        const keys = ids.map((id) => `ping:${id}`);
        const kvPings = await kv.mget<GumroadPingRecord[]>(...keys);
        
        for (const ping of kvPings) {
          if (ping) {
            memoryPingStore.set(ping.id, ping);
          }
        }
        pings = Array.from(memoryPingStore.values());
      }
    } catch (err) {
      console.warn("[PingStore] KV list failed:", err);
    }
    return pings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    await ensurePingStorageDir();
    const files = await fs.readdir(PING_STORAGE_DIR);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const id = file.replace(".json", "");
        if (!memoryPingStore.has(id)) {
          const content = await fs.readFile(path.join(PING_STORAGE_DIR, file), "utf-8");
          const ping = JSON.parse(content) as GumroadPingRecord;
          memoryPingStore.set(ping.id, ping);
          pings.push(ping);
        }
      }
    }
  } catch (err) {
    console.warn("[PingStore] Could not read ping directory:", err);
  }
  return pings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function manualMatchPing(pingId: string, reportId: string): Promise<boolean> {
  const pings = await listPings();
  const ping = pings.find((p) => p.id === pingId);
  if (!ping) return false;

  const report = await getReport(reportId);
  if (!report) return false;

  ping.matchedReportId = report.id;
  ping.matchStatus = "manual_assigned";
  await savePing(ping);
  await updateReportPaymentStatus(report.id, "paid");
  return true;
}
