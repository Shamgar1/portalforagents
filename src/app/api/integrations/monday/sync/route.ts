import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { isMondayOpportunitySyncConfigured } from "@/lib/integrations/monday/env";
import { runMondayOpportunitySync } from "@/lib/integrations/monday/run-opportunity-sync";

export async function POST(request: Request) {
  const user = await getSessionUser();
  const runId = `monday-sync-route-${Date.now()}`;

  // #region agent log
  fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
    body: JSON.stringify({
      sessionId: "ad0d91",
      runId,
      hypothesisId: "H5",
      location: "src/app/api/integrations/monday/sync/route.ts:POST:start",
      message: "monday sync route start",
      data: { hasUser: Boolean(user), role: user?.role ?? null },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can trigger Monday.com opportunities sync." },
      { status: 403 }
    );
  }

  if (!isMondayOpportunitySyncConfigured()) {
    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H6",
        location: "src/app/api/integrations/monday/sync/route.ts:POST:config",
        message: "monday sync not configured",
        data: { configured: false },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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

  try {
    const result = await runMondayOpportunitySync({
      demoItemLimit,
    });

    return NextResponse.json({
      ok: true,
      referringAgentColumnId: result.referringAgentColumnId,
      masterPaymentColumnId: result.masterPaymentColumnId,
      agentNumberColumnId: result.agentNumberColumnId,
      requestedColumnIds: result.requestedColumnIds,
      totalFetched: result.totalFetched,
      syncedCount: result.syncedCount,
      unmatchedCount: result.unmatchedCount,
      unmatchedItems: result.unmatchedItems,
      sampleReferringAgents: result.sampleReferringAgents,
      sampleMasterPayments: result.sampleMasterPayments,
      sampleAgentNumberRawColumns: result.sampleAgentNumberRawColumns,
      sampleParsedAgentNumbers: result.sampleParsedAgentNumbers,
      sampleUpsertAgentNumbers: result.sampleUpsertAgentNumbers,
      distinctReferringAgents: result.distinctReferringAgents,
      boardItemCount: result.boardItemCount,
      pagesFetched: result.pagesFetched,
      hasMore: result.hasMore,
      lastCursor: result.lastCursor,
      stoppedReason: result.stoppedReason,
      durationMs: result.durationMs,
      totalClientsInDatabaseAfterSync: result.totalClientsInDatabaseAfterSync,
    });
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H7",
        location: "src/app/api/integrations/monday/sync/route.ts:POST:catch",
        message: "monday sync route caught error",
        data: { message: error instanceof Error ? error.message : "unknown error" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to sync opportunities from Monday.com.",
      },
      { status: 502 }
    );
  }
}
