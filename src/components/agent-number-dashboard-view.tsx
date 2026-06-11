"use client";

import { useMemo } from "react";

import { formatClientDealDate, formatCurrency } from "@/lib/dashboard/formatters";
import {
  isFailedLeadStatusContaining,
  isInProgressLeadStatus,
  isSuccessfulLeadStatus,
} from "@/lib/dashboard/lead-statuses";
import { getLeadStatusBadgeClass, getLeadStatusLabel } from "@/lib/dashboard/status";
import type { ClientRecord } from "@/lib/types";

type AgentNumberDashboardViewProps = {
  clients: ClientRecord[];
  agentNumber?: string;
};

type StatusSectionProps = {
  title: string;
  clients: ClientRecord[];
  paymentKpiLabel: string;
  paymentColumnLabel: string;
};

function StatusSection({
  title,
  clients,
  paymentKpiLabel,
  paymentColumnLabel,
}: StatusSectionProps) {
  const totals = useMemo(() => {
    return clients.reduce(
      (acc, client) => {
        acc.agentNumberPayment += client.paymentToAgentNumber ?? 0;
        return acc;
      },
      { agentNumberPayment: 0 }
    );
  }, [clients]);

  return (
    <section className="dashboard-card" dir="rtl">
      <div className="section-header">
        <h2>{title}</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span>כמות עסקאות</span>
            <strong>{clients.length}</strong>
          </div>
          <div className="kpi-card">
            <span>{paymentKpiLabel}</span>
            <strong>{formatCurrency(totals.agentNumberPayment)}</strong>
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th className="loan-amount-cell">{paymentColumnLabel}</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={3}>
                  אין לידים בקטגוריה זו.
                </td>
              </tr>
            ) : null}
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="td-name">{client.clientName}</td>
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

function FailedLeadsSection({ clients }: { clients: ClientRecord[] }) {
  return (
    <section className="dashboard-card" dir="rtl">
      <div className="section-header">
        <h2>עסקאות שלא התקדמו</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span>כמות עסקאות</span>
            <strong>{clients.length}</strong>
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th>תאריך ביצוע</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={3}>
                  אין לידים בקטגוריה זו.
                </td>
              </tr>
            ) : null}
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="td-name">{client.clientName}</td>
                <td>{formatClientDealDate(client)}</td>
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
  agentNumber,
}: AgentNumberDashboardViewProps) {
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

  return (
    <div className="agent-dashboard-shell">
      <section className="card p-6" dir="rtl">
        <p className="admin-analytics-subtitle text-sm text-slate-600">
          מספר סוכן: <strong>{agentNumber || "לא הוגדר"}</strong>
        </p>
      </section>
      <StatusSection
        title="עסקאות שבוצעו בהצלחה"
        clients={successfulLeads}
        paymentKpiLabel="סך עמלות ששולמו לסוכן"
        paymentColumnLabel="עמלות"
      />
      <StatusSection
        title="עסקאות בתהליך"
        clients={inProgressLeads}
        paymentKpiLabel="עמלה פוטנציאלית"
        paymentColumnLabel="עמלה פוטנציאלית"
      />
      <FailedLeadsSection clients={failedLeads} />
    </div>
  );
}
