"use client";

import { useCallback, useEffect, useState } from "react";

type AgentRow = {
  id: string;
  email: string;
  fullName: string;
};

export function AdminAgentManagement() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/agents", { credentials: "include" });
      const payload = (await response.json()) as { agents?: AgentRow[]; error?: string };

      if (!response.ok) {
        setAgents([]);
        setError(payload.error ?? "טעינת הסוכנים נכשלה.");
        return;
      }

      setAgents(payload.agents ?? []);
    } catch {
      setAgents([]);
      setError("טעינת הסוכנים נכשלה.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateMessage(null);

    try {
      const response = await fetch("/api/admin/agents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setCreateMessage(payload.error ?? "יצירת הסוכן נכשלה.");
        return;
      }

      setCreateMessage("הסוכן נוצר בהצלחה.");
      setEmail("");
      setPassword("");
      setFullName("");
      await loadAgents();
    } catch {
      setCreateMessage("יצירת הסוכן נכשלה.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="admin-agents card" dir="rtl">
      <h2 className="admin-analytics-title">ניהול סוכנים</h2>
      <p className="admin-analytics-subtitle text-sm text-slate-600 mb-4">
        רשימת סוכנים (פרופיל עם תפקיד agent) ויצירת משתמש חדש ב-Supabase Auth.
      </p>

      {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}

      <div className="table-wrap mb-8">
        <table>
          <thead>
            <tr>
              <th>שם מלא</th>
              <th>אימייל</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2} className="table-empty">
                  טוען…
                </td>
              </tr>
            ) : null}
            {!loading && agents.length === 0 && !error ? (
              <tr>
                <td colSpan={2} className="table-empty">
                  לא נמצאו סוכנים.
                </td>
              </tr>
            ) : null}
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td className="td-name">{agent.fullName || "—"}</td>
                <td className="text-sm text-slate-700" dir="ltr">
                  {agent.email || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-base font-semibold text-slate-900 mb-3">הוספת סוכן</h3>
      <form onSubmit={handleCreate} className="admin-agent-form grid gap-4 max-w-xl">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">שם מלא</span>
          <input
            className="table-select w-full max-w-none rounded-xl"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            autoComplete="name"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">אימייל</span>
          <input
            type="email"
            className="table-select w-full max-w-none rounded-xl"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            dir="ltr"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">סיסמה</span>
          <input
            type="password"
            className="table-select w-full max-w-none rounded-xl"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="btn btn-primary w-fit" disabled={creating}>
          {creating ? "יוצר…" : "צור סוכן"}
        </button>
      </form>
      {createMessage ? (
        <p className={`text-sm mt-3 ${createMessage.includes("נכשל") ? "text-red-600" : "text-emerald-700"}`}>
          {createMessage}
        </p>
      ) : null}
    </section>
  );
}
