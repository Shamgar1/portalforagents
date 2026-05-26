import { redirect } from "next/navigation";

import { AgentNumberDashboardView } from "@/components/agent-number-dashboard-view";
import { AdminAgentManagement } from "@/components/admin-agent-management";
import { AdminAnalytics } from "@/components/admin-analytics";
import { AgentDashboardView } from "@/components/agent-dashboard-view";
import { DashboardClient } from "@/components/dashboard-client";
import { LogoutButton } from "@/components/logout-button";
import { MasterDashboardView } from "@/components/master-dashboard-view";
import { getSessionUser } from "@/lib/auth/session";
import { getClientService } from "@/lib/data/client-service";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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
  const clients = await clientService.listClientsForUser(user);
  const isAdmin = user.role === "admin";
  const isMaster = user.role === "master";
  const isAgentNumber = user.role === "agent_number";
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
          <MasterDashboardView clients={clients} role="master" />
        ) : isAgentNumber ? (
          <AgentNumberDashboardView clients={clients} agentNumber={user.agentNumber} />
        ) : (
          <AgentDashboardView clients={clients} />
        )}
      </main>
    </div>
  );
}
