import { NextResponse } from "next/server";

import { isMondayOpportunitySyncConfigured } from "@/lib/integrations/monday/env";
import { runMondayOpportunitySync } from "@/lib/integrations/monday/run-opportunity-sync";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

function extractCronSecret(request: Request): string | null {
  const headerValue = request.headers.get("x-sync-secret")?.trim();
  if (headerValue) return headerValue;

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim() || null;
  }

  return null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableMondayError(message: string): boolean {
  return /status\s+(502|503|504)\b/i.test(message) || /gateway time-?out/i.test(message);
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

  let attempts = 0;
  let lastErrorMessage = "unknown error";

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    try {
      const result = await runMondayOpportunitySync({ demoItemLimit });
      console.info("[Monday auto sync] completed", {
        runId,
        attempts,
        durationMs: Date.now() - startedAt,
        totalFetched: result.totalFetched,
        syncedCount: result.syncedCount,
        unmatchedCount: result.unmatchedCount,
        totalClientsInDatabaseAfterSync: result.totalClientsInDatabaseAfterSync,
      });

      return NextResponse.json({
        ok: true,
        triggeredBy: "cron",
        attempts,
        totalFetched: result.totalFetched,
        syncedCount: result.syncedCount,
        unmatchedCount: result.unmatchedCount,
        durationMs: result.durationMs,
        totalClientsInDatabaseAfterSync: result.totalClientsInDatabaseAfterSync,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      lastErrorMessage = message;
      const retryable = isRetryableMondayError(message);
      const willRetry = retryable && attempts < MAX_ATTEMPTS;

      console.error("[Monday auto sync] failed", {
        runId,
        attempts,
        retryable,
        willRetry,
        durationMs: Date.now() - startedAt,
        error: message,
      });

      if (!willRetry) {
        return NextResponse.json(
          {
            ok: false,
            error: message,
            attempts,
          },
          { status: retryable ? 502 : 500 }
        );
      }

      console.info("[Monday auto sync] retrying after transient Monday failure", {
        runId,
        attempts,
        nextAttempt: attempts + 1,
        delayMs: RETRY_DELAY_MS,
      });
      await wait(RETRY_DELAY_MS);
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: lastErrorMessage,
      attempts,
    },
    { status: 502 }
  );
}
