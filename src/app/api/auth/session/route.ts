import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

import { getSupabaseServerReadOnlyClient } from "@/lib/supabase/server";

export async function GET() {
  const runId = `session-route-${Date.now()}`;
  try {
    const requestHeaders = await headers();
    const cookieStore = await cookies();
    const cookieHeaderExists = Boolean(requestHeaders.get("cookie"));
    const cookieNames = cookieStore.getAll().map((cookie) => cookie.name);
    const hasSupabaseAuthCookie = cookieNames.includes(
      "sb-cjpushblurarelywiaiv-auth-token"
    );

    const supabase = await getSupabaseServerReadOnlyClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H8",
        location: "src/app/api/auth/session/route.ts:GET:cookiesAndSession",
        message: "session route cookie/session snapshot",
        data: {
          cookieHeaderExists,
          cookieNames,
          hasSupabaseAuthCookie,
          hasSession: Boolean(session),
          sessionError: sessionError?.message ?? null,
          hasUser: Boolean(user),
          userError: userError?.message ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (hasSupabaseAuthCookie && (sessionError || userError) && !session && !user) {
      // #region agent log
      fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
        body: JSON.stringify({
          sessionId: "ad0d91",
          runId,
          hypothesisId: "H9",
          location: "src/app/api/auth/session/route.ts:GET:cookiePresentButAuthFailed",
          message: "supabase auth failed while cookie exists",
          data: {
            sessionError: sessionError?.message ?? null,
            userError: userError?.message ?? null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }

    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H3",
        location: "src/app/api/auth/session/route.ts:GET",
        message: "auth session route evaluated supabase auth state",
        data: {
          hasUser: Boolean(user),
          userId: user?.id ?? null,
          hasSession: Boolean(session),
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    if (!user && !session) {
      return NextResponse.json(
        { error: "לא נמצאה סשן פעילה אחרי התחברות." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user?.id ?? null,
        email: user?.email ?? null
      },
      hasSession: Boolean(session),
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
