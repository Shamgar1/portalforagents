import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const runId = `session-route-${Date.now()}`;
  try {
    const user = await getSessionUser();

    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H3",
        location: "src/app/api/auth/session/route.ts:GET",
        message: "auth session route evaluated user",
        data: { hasUser: Boolean(user), role: user?.role ?? null, userId: user?.id ?? null },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    if (!user) {
      return NextResponse.json(
        { error: "לא נמצאה סשן פעילה אחרי התחברות." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Session check failed."
      },
      { status: 500 }
    );
  }
}
