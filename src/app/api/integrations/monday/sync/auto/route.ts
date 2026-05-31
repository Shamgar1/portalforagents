import { NextResponse } from "next/server";

import { isMondayOpportunitySyncConfigured } from "@/lib/integrations/monday/env";
import { runMondayOpportunitySync } from "@/lib/integrations/monday/run-opportunity-sync";

function extractCronSecret(request: Request): string | null {
  const headerValue = request.headers.get("x-sync-secret")?.trim();
  if (headerValue) return headerValue;

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim() || null;
  }

  return null;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.MONDAY_SYNC_CRON_SECRET?.trim();
  const providedSecret = extractCronSecret(request);
  const runId = `monday-auto-sync-${Date.now()}`;

  if (!expectedSecret) {
    console.error("[Monday auto sync] missing MONDAY_SYNC_CRON_SECRET", { runId });
    return NextResponse.json(
      { error: "MONDAY_SYNC_CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    console.warn("[Monday auto sync] unauthorized request", { runId });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isMondayOpportunitySyncConfigured()) {
    console.error("[Monday auto sync] Monday sync is not configured", { runId });
    return NextResponse.json(
      {
        error:
          "Monday opportunities sync is not configured. Set the board ID and required column IDs.",
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit")?.trim();
  let demoItemLimit: number | undefined;
  if (limitRaw) {
    const n = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: "Invalid limit query parameter." }, { status: 400 });
    }
    demoItemLimit = Math.min(n, 50_000);
  }

  const startedAt = Date.now();
  console.info("[Monday auto sync] started", { runId, demoItemLimit: demoItemLimit ?? null });

  try {
    const result = await runMondayOpportunitySync({ demoItemLimit });
    console.info("[Monday auto sync] completed", {
      runId,
      durationMs: Date.now() - startedAt,
      totalFetched: result.totalFetched,
      syncedCount: result.syncedCount,
      unmatchedCount: result.unmatchedCount,
      totalClientsInDatabaseAfterSync: result.totalClientsInDatabaseAfterSync,
    });

    return NextResponse.json({
      ok: true,
      triggeredBy: "cron",
      totalFetched: result.totalFetched,
      syncedCount: result.syncedCount,
      unmatchedCount: result.unmatchedCount,
      durationMs: result.durationMs,
      totalClientsInDatabaseAfterSync: result.totalClientsInDatabaseAfterSync,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[Monday auto sync] failed", {
      runId,
      durationMs: Date.now() - startedAt,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
