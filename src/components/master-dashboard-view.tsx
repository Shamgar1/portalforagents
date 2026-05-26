"use client";

import { useMemo, useState } from "react";

import { dealOrRecordTimeMs, formatCurrency } from "@/lib/dashboard/formatters";
import {
  isFailedLeadStatusContaining,
  isInProgressLeadStatus,
  isSuccessfulLeadStatus,
} from "@/lib/dashboard/lead-statuses";
import { getLeadStatusBadgeClass, getLeadStatusLabel } from "@/lib/dashboard/status";
import type { ClientRecord } from "@/lib/types";

type MasterDashboardViewProps = {
  clients: ClientRecord[];
};

type MonthFilter = "all" | "current" | "previous";

function normalizeAgentNumber(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "ללא מספר סוכן";
}

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function previousMonthKey(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return monthKey(d);
}

function clientDate(client: ClientRecord): Date | null {
  const ms = dealOrRecordTimeMs(client.dealCreatedAt, client.createdAt);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

type SectionStats = {
  count: number;
  totalMasterPayment: number;
  totalAgentNumberPayment: number;
};

function sectionStats(rows: ClientRecord[]): SectionStats {
  return rows.reduce(
    (acc, row) => {
      acc.count += 1;
      acc.totalMasterPayment += row.masterPayment ?? 0;
      acc.totalAgentNumberPayment += row.paymentToAgentNumber ?? 0;
      return acc;
    },
    { count: 0, totalMasterPayment: 0, totalAgentNumberPayment: 0 }
  );
}

type LeadSectionProps = {
  title: string;
  rows: ClientRecord[];
};

function LeadSection({ title, rows }: LeadSectionProps) {
  const stats = useMemo(() => sectionStats(rows), [rows]);

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="admin-analytics-title">{title}</h3>
          <p className="admin-analytics-subtitle text-sm text-slate-600">
            כמות לידים: <strong>{stats.count}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="table-count-badge">
            תשלום למאסטר: {formatCurrency(stats.totalMasterPayment)}
          </span>
          <span className="table-count-badge">
            תשלום למספר סוכן: {formatCurrency(stats.totalAgentNumberPayment)}
          </span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th>סוכן מפנה</th>
              <th>מספר סוכן</th>
              <th className="loan-amount-cell">תשלום למאסטר</th>
              <th className="loan-amount-cell">תשלום למספר סוכן</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={6}>
                  אין נתונים להצגה.
                </td>
              </tr>
            ) : null}
            {rows.map((client) => (
              <tr key={client.id}>
                <td className="td-name">{client.clientName}</td>
                <td>{client.referringAgentText?.trim() || "—"}</td>
                <td>{normalizeAgentNumber(client.agentNumber)}</td>
                <td className="loan-amount-cell">
                  <span className="loan-amount-inner">
                    {formatCurrency(client.masterPayment ?? 0)}
                  </span>
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

export function MasterDashboardView({ clients }: MasterDashboardViewProps) {
  const [selectedAgentNumber, setSelectedAgentNumber] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<MonthFilter>("all");

  const clientsWithAgentNumber = useMemo(
    () => clients.filter((client) => Boolean(client.agentNumber?.trim())),
    [clients]
  );

  const distinctAgentNumbers = useMemo(
    () =>
      Array.from(
        new Set(
          clientsWithAgentNumber
            .map((client) => client.agentNumber?.trim())
            .filter((x): x is string => Boolean(x))
        )
      ).sort((left, right) => left.localeCompare(right, "he", { numeric: true })),
    [clientsWithAgentNumber]
  );

  const filteredClients = useMemo(() => {
    const byAgent =
      selectedAgentNumber === "all"
        ? clientsWithAgentNumber
        : clientsWithAgentNumber.filter(
            (client) => client.agentNumber?.trim() === selectedAgentNumber
          );

    const now = new Date();
    const current = monthKey(now);
    const previous = previousMonthKey(now);

    const byMonth =
      selectedMonth === "all"
        ? byAgent
        : byAgent.filter((client) => {
            const d = clientDate(client);
            if (!d) return false;
            const key = monthKey(d);
            return selectedMonth === "current" ? key === current : key === previous;
          });

    return [...byMonth].sort((left, right) => {
      const leftNumber = normalizeAgentNumber(left.agentNumber);
      const rightNumber = normalizeAgentNumber(right.agentNumber);
      return leftNumber.localeCompare(rightNumber, "he", { numeric: true });
    });
  }, [clientsWithAgentNumber, selectedAgentNumber, selectedMonth]);

  const overallSummary = useMemo(() => {
    return filteredClients.reduce(
      (acc, client) => {
        acc.totalLeads += 1;
        acc.totalMasterPayment += client.masterPayment ?? 0;
        acc.totalAgentNumberPayment += client.paymentToAgentNumber ?? 0;
        if (isSuccessfulLeadStatus(client.leadStatus)) acc.successful += 1;
        else if (isFailedLeadStatusContaining(client.leadStatus)) acc.failed += 1;
        else if (isInProgressLeadStatus(client.leadStatus)) acc.inProgress += 1;
        return acc;
      },
      {
        totalLeads: 0,
        successful: 0,
        inProgress: 0,
        failed: 0,
        totalMasterPayment: 0,
        totalAgentNumberPayment: 0,
      }
    );
  }, [filteredClients]);

  const successfulRows = useMemo(
    () => filteredClients.filter((client) => isSuccessfulLeadStatus(client.leadStatus)),
    [filteredClients]
  );
  const inProgressRows = useMemo(
    () => filteredClients.filter((client) => isInProgressLeadStatus(client.leadStatus)),
    [filteredClients]
  );
  const failedRows = useMemo(
    () => filteredClients.filter((client) => isFailedLeadStatusContaining(client.leadStatus)),
    [filteredClients]
  );

  return (
    <section className="grid gap-6 max-w-6xl mx-auto w-full" dir="rtl">
      <section className="stats-row">
        <article className="card stat-card stat-card--indigo">
          <p className="stat-label">סה״כ לידים</p>
          <p className="stat-value">{overallSummary.totalLeads}</p>
        </article>
        <article className="card stat-card stat-card--emerald">
          <p className="stat-label">לידים מוצלחים</p>
          <p className="stat-value">{overallSummary.successful}</p>
        </article>
        <article className="card stat-card stat-card--teal">
          <p className="stat-label">לידים בתהליך</p>
          <p className="stat-value">{overallSummary.inProgress}</p>
        </article>
        <article className="card stat-card stat-card--rose">
          <p className="stat-label">לידים נסגרו ללא הצלחה</p>
          <p className="stat-value">{overallSummary.failed}</p>
        </article>
        <article className="card stat-card stat-card--violet">
          <p className="stat-label">סה"כ תשלום למאסטר</p>
          <p className="stat-value stat-value-compact">
            {formatCurrency(overallSummary.totalMasterPayment)}
          </p>
        </article>
        <article className="card stat-card stat-card--indigo">
          <p className="stat-label">סה"כ תשלום למספר סוכן</p>
          <p className="stat-value stat-value-compact">
            {formatCurrency(overallSummary.totalAgentNumberPayment)}
          </p>
        </article>
      </section>

      <section className="table-card">
        <div className="table-card-toolbar table-card-toolbar--compact">
          <div className="table-card-controls">
            <span className="table-count-badge">{filteredClients.length} רשומות</span>
            <select
              className="table-select"
              value={selectedAgentNumber}
              onChange={(event) => setSelectedAgentNumber(event.target.value)}
              aria-label="סינון לפי מספר סוכן"
            >
              <option value="all">כל מספרי הסוכן</option>
              {distinctAgentNumbers.map((agentNumber) => (
                <option key={agentNumber} value={agentNumber}>
                  {agentNumber}
                </option>
              ))}
            </select>
            <select
              className="table-select"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value as MonthFilter)}
              aria-label="סינון לפי חודש"
            >
              <option value="current">חודש נוכחי</option>
              <option value="previous">חודש קודם</option>
              <option value="all">הכל</option>
            </select>
          </div>
          <div className="table-card-title-group">
            <h2 className="table-card-title">סינון מאסטר</h2>
            <p className="table-card-subtitle">סינון לפי מספר סוכן וחודש.</p>
          </div>
        </div>
      </section>

      <LeadSection title="בוצע ושולם" rows={successfulRows} />
      <LeadSection title="לקוחות בתהליך" rows={inProgressRows} />
      <LeadSection title="לקוחות נסגרו ללא הצלחה" rows={failedRows} />
    </section>
  );
}
