import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { isMondayConfigured } from "@/lib/integrations/monday/env";
import { getMondayService } from "@/lib/integrations/monday/service";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can access Monday.com board data." },
      { status: 403 }
    );
  }

  // The preview route intentionally only requires MONDAY_API_TOKEN and
  // MONDAY_OPPORTUNITIES_BOARD_ID (covered by isMondayConfigured). Sync-only
  // column IDs (loan amount, expected commission, referring agent) are NOT
  // required here, because this endpoint is used to help discover those
  // column IDs from the board itself.
  if (!isMondayConfigured()) {
    return NextResponse.json(
      { error: "Monday.com environment variables are missing." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  try {
    const monday = getMondayService();
    const board = await monday.getBoardPreview(limit);

    return NextResponse.json({ board });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch data from Monday.com.",
      },
      { status: 502 }
    );
  }
}
