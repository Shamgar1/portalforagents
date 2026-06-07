import { NextResponse } from "next/server";

import { writeAgentNumberDebugLog } from "@/lib/debug/agent-number-debug";
import { getSessionUser } from "@/lib/auth/session";
import { getClientService } from "@/lib/data/client-service";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const sessionAgentNumber = user.agentNumber?.trim() ?? null;
  let serviceRoleMatchCount = 0;
  let serviceRoleDistinctSample: string[] = [];
  let profileAgentNumber: string | null = null;
  let profileRole: string | null = null;

  try {
    const admin = getSupabaseServiceRoleClient();

    const { data: profileRow } = await admin
      .from("profiles")
      .select("role, agent_number")
      .eq("id", user.id)
      .maybeSingle();

    profileRole = profileRow?.role ?? null;
    profileAgentNumber = profileRow?.agent_number?.trim() ?? null;

    const { data: distinctRows } = await admin
      .from("clients")
      .select("agent_number")
      .not("agent_number", "is", null)
      .limit(500);

    serviceRoleDistinctSample = [
      ...new Set(
        (distinctRows ?? [])
          .map((row) => row.agent_number?.trim())
          .filter((value): value is string => Boolean(value))
      ),
    ].sort().slice(0, 20);

    if (sessionAgentNumber) {
      const { count } = await admin
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("agent_number", sessionAgentNumber);
      serviceRoleMatchCount = count ?? 0;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeAgentNumberDebugLog({
      runId: "diagnostic-error",
      hypothesisId: "H3",
      location: "api/debug/agent-number-diagnostic",
      message: "service role diagnostic failed",
      data: { message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const clientService = getClientService();
  const userScopedClients = await clientService.listClientsForUser(user);

  const diagnostic = {
    session: {
      role: user.role,
      agentNumber: sessionAgentNumber,
      agentNumberLen: sessionAgentNumber?.length ?? 0,
    },
    profile: {
      role: profileRole,
      agentNumber: profileAgentNumber,
      agentNumberLen: profileAgentNumber?.length ?? 0,
      sessionMatchesProfile:
        sessionAgentNumber !== null &&
        profileAgentNumber !== null &&
        sessionAgentNumber === profileAgentNumber,
    },
    counts: {
      userScopedClients: userScopedClients.length,
      serviceRoleExactMatch: serviceRoleMatchCount,
    },
    serviceRoleDistinctSample,
    profileInDistinctSample: sessionAgentNumber
      ? serviceRoleDistinctSample.includes(sessionAgentNumber)
      : false,
    rlsLikelyBlocking:
      serviceRoleMatchCount > 0 && userScopedClients.length === 0,
    mismatchLikely:
      serviceRoleMatchCount === 0 &&
      sessionAgentNumber !== null &&
      serviceRoleDistinctSample.length > 0,
  };

  writeAgentNumberDebugLog({
    runId: "diagnostic",
    hypothesisId: "H1-H5",
    location: "api/debug/agent-number-diagnostic",
    message: "agent number diagnostic",
    data: diagnostic,
  });

  return NextResponse.json(diagnostic);
}
