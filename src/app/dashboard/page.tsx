import { redirect } from "next/navigation";

import { AgentNumberDashboardView } from "@/components/agent-number-dashboard-view";
import { AdminAgentManagement } from "@/components/admin-agent-management";
import { AdminAnalytics } from "@/components/admin-analytics";
import { AgentDashboardView } from "@/components/agent-dashboard-view";
import { DashboardClient } from "@/components/dashboard-client";
import { LogoutButton } from "@/components/logout-button";
import { MasterDashboardView } from "@/components/master-dashboard-view";
import {
  loadAgentNumberDiagnostic,
  writeAgentNumberDebugLog,
} from "@/lib/debug/agent-number-debug";
import { getSessionUser } from "@/lib/auth/session";
import { getClientService } from "@/lib/data/client-service";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ClientRecord } from "@/lib/types";

type MasterClientRow = {
  id: string;
  client_name: string;
  status: string;
  loan_amount: number;
  expected_commission: number;
  agent_number: string | null;
  payment_to_agent_number: number | null;
  master_payment: number | null;
  deal_creation_date: string | null;
  created_at: string;
  referring_agent_text: string | null;
};

async function loadMasterClientsDirectly(): Promise<ClientRecord[]> {
  const admin = getSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from("clients")
    .select(
      "id, client_name, status, loan_amount, expected_commission, agent_number, payment_to_agent_number, master_payment, deal_creation_date, created_at, referring_agent_text"
    )
    .not("agent_number", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as MasterClientRow[]).map((client) => ({
    id: client.id,
    clientName: client.client_name,
    leadStatus: client.status,
    loanAmount: client.loan_amount,
    expectedCommission: client.expected_commission,
    agentNumber: client.agent_number?.trim() || undefined,
    paymentToAgentNumber: client.payment_to_agent_number ?? undefined,
    masterPayment: client.master_payment ?? undefined,
    referringAgentText: client.referring_agent_text ?? undefined,
    assignedAgentId: "",
    createdAt: client.created_at,
    dealCreatedAt: client.deal_creation_date ?? null,
  }));
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="page-content">
        <div className="page-heading">
          <h1>יש להגדיר Supabase</h1>
          <p>הוסיפו את משתני הסביבה ולאחר מכן התחברו עם משתמש אמיתי מתוך Supabase Auth.</p>
        </div>
      </main>
    );
  }

  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const clientService = getClientService();
  const clients =
    user.role === "master"
      ? await loadMasterClientsDirectly()
      : await clientService.listClientsForUser(user);
  const isAdmin = user.role === "admin";
  const isMaster = user.role === "master";
  const isAgentNumber = user.role === "agent_number";

  const agentNumberDiagnostic = isAgentNumber
    ? await loadAgentNumberDiagnostic(user.agentNumber, clients.length)
    : null;

  if (agentNumberDiagnostic) {
    // #region agent log
    writeAgentNumberDebugLog({
      runId: "agent-number-debug",
      hypothesisId: "H1-H3",
      location: "dashboard/page.tsx:diagnostic",
      message: "agent number dashboard diagnostic",
      data: agentNumberDiagnostic,
    });
    // #endregion
  }

  // #region agent log
  {
    const distinctAgentNumbers = [
      ...new Set(
        clients
          .map((c) => c.agentNumber?.trim())
          .filter((n): n is string => Boolean(n))
      ),
    ].sort();
    writeAgentNumberDebugLog({
      runId: "agent-number-debug",
      hypothesisId: "H1-H5",
      location: "dashboard/page.tsx:afterLoadClients",
      message: "dashboard clients loaded",
      data: {
        userRole: user.role,
        userIdSuffix: user.id.slice(-6),
        sessionAgentNumber: user.agentNumber ?? null,
        sessionAgentNumberLen: user.agentNumber?.length ?? 0,
        clientsCount: clients.length,
        distinctAgentNumbersCount: distinctAgentNumbers.length,
        distinctAgentNumbersSample: distinctAgentNumbers.slice(0, 15),
        loadPath: user.role === "master" ? "service_role_direct" : "listClientsForUser",
      },
    });
  }
  // #endregion

  if (isMaster) {
    console.log("[master dashboard] direct clients loaded", { total: clients.length });
  }
  const roleLabel =
    user.role === "admin"
      ? "מנהל"
      : user.role === "master"
        ? "מאסטר"
        : user.role === "agent_number"
          ? "סוכן לפי מספר"
          : "סוכן";

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="brand">
            <div className="brand-mark">
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path d="M3 9h12M9 3v12" />
              </svg>
            </div>
            פורטל סוכנים
          </div>

          <div className="navbar-end">
            <div className="user-chip">
              <div className="user-avatar" aria-hidden="true">
                {user.name[0]}
              </div>
              <span className="user-chip-name">{user.name}</span>
            </div>
            <span className="role-badge">{roleLabel}</span>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="page-content">
        <div className="page-heading">
          <h1>שלום, {user.name}</h1>
          <p>
            {isAdmin
              ? "אתה יכול לצפות בכל הלידים וגם להוסיף ליד ידנית."
              : isMaster
                ? "אתה יכול לצפות בכל הלידים לפי מספרי סוכן ולסנן לפי סטטוס."
                : isAgentNumber
                  ? "מוצגים רק הלידים המשויכים למספר הסוכן שלך."
              : "מוצגים רק הלידים והעסקאות שמשויכים אליך, בתצוגה לקריאה בלבד."}
          </p>
        </div>

        {isAdmin ? (
          <div className="grid gap-8 max-w-6xl mx-auto w-full">
            <AdminAgentManagement />
            <AdminAnalytics clients={clients} />
            <DashboardClient clients={clients} canAddManualLead />
          </div>
        ) : isMaster ? (
          <MasterDashboardView clients={clients} />
        ) : isAgentNumber ? (
          <AgentNumberDashboardView
            clients={clients}
            role={user.role}
            agentNumber={user.agentNumber}
            appliedFilter={`clients.agent_number = "${user.agentNumber?.trim() ?? ""}"`}
          />
        ) : (
          <AgentDashboardView clients={clients} />
        )}
      </main>
    </div>
  );
}
