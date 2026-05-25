import { NextResponse } from "next/server";

import { getSupabaseServerActionClient } from "@/lib/supabase/server-action";

export async function POST(request: Request) {
  const runId = `login-${Date.now()}`;
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password?.trim() ?? "";

  // #region agent log
  fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
    body: JSON.stringify({
      sessionId: "ad0d91",
      runId,
      hypothesisId: "H1",
      location: "src/app/api/auth/login/route.ts:POST",
      message: "login request received",
      data: { hasEmail: Boolean(email), emailLength: email.length, passwordLength: password.length },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  if (!email || !password) {
    return NextResponse.json({ error: "יש להזין אימייל וסיסמה." }, { status: 400 });
  }

  try {
    const supabase = await getSupabaseServerActionClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H1",
        location: "src/app/api/auth/login/route.ts:signInWithPassword",
        message: "signInWithPassword result",
        data: {
          hasError: Boolean(error),
          errorMessage: error?.message ?? null,
          hasSession: Boolean(data.session),
          hasUser: Boolean(data.user),
          userId: data.user?.id ?? null
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    if (error) {
      return NextResponse.json({ error: "אימייל או סיסמה שגויים." }, { status: 401 });
    }

    if (!data.session || !data.user?.id) {
      console.warn("[auth] login signInWithPassword returned no session", {
        hasUser: Boolean(data.user),
        hasSession: Boolean(data.session)
      });
      return NextResponse.json(
        { error: "התחברות נכשלה: לא נוצרה סשן. נסו שוב." },
        { status: 502 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      // #region agent log
      fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
        body: JSON.stringify({
          sessionId: "ad0d91",
          runId,
          hypothesisId: "H4",
          location: "src/app/api/auth/login/route.ts:profileLookup",
          message: "profile lookup failed after login",
          data: {
            userId: data.user.id,
            hasProfile: Boolean(profile),
            profileErrorMessage: profileError?.message ?? null,
            profileErrorCode: profileError?.code ?? null
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion

      console.warn("[auth] login profile lookup failed after sign-in", {
        userId: data.user.id,
        message: profileError?.message ?? null,
        code: profileError?.code ?? null,
        details: profileError?.details ?? null,
        hint: profileError?.hint ?? null
      });
      return NextResponse.json(
        { error: "התחברת בהצלחה, אבל לא נמצא פרופיל משתמש. פנו למנהל המערכת." },
        { status: 403 }
      );
    }

    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H4",
        location: "src/app/api/auth/login/route.ts:success",
        message: "login route success response",
        data: { userId: data.user.id, role: profile.role },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ ok: true, role: profile.role });
  } catch {
    return NextResponse.json(
      { error: "חיבור Supabase לא הוגדר. יש לעדכן קובץ סביבה." },
      { status: 500 }
    );
  }
}
