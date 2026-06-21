"use client";

import { useMemo } from "react";

import { formatClientDealDate, formatCurrency } from "@/lib/dashboard/formatters";
import { BrandLogo } from "@/components/brand-logo";
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

const COMPACT_SECTION_STYLE = { padding: "16px 18px" } as const;
const COMPACT_GRID_STYLE = { gap: "10px" } as const;
const COMPACT_CARD_STYLE = { padding: "12px 14px", minHeight: "auto" } as const;
const COMPACT_LABEL_STYLE = { marginBottom: "4px", fontSize: "0.78rem" } as const;
const COMPACT_VALUE_STYLE = { fontSize: "1.35rem", lineHeight: 1.05 } as const;

type SectionTotals = {
  dealsCount: number;
  totalCommissions: number;
  totalAgentCommission: number;
};

function calculateTotals(clients: ClientRecord[]): SectionTotals {
  return clients.reduce(
    (acc, client) => {
      acc.dealsCount += 1;
      acc.totalCommissions += client.expectedCommission ?? 0;
      acc.totalAgentCommission += client.paymentToAgentNumber ?? 0;
      return acc;
    },
    { dealsCount: 0, totalCommissions: 0, totalAgentCommission: 0 }
  );
}

function SuccessfulDealsSection({ clients }: { clients: ClientRecord[] }) {
  const totals = useMemo(() => {
    return calculateTotals(clients);
  }, [clients]);

  return (
    <section className="dashboard-card" dir="rtl" style={COMPACT_SECTION_STYLE}>
      <div className="section-header">
        <h2>עסקאות שבוצעו בהצלחה</h2>
        <div className="kpi-grid" style={COMPACT_GRID_STYLE}>
          <div className="kpi-card" style={COMPACT_CARD_STYLE}>
            <span style={COMPACT_LABEL_STYLE}>כמות עסקאות</span>
            <strong style={COMPACT_VALUE_STYLE}>{totals.dealsCount}</strong>
          </div>
          <div className="kpi-card" style={COMPACT_CARD_STYLE}>
            <span style={COMPACT_LABEL_STYLE}>עמלות</span>
            <strong style={COMPACT_VALUE_STYLE}>{formatCurrency(totals.totalCommissions)}</strong>
          </div>
          <div className="kpi-card" style={COMPACT_CARD_STYLE}>
            <span style={COMPACT_LABEL_STYLE}>סך עמלות ששולמו לסוכן</span>
            <strong style={COMPACT_VALUE_STYLE}>{formatCurrency(totals.totalAgentCommission)}</strong>
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th>תאריך ביצוע</th>
              <th className="loan-amount-cell">עמלות</th>
              <th className="loan-amount-cell">עמלה לסוכן</th>
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
                <td>{formatClientDealDate(client)}</td>
                <td className="loan-amount-cell">
                  <span className="loan-amount-inner">
                    {formatCurrency(client.expectedCommission ?? 0)}
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

function InProgressDealsSection({ clients }: { clients: ClientRecord[] }) {
  const totals = useMemo(() => {
    return calculateTotals(clients);
  }, [clients]);

  return (
    <section className="dashboard-card" dir="rtl" style={COMPACT_SECTION_STYLE}>
      <div className="section-header">
        <h2>עסקאות בתהליך</h2>
        <div className="kpi-grid" style={COMPACT_GRID_STYLE}>
          <div className="kpi-card" style={COMPACT_CARD_STYLE}>
            <span style={COMPACT_LABEL_STYLE}>כמות עסקאות</span>
            <strong style={COMPACT_VALUE_STYLE}>{totals.dealsCount}</strong>
          </div>
          <div className="kpi-card" style={COMPACT_CARD_STYLE}>
            <span style={COMPACT_LABEL_STYLE}>עמלה פוטנציאלית</span>
            <strong style={COMPACT_VALUE_STYLE}>{formatCurrency(totals.totalCommissions)}</strong>
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th className="loan-amount-cell">עמלה פוטנציאלית</th>
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
                    {formatCurrency(client.expectedCommission ?? 0)}
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
    <section className="dashboard-card" dir="rtl" style={COMPACT_SECTION_STYLE}>
      <div className="section-header">
        <h2>עסקאות שלא התקדמו</h2>
        <div className="kpi-grid" style={COMPACT_GRID_STYLE}>
          <div className="kpi-card" style={COMPACT_CARD_STYLE}>
            <span style={COMPACT_LABEL_STYLE}>כמות עסקאות</span>
            <strong style={COMPACT_VALUE_STYLE}>{clients.length}</strong>
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
  const totals = useMemo(() => calculateTotals(clients), [clients]);
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
    <div className="agent-dashboard-shell agent-number-portal">
      <section className="agent-number-brand-banner" dir="rtl">
        <BrandLogo tone="light" />
        <div className="agent-number-agent-chip">
          <span>מספר סוכן</span>
          <strong>{agentNumber || "לא הוגדר"}</strong>
        </div>
      </section>
      <section className="dashboard-card" dir="rtl" style={COMPACT_SECTION_STYLE}>
        <div className="section-header">
          <h2>סיכום</h2>
          <div className="kpi-grid" style={COMPACT_GRID_STYLE}>
            <div className="kpi-card" style={COMPACT_CARD_STYLE}>
              <span style={COMPACT_LABEL_STYLE}>כמות עסקאות</span>
              <strong style={COMPACT_VALUE_STYLE}>{totals.dealsCount}</strong>
            </div>
            <div className="kpi-card" style={COMPACT_CARD_STYLE}>
              <span style={COMPACT_LABEL_STYLE}>עמלות</span>
              <strong style={COMPACT_VALUE_STYLE}>{formatCurrency(totals.totalCommissions)}</strong>
            </div>
            <div className="kpi-card" style={COMPACT_CARD_STYLE}>
              <span style={COMPACT_LABEL_STYLE}>סך עמלות ששולמו לסוכן</span>
              <strong style={COMPACT_VALUE_STYLE}>{formatCurrency(totals.totalAgentCommission)}</strong>
            </div>
          </div>
        </div>
      </section>
      <SuccessfulDealsSection clients={successfulLeads} />
      <InProgressDealsSection clients={inProgressLeads} />
      <FailedLeadsSection clients={failedLeads} />
    </div>
  );
}
