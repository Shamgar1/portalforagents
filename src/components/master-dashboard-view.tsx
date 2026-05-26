"use client";

import { useMemo, useState } from "react";

import { formatCurrency } from "@/lib/dashboard/formatters";
import {
  isFailedLeadStatusContaining,
  isInProgressLeadStatus,
  isSuccessfulLeadStatus,
} from "@/lib/dashboard/lead-statuses";
import { getLeadStatusBadgeClass, getLeadStatusLabel } from "@/lib/dashboard/status";
import type { ClientRecord } from "@/lib/types";

type MasterDashboardViewProps = {
  clients: ClientRecord[];
  role: "master";
};

type StatusBucket = "all" | "successful" | "in_progress" | "failed";
type SortBy = "agent_number_asc" | "agent_number_desc";

function byStatusBucket(clients: ClientRecord[], bucket: StatusBucket): ClientRecord[] {
  if (bucket === "successful") {
    return clients.filter((client) => isSuccessfulLeadStatus(client.leadStatus));
  }
  if (bucket === "failed") {
    return clients.filter((client) => isFailedLeadStatusContaining(client.leadStatus));
  }
  if (bucket === "in_progress") {
    return clients.filter((client) => isInProgressLeadStatus(client.leadStatus));
  }
  return clients;
}

function normalizeAgentNumber(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "ללא מספר סוכן";
}

