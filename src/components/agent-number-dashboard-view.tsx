"use client";

import { useEffect, useMemo } from "react";

import { formatCurrency } from "@/lib/dashboard/formatters";
import {
  isFailedLeadStatusContaining,
  isInProgressLeadStatus,
  isSuccessfulLeadStatus,
} from "@/lib/dashboard/lead-statuses";
import { getLeadStatusBadgeClass, getLeadStatusLabel } from "@/lib/dashboard/status";
import type { ClientRecord } from "@/lib/types";

type AgentNumberDashboardViewProps = {
  clients: ClientRecord[];
  role: string;
  agentNumber?: string;
  appliedFilter?: string;
};

type StatusSectionProps = {
  title: string;
  clients: ClientRecord[];
};

function StatusSection({ title, clients }: StatusSectionProps) {
  const totals = useMemo(() => {
    return clients.reduce(
      (acc, client) => {
        acc.agentCommission += client.expectedCommission;
        acc.agentNumberPayment += client.paymentToAgentNumber ?? 0;
        return acc;
      },
      { agentCommission: 0, agentNumberPayment: 0 }
    );
  }, [clients]);

  return (
    <section className="dashboard-card" dir="rtl">
      <div className="section-header">
        <h2>{title}</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span>מספר לידים</span>
            <strong>{clients.length}</strong>
          </div>
          <div className="kpi-card">
            <span>תשלום לסוכן</span>
            <strong>{formatCurrency(totals.agentCommission)}</strong>
          </div>
          <div className="kpi-card">
            <span>תשלום למספר סוכן</span>
            <strong>{formatCurrency(totals.agentNumberPayment)}</strong>
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th>סוכן מפנה</th>
              <th className="loan-amount-cell">תשלום לסוכן</th>
              <th className="loan-amount-cell">תשלום למספר סוכן</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={5}>
                  אין לידים בקטגוריה זו.
                </td>
              </tr>
            ) : null}
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="td-name">{client.clientName}</td>
                <td>{client.referringAgentText?.trim() || "—"}</td>
                <td className="loan-amount-cell">
                  <span className="loan-amount-inner">{formatCurrency(client.expectedCommission)}</span>
                </td>
                <td className="loan-amount-cell">
                  <span className="loan-amount-inner">
                    {formatCurrency(client.paymentToAgentNumber ?? 0)}
                  </span>
                </td>
                <td>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getLeadStatusBadgeClass(
                      client.leadStatus
                    )}`}
                  >
                    {getLeadStatusLabel(client.leadStatus)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AgentNumberDashboardView({
  clients,
  role,
  agentNumber,
  appliedFilter,
}: AgentNumberDashboardViewProps) {
  const uniqueAgentNumbers = useMemo(
    () =>
      [
        ...new Set(
          clients
            .map((client) => client.agentNumber?.trim())
            .filter((value): value is string => Boolean(value))
        ),
      ].sort(),
    [clients]
  );

  const successfulLeads = useMemo(
    () => clients.filter((client) => isSuccessfulLeadStatus(client.leadStatus)),
    [clients]
  );
  const inProgressLeads = useMemo(
    () => clients.filter((client) => isInProgressLeadStatus(client.leadStatus)),
    [clients]
  );
  const failedLeads = useMemo(
    () => clients.filter((client) => isFailedLeadStatusContaining(client.leadStatus)),
    [clients]
  );

  useEffect(() => {
    const debugPayload = {
      role,
      agentNumber: agentNumber ?? null,
      clientsCount: clients.length,
      uniqueAgentNumbers,
      appliedFilter: appliedFilter ?? null,
    };
    console.log("[AgentNumberDashboardView]", debugPayload);
  }, [role, agentNumber, clients.length, uniqueAgentNumbers, appliedFilter]);

  return (
    <div className="agent-dashboard-shell">
      <section className="card p-6" dir="rtl">
        <h2 className="admin-analytics-title">תצוגה לפי מספר סוכן</h2>
        <p className="admin-analytics-subtitle text-sm text-slate-600">
          מציג רק את הלידים המשויכים למספר הסוכן שלך: <strong>{agentNumber || "לא הוגדר"}</strong>
        </p>
      </section>

      <section className="stats-row" dir="rtl">
        <article className="card stat-card stat-card--indigo">
          <p className="stat-label">Debug: תפקיד מחובר</p>
          <p className="stat-value stat-value-compact">{role}</p>
        </article>
        <article className="card stat-card stat-card--emerald">
          <p className="stat-label">Debug: מספר סוכן בפרופיל</p>
          <p className="stat-value stat-value-compact">{agentNumber || "לא הוגדר"}</p>
        </article>
        <article className="card stat-card stat-card--teal">
          <p className="stat-label">Debug: לידים שהתקבלו מהשרת</p>
          <p className="stat-value">{clients.length}</p>
        </article>
        <article className="card stat-card stat-card--rose">
          <p className="stat-label">Debug: מספרי סוכן ייחודיים בנתונים</p>
          <p className="stat-value stat-value-compact">
            {uniqueAgentNumbers.length > 0 ? uniqueAgentNumbers.join(" · ") : "—"}
          </p>
        </article>
      </section>

      {appliedFilter ? (
        <section className="card p-4" dir="rtl">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Debug: סינון שרת:</span> {appliedFilter}
          </p>
        </section>
      ) : null}
      <StatusSection title="לידים שבוצעו בהצלחה" clients={successfulLeads} />
      <StatusSection title="לידים בתהליך" clients={inProgressLeads} />
      <StatusSection title="לידים ללא הצלחה" clients={failedLeads} />
    </div>
  );
}
