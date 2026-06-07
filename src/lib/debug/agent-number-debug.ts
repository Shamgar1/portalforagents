import "server-only";

import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const DEBUG_LOG_PATH = join(process.cwd(), ".debug", "agent-number-8a3655.ndjson");

export function filterAgentNumberDigits(value: string): string {
  return value.normalize("NFKC").replace(/\D/g, "");
}

export type AgentNumberDiagnostic = {
  sessionAgentNumber: string | null;
  loadedClients: number;
  serviceRoleExactCount: number;
  serviceRoleDigitsMatchCount: number;
  availableAgentNumbersSample: string[];
  profileInAvailableSample: boolean;
};

export async function loadAgentNumberDiagnostic(
  sessionAgentNumber: string | null | undefined,
  loadedClients: number
): Promise<AgentNumberDiagnostic> {
  const trimmed = sessionAgentNumber?.trim() ?? null;
  let serviceRoleExactCount = 0;
  let serviceRoleDigitsMatchCount = 0;
  let availableAgentNumbersSample: string[] = [];

  try {
    const admin = getSupabaseServiceRoleClient();
    const { data: numberRows } = await admin
      .from("clients")
      .select("agent_number")
      .not("agent_number", "is", null)
      .limit(1000);

    availableAgentNumbersSample = [
      ...new Set(
        (numberRows ?? [])
          .map((row) => row.agent_number?.trim())
          .filter((value): value is string => Boolean(value))
      ),
    ].sort().slice(0, 20);

    if (trimmed) {
      const { count } = await admin
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("agent_number", trimmed);
      serviceRoleExactCount = count ?? 0;

      const digits = filterAgentNumberDigits(trimmed);
      serviceRoleDigitsMatchCount = (numberRows ?? []).filter(
        (row) => filterAgentNumberDigits(row.agent_number ?? "") === digits
      ).length;
    }
  } catch {
    // diagnostic only
  }

  return {
    sessionAgentNumber: trimmed,
    loadedClients,
    serviceRoleExactCount,
    serviceRoleDigitsMatchCount,
    availableAgentNumbersSample,
    profileInAvailableSample: trimmed
      ? availableAgentNumbersSample.includes(trimmed)
      : false,
  };
}

export function writeAgentNumberDebugLog(payload: Record<string, unknown>) {
  const line = JSON.stringify({
    sessionId: "8a3655",
    timestamp: Date.now(),
    ...payload,
  });

  // #region agent log
  try {
    mkdirSync(join(process.cwd(), ".debug"), { recursive: true });
    appendFileSync(DEBUG_LOG_PATH, `${line}\n`);
  } catch {
    // ignore file write failures
  }

  console.log("[DEBUG-8a3655]", line);

  fetch("http://127.0.0.1:7696/ingest/e8d705ae-6d6e-43e9-808e-d4c93eac172f", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8a3655" },
    body: line,
  }).catch(() => {});
  // #endregion
}
