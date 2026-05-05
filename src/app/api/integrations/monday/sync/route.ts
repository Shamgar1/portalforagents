import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getClientService } from "@/lib/data/client-service";
import { isMondayOpportunitySyncConfigured } from "@/lib/integrations/monday/env";

export async function POST(request: Request) {
  const user = await getSessionUser();

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
    const result = await getClientService().syncFromMondayOpportunities({
      demoItemLimit,
    });

    return NextResponse.json({
      ok: true,
      referringAgentColumnId: result.referringAgentColumnId,
      requestedColumnIds: result.requestedColumnIds,
      totalFetched: result.totalFetched,
      syncedCount: result.syncedCount,
      unmatchedCount: result.unmatchedCount,
      unmatchedItems: result.unmatchedItems,
      sampleReferringAgents: result.sampleReferringAgents,
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
