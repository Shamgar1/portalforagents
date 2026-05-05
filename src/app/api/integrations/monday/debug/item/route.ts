/**
 * TEMPORARY: fetch one Monday item by ID with raw column_values.
 * Admin only. Remove when column debugging is done.
 */

import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { isMondayConfigured } from "@/lib/integrations/monday/env";
import { getMondayService } from "@/lib/integrations/monday/service";

export async function GET(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can access this debug endpoint." },
      { status: 403 }
    );
  }

  if (!isMondayConfigured()) {
    return NextResponse.json(
      { error: "Monday.com environment variables are missing." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId")?.trim() ?? url.searchParams.get("id")?.trim();

  if (!itemId) {
    return NextResponse.json(
      { error: "Missing itemId query parameter (Monday pulse/item id)." },
      { status: 400 }
    );
  }

  try {
    const item = await getMondayService().getItemDebugSnapshot(itemId);

    if (!item) {
      return NextResponse.json(
        { error: `No Monday item found for id ${itemId}.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        column_values: item.column_values,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch item from Monday.com.",
      },
      { status: 502 }
    );
  }
}
