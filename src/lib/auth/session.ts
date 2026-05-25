export async function getSessionUser() {
  const runId = `session-${Date.now()}`;
  try {
    const [{ buildSessionUser, mapProfileRow }, { getSupabaseServerReadOnlyClient }] = await Promise.all([
      import("@/lib/auth/user"),
      import("@/lib/supabase/server")
    ]);
    const supabase = await getSupabaseServerReadOnlyClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H3",
        location: "src/lib/auth/session.ts:getUser",
        message: "supabase.auth.getUser result",
        data: {
          hasAuthError: Boolean(authError),
          authErrorMessage: authError?.message ?? null,
          hasUser: Boolean(user),
          userId: user?.id ?? null,
          hasEmail: Boolean(user?.email)
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    if (authError || !user?.email) {
      if (authError) {
        console.warn("[auth] getSessionUser auth.getUser failed", {
          message: authError.message,
          status: authError.status
        });
      } else {
        console.warn("[auth] getSessionUser missing auth user email", {
          userId: user?.id ?? null
        });
      }
      return null;
    }

    let profile:
      | {
          id: string;
          full_name: string;
          role: "agent" | "admin" | "master" | "agent_number";
          agent_number?: string | null;
        }
      | null = null;
    let profileError:
      | {
          message: string;
          code?: string;
          details?: string;
          hint?: string;
        }
      | null = null;

    const withAgentNumber = await supabase
      .from("profiles")
      .select("id, full_name, role, agent_number")
      .eq("id", user.id)
      .single();

    profile = (withAgentNumber.data as typeof profile) ?? null;
    profileError = withAgentNumber.error
      ? {
          message: withAgentNumber.error.message,
          code: withAgentNumber.error.code ?? undefined,
          details: withAgentNumber.error.details ?? undefined,
          hint: withAgentNumber.error.hint ?? undefined
        }
      : null;

    if (
      profileError?.message?.includes("profiles.agent_number does not exist") ||
      profileError?.code === "42703"
    ) {
      // #region agent log
      fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
        body: JSON.stringify({
          sessionId: "ad0d91",
          runId,
          hypothesisId: "H4",
          location: "src/lib/auth/session.ts:profileFallback",
          message: "profiles.agent_number missing, retrying without agent_number column",
          data: { userId: user.id, errorCode: profileError.code ?? null },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion

      const fallback = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      profile = fallback.data
        ? { ...(fallback.data as Omit<NonNullable<typeof profile>, "agent_number">), agent_number: null }
        : null;
      profileError = fallback.error
        ? {
            message: fallback.error.message,
            code: fallback.error.code ?? undefined,
            details: fallback.error.details ?? undefined,
            hint: fallback.error.hint ?? undefined
          }
        : null;
    }

    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H4",
        location: "src/lib/auth/session.ts:profileLookup",
        message: "profiles lookup in getSessionUser",
        data: {
          userId: user.id,
          hasProfile: Boolean(profile),
          role: profile?.role ?? null,
          profileErrorMessage: profileError?.message ?? null,
          profileErrorCode: profileError?.code ?? null
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    if (profileError || !profile) {
      if (profileError) {
        console.warn("[auth] getSessionUser profile lookup failed", {
          userId: user.id,
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        });
      } else {
        console.warn("[auth] getSessionUser profile row missing", { userId: user.id });
      }
      return null;
    }

    return buildSessionUser(user.email, mapProfileRow(profile));
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7688/ingest/5b2db142-bc66-47ee-9ece-7f1ff1413cd7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad0d91" },
      body: JSON.stringify({
        sessionId: "ad0d91",
        runId,
        hypothesisId: "H5",
        location: "src/lib/auth/session.ts:catch",
        message: "getSessionUser unexpected exception",
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    console.warn("[auth] getSessionUser unexpected failure", {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