export function MasterDashboardView({ clients, role }: MasterDashboardViewProps) {
  const [statusBucket, setStatusBucket] = useState<StatusBucket>("all");
  const [selectedAgentNumber, setSelectedAgentNumber] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("agent_number_asc");

  const clientsWithAgentNumber = useMemo(
    () => clients.filter((client) => Boolean(client.agentNumber?.trim())),
    [clients]
  );

  const overallSummary = useMemo(() => {
    return clientsWithAgentNumber.reduce(
      (acc, client) => {
        acc.totalLeads += 1;
        acc.totalAgentCommission += client.masterPayment ?? 0;
        acc.totalAgentNumberPayment += client.paymentToAgentNumber ?? 0;

        if (isSuccessfulLeadStatus(client.leadStatus)) {
          acc.successful += 1;
        } else if (isFailedLeadStatusContaining(client.leadStatus)) {
          acc.failed += 1;
        } else {
          acc.inProgress += 1;
        }
        return acc;
      },
      {
        totalLeads: 0,
        successful: 0,
        failed: 0,
        inProgress: 0,
        totalAgentCommission: 0,
        totalAgentNumberPayment: 0,
      }
    );
  }, [clientsWithAgentNumber]);

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

  const availableAgentNumbers = useMemo(() => {
    return distinctAgentNumbers;
  }, [distinctAgentNumbers]);

  const visibleClients = useMemo(() => {
    const statusFiltered = byStatusBucket(clientsWithAgentNumber, statusBucket);
    const numberFiltered =
      selectedAgentNumber === "all"
        ? statusFiltered
        : statusFiltered.filter(
            (client) => client.agentNumber?.trim() === selectedAgentNumber
          );

    return [...numberFiltered].sort((left, right) => {
      const leftNumber = normalizeAgentNumber(left.agentNumber);
      const rightNumber = normalizeAgentNumber(right.agentNumber);
      const comparison = leftNumber.localeCompare(rightNumber, "he", { numeric: true });
      return sortBy === "agent_number_asc" ? comparison : -comparison;
    });
  }, [clientsWithAgentNumber, selectedAgentNumber, sortBy, statusBucket]);

  const groupedByAgentNumber = useMemo(() => {
    const map = new Map<
      string,
      { leads: number; successful: number; inProgress: number; failed: number; paymentToAgentNumber: number }
    >();

    for (const client of byStatusBucket(clientsWithAgentNumber, statusBucket)) {
      const key = normalizeAgentNumber(client.agentNumber);
      const existing = map.get(key) ?? {
        leads: 0,
        successful: 0,
        inProgress: 0,
        failed: 0,
        paymentToAgentNumber: 0,
      };
      existing.leads += 1;
      existing.paymentToAgentNumber += client.paymentToAgentNumber ?? 0;
      if (isSuccessfulLeadStatus(client.leadStatus)) existing.successful += 1;
      else if (isFailedLeadStatusContaining(client.leadStatus)) existing.failed += 1;
      else existing.inProgress += 1;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([agentNumber, totals]) => ({ agentNumber, ...totals }))
      .sort((left, right) =>
        left.agentNumber.localeCompare(right.agentNumber, "he", { numeric: true })
      );
  }, [clientsWithAgentNumber, statusBucket]);

  return (
    <section className="grid gap-6 max-w-6xl mx-auto w-full" dir="rtl">
      <section className="stats-row">
        <article className="card stat-card">
          <p className="stat-label">Debug: role</p>
          <p className="stat-value">{role}</p>
          <p className="stat-sub">role שהקומפוננטה קיבלה מהשרת</p>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Debug: שורות נטענו</p>
          <p className="stat-value">{clients.length}</p>
          <p className="stat-sub">שורות כולל הכל מהשרת למאסטר</p>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Debug: עם מספר סוכן</p>
          <p className="stat-value">{clientsWithAgentNumber.length}</p>
          <p className="stat-sub">agent_number לא ריק / לא null</p>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Debug: מספרים ייחודיים</p>
          <p className="stat-value">{distinctAgentNumbers.length}</p>
          <p className="stat-sub">
            {distinctAgentNumbers.length > 0 ? distinctAgentNumbers.join(" · ") : "אין מספרים"}
          </p>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Debug: פילטר נבחר</p>
          <p className="stat-value">{selectedAgentNumber === "all" ? "all" : selectedAgentNumber}</p>
          <p className="stat-sub">כלומר מה מוצג כרגע בטבלה</p>
        </article>
        <article className="card stat-card stat-card--indigo">
          <p className="stat-label">סה"כ לידים (כל הסוכנים)</p>
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
          <p className="stat-label">לידים ללא הצלחה</p>
          <p className="stat-value">{overallSummary.failed}</p>
        </article>
        <article className="card stat-card stat-card--violet">
          <p className="stat-label">סה"כ תשלום למאסטר</p>
          <p className="stat-value stat-value-compact">
            {formatCurrency(overallSummary.totalAgentCommission)}
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
            <span className="table-count-badge">{visibleClients.length} רשומות</span>
            <select
              className="table-select"
              value={statusBucket}
              onChange={(event) => setStatusBucket(event.target.value as StatusBucket)}
              aria-label="סינון לפי סטטוס"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="successful">לידים מוצלחים</option>
              <option value="in_progress">לידים בתהליך</option>
              <option value="failed">לידים ללא הצלחה</option>
            </select>
            <select
              className="table-select"
              value={selectedAgentNumber}
              onChange={(event) => setSelectedAgentNumber(event.target.value)}
              aria-label="סינון לפי מספר סוכן"
            >
              <option value="all">כל מספרי הסוכן</option>
              {availableAgentNumbers.map((agentNumber) => (
                <option key={agentNumber} value={agentNumber}>
                  {agentNumber}
                </option>
              ))}
            </select>
            <select
              className="table-select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              aria-label="מיון לפי מספר סוכן"
            >
              <option value="agent_number_asc">מיון מספר סוכן: מהנמוך לגבוה</option>
              <option value="agent_number_desc">מיון מספר סוכן: מהגבוה לנמוך</option>
            </select>
          </div>
          <div className="table-card-title-group">
            <h2 className="table-card-title">תצוגת מאסטר</h2>
            <p className="table-card-subtitle">סיכום כולל + טבלת לידים לפי מספר סוכן וסטטוס.</p>
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
              {visibleClients.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={6}>
                    לא נמצאו רשומות.
                  </td>
                </tr>
              ) : null}
              {visibleClients.map((client) => (
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

      <section className="card p-6">
        <h3 className="admin-analytics-title">סיכום לפי מספר סוכן</h3>
        <p className="admin-analytics-subtitle text-sm text-slate-600 mb-4">
          הקבצה לפי מספר סוכן בהתאם לסינון הסטטוס.
        </p>
        <div className="table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>מספר סוכן</th>
                <th>סה"כ לידים</th>
                <th>מוצלחים</th>
                <th>בתהליך</th>
                <th>ללא הצלחה</th>
                <th className="loan-amount-cell">סה"כ תשלום למספר סוכן</th>
              </tr>
            </thead>
            <tbody>
              {groupedByAgentNumber.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={6}>
                    אין נתונים להצגה.
                  </td>
                </tr>
              ) : null}
              {groupedByAgentNumber.map((row) => (
                <tr key={row.agentNumber}>
                  <td className="td-name">{row.agentNumber}</td>
                  <td>{row.leads}</td>
                  <td>{row.successful}</td>
                  <td>{row.inProgress}</td>
                  <td>{row.failed}</td>
                  <td className="loan-amount-cell">
                    <span className="loan-amount-inner">{formatCurrency(row.paymentToAgentNumber)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
