import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

type ManagedUserRole = "agent" | "agent_number";

export async function GET() {
  const user = await getSessionUser();
  const runId = `admin-agents-${Date.now()}`;

  // #region agent log
  fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
    body: JSON.stringify({
      sessionId: "ad0d91",
      runId,
      hypothesisId: "H1",
      location: "src/app/api/admin/agents/route.ts:GET:start",
      message: "admin agents GET start",
      data: { hasUser: Boolean(user), role: user?.role ?? null },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const admin = getSupabaseServiceRoleClient();
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name, role, agent_number")
      .in("role", ["agent", "agent_number"])
      .order("full_name", { ascending: true });

    if (profilesError) {
      // #region agent log
      fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
        body: JSON.stringify({
          sessionId: "ad0d91",
          runId,
          hypothesisId: "H2",
          location: "src/app/api/admin/agents/route.ts:GET:profilesError",
          message: "profiles query failed",
          data: { message: profilesError.message, code: profilesError.code ?? null },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json({ error: profilesError.message }, { status: 502 });
    }

    const agentIds = new Set((profiles ?? []).map((row) => row.id));
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      // #region agent log
      fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
        body: JSON.stringify({
          sessionId: "ad0d91",
          runId,
          hypothesisId: "H3",
          location: "src/app/api/admin/agents/route.ts:GET:listUsersError",
          message: "auth.admin.listUsers failed",
          data: { message: listError.message, status: listError.status ?? null },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json({ error: listError.message }, { status: 502 });
    }

    const agents = (listData.users ?? [])
      .filter((authUser) => agentIds.has(authUser.id))
      .map((authUser) => {
        const profile = (profiles ?? []).find((row) => row.id === authUser.id);

        return {
          id: authUser.id,
          email: authUser.email ?? "",
          fullName: profile?.full_name ?? "",
          role: (profile?.role ?? "agent") as ManagedUserRole,
          agentNumber: profile?.agent_number ?? "",
        };
      })
      .sort((left, right) => left.fullName.localeCompare(right.fullName, "he"));

    return NextResponse.json({ agents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load agents.";

    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H4",
        location: "src/app/api/admin/agents/route.ts:GET:catch",
        message: "admin agents GET exception",
        data: { message },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { error: "ניהול סוכנים דורש הגדרת SUPABASE_SERVICE_ROLE_KEY בשרת." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    full_name?: string;
    role?: ManagedUserRole;
    agent_number?: string;
  };

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password?.trim() ?? "";
  const fullName = body.full_name?.trim() ?? "";
  const role: ManagedUserRole = body.role === "agent_number" ? "agent_number" : "agent";
  const agentNumber = body.agent_number?.trim() ?? "";

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: "יש למלא אימייל, סיסמה ושם מלא." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 6 תווים." }, { status: 400 });
  }
  if (role === "agent_number" && !agentNumber) {
    return NextResponse.json({ error: "יש להזין מספר סוכן עבור משתמש מסוג מספר סוכן." }, { status: 400 });
  }

  try {
    const admin = getSupabaseServiceRoleClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        agent_number: role === "agent_number" ? agentNumber : null,
      },
    });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message ?? "יצירת המשתמש נכשלה." },
        { status: 400 }
      );
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: created.user.id,
        full_name: fullName,
        role,
        agent_number: role === "agent_number" ? agentNumber : null,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      return NextResponse.json(
        { error: `המשתמש נוצר אך עדכון הפרופיל נכשל: ${profileError.message}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, id: created.user.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create agent.";

    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { error: "יצירת סוכן דורשת הגדרת SUPABASE_SERVICE_ROLE_KEY בשרת." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
