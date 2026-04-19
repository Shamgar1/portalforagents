import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getClientService } from "@/lib/data/client-service";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import { createManualLeadAction } from "./actions";

const leadStatusOptions = ["חדש", "בבדיקה", "אושר", "מומן", "בוצע ושולם"];

export default async function NewLeadPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="page-content">
        <div className="page-heading">
          <h1>יש להגדיר Supabase</h1>
          <p>לא ניתן להוסיף ליד ידנית לפני שמחברים את המערכת ל-Supabase.</p>
        </div>
      </main>
    );
  }

  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const clientService = getClientService();
  const agents = await clientService.listAssignableAgents();

  return (
    <main className="page-content">
      <div className="page-heading">
        <h1>הוספת ליד ידנית</h1>
        <p>הזינו ליד חדש ידנית. מקור הנתון יישמר כעת כ-Supabase, עד שתחובר אינטגרציית Monday.</p>
      </div>

      <form action={createManualLeadAction} className="card manual-lead-form">
        <div className="manual-lead-grid">
          <div className="field">
            <label className="field-label" htmlFor="clientName">
              שם לקוח
            </label>
            <input className="field-input field-input-rtl" id="clientName" name="clientName" required />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="leadStatus">
              סטטוס ליד
            </label>
            <select className="field-select" id="leadStatus" name="leadStatus" defaultValue="חדש">
              {leadStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="assignedAgentId">
              שיוך לסוכן
            </label>
            <select className="field-select" id="assignedAgentId" name="assignedAgentId" required>
              <option value="">בחרו סוכן</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="referringAgentText">
              סוכן מפנה
            </label>
            <input
              className="field-input field-input-rtl"
              id="referringAgentText"
              name="referringAgentText"
              placeholder="שדה חופשי, למקרה שנרצה למפות בעתיד ל-Monday"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="loanAmount">
              סכום הלוואה
            </label>
            <input
              className="field-input"
              id="loanAmount"
              name="loanAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="expectedCommission">
              דמי טיפול
            </label>
            <input
              className="field-input"
              id="expectedCommission"
              name="expectedCommission"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              required
            />
          </div>
        </div>

        <div className="manual-lead-actions">
          <button className="btn btn-primary" type="submit">
            שמירת ליד
          </button>
          <Link href="/dashboard" className="btn btn-outline">
            חזרה לדשבורד
          </Link>
        </div>
      </form>
    </main>
  );
}
