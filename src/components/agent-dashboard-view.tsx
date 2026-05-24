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

type AgentDashboardViewProps = {
  clients: ClientRecord[];
};

const tableShell =
  "overflow-x-auto rounded-lg border border-slate-100 bg-white [&_table]:w-full [&_table]:border-collapse " +
  "[&_thead]:bg-slate-50 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-right [&_th]:text-xs [&_th]:font-semibold [&_th]:text-slate-600 md:[&_th]:text-sm " +
  "[&_td]:px-3 [&_td]:py-3 [&_td]:align-middle [&_td]:text-right [&_td]:text-sm " +
  "[&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-slate-50";

export function AgentDashboardView({ clients }: AgentDashboardViewProps) {
  const successfulLeads = useMemo(
    () => clients.filter((c) => isSuccessfulLeadStatus(c.leadStatus)),
    [clients]
  );

  const inProgressLeads = useMemo(
    () => clients.filter((c) => isInProgressLeadStatus(c.leadStatus)),
    [clients]
  );

  const successTotals = useMemo(() => {
    return successfulLeads.reduce(
      (acc, c) => {
        acc.loan += c.loanAmount;
        acc.commission += c.expectedCommission;
        return acc;
      },
      { loan: 0, commission: 0 }
    );
  }, [successfulLeads]);

  const inProgressTotals = useMemo(() => {
    return inProgressLeads.reduce(
      (acc, c) => {
        acc.loan += c.loanAmount;
        acc.commission += c.expectedCommission;
        return acc;
      },
      { loan: 0, commission: 0 }
    );
  }, [inProgressLeads]);

  const failedLeads = useMemo(
    () => clients.filter((c) => isFailedLeadStatusContaining(c.leadStatus)),
    [clients]
  );

  const failedTotals = useMemo(() => {
    return failedLeads.reduce(
      (acc, c) => {
        acc.loan += c.loanAmount;
        return acc;
      },
      { loan: 0 }
    );
  }, [failedLeads]);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-0 sm:px-1">
      <section className="dashboard-card mx-auto w-full max-w-5xl" dir="rtl">
        <div className="section-header">
          <h2>לידים שבוצעו בהצלחה</h2>

          <div className="kpi-grid">
            <div className="kpi-card">
              <span>מספר לידים</span>
              <strong>{successfulLeads.length}</strong>
            </div>

            <div className="kpi-card">
              <span>סכום הלוואות</span>
              <strong>{formatCurrency(successTotals.loan)}</strong>
            </div>

            <div className="kpi-card">
              <span>תשלום לסוכן</span>
              <strong>{formatCurrency(successTotals.commission)}</strong>
            </div>
          </div>
        </div>

        <div className={tableShell}>
          <table className="dashboard-table">
            <colgroup>
              <col />
              <col />
              <col className="col-amount" />
              <col className="col-amount" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">שם לקוח</th>
                <th scope="col">תאריך יצירה</th>
                <th scope="col" className="loan-amount-cell">
                  סכום הלוואה
                </th>
                <th scope="col" className="loan-amount-cell">
                  תשלום לסוכן
                </th>
              </tr>
            </thead>
            <tbody>
              {successfulLeads.length === 0 ? (
                <tr>
                  <td className="py-10 text-center text-sm text-slate-500" colSpan={4}>
                    אין לידים שבוצעו ושולמו.
                  </td>
                </tr>
              ) : null}

              {successfulLeads.map((client) => (
                <tr key={client.id}>
                  <td className="max-w-[12rem] truncate text-sm font-medium text-slate-900 md:max-w-none md:whitespace-normal">
                    {client.clientName}
                  </td>
                  <td className="text-sm text-slate-600">{formatClientDealDate(client)}</td>
                  <td className="loan-amount-cell">
                    <span className="loan-amount-inner">{formatCurrency(client.loanAmount)}</span>
                  </td>
                  <td className="loan-amount-cell">
                    <span className="loan-amount-inner">
                      {formatCurrency(client.expectedCommission)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-card mx-auto w-full max-w-5xl" dir="rtl">
        <div className="section-header">
          <h2>לידים בטיפול</h2>

          <div className="kpi-grid">
            <div className="kpi-card">
              <span>מספר לידים</span>
              <strong>{inProgressLeads.length}</strong>
            </div>
            <div className="kpi-card">
              <span>סכום הלוואות</span>
              <strong>{formatCurrency(inProgressTotals.loan)}</strong>
            </div>
            <div className="kpi-card">
              <span>תשלום לסוכן פוטנציאלי</span>
              <strong>{formatCurrency(inProgressTotals.commission)}</strong>
            </div>
          </div>
        </div>

        <div className={tableShell}>
          <table className="dashboard-table">
            <colgroup>
              <col />
              <col />
              <col />
              <col className="col-amount" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">שם לקוח</th>
                <th scope="col">תאריך יצירה</th>
                <th scope="col">סטטוס ליד</th>
                <th scope="col" className="loan-amount-cell">
                  סכום הלוואה
                </th>
              </tr>
            </thead>
            <tbody>
              {inProgressLeads.length === 0 ? (
                <tr>
                  <td className="py-10 text-center text-sm text-slate-500" colSpan={4}>
                    אין לידים בטיפול.
                  </td>
                </tr>
              ) : null}

              {inProgressLeads.map((client) => (
                <tr key={client.id}>
                  <td className="max-w-[12rem] truncate text-sm font-medium text-slate-900 md:max-w-none md:whitespace-normal">
                    {client.clientName}
                  </td>
                  <td className="text-sm text-slate-600">{formatClientDealDate(client)}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getLeadStatusBadgeClass(
                        client.leadStatus
                      )}`}
                    >
                      {getLeadStatusLabel(client.leadStatus)}
                    </span>
                  </td>
                  <td className="loan-amount-cell">
                    <span className="loan-amount-inner">
                      {client.loanAmount > 0 ? formatCurrency(client.loanAmount) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-card mx-auto w-full max-w-5xl" dir="rtl">
        <div className="section-header">
          <h2>לידים ללא הצלחה</h2>

          <div className="kpi-grid">
            <div className="kpi-card">
              <span>מספר לידים</span>
              <strong>{failedLeads.length}</strong>
            </div>

            <div className="kpi-card">
              <span>סכום הלוואות</span>
              <strong>{formatCurrency(failedTotals.loan)}</strong>
            </div>
          </div>
        </div>

        <div className={tableShell}>
          <table className="dashboard-table">
            <colgroup>
              <col />
              <col />
              <col />
              <col className="col-amount" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">שם לקוח</th>
                <th scope="col">תאריך יצירה</th>
                <th scope="col">סטטוס ליד</th>
                <th scope="col" className="loan-amount-cell">
                  סכום הלוואה
                </th>
              </tr>
            </thead>
            <tbody>
              {failedLeads.length === 0 ? (
                <tr>
                  <td className="py-10 text-center text-sm text-slate-500" colSpan={4}>
                    אין לידים שנסגרו ללא הצלחה.
                  </td>
                </tr>
              ) : null}

              {failedLeads.map((client) => (
                <tr key={client.id}>
                  <td className="max-w-[12rem] truncate text-sm font-medium text-slate-900 md:max-w-none md:whitespace-normal">
                    {client.clientName}
                  </td>
                  <td className="text-sm text-slate-600">{formatClientDealDate(client)}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getLeadStatusBadgeClass(
                        client.leadStatus
                      )}`}
                    >
                      {getLeadStatusLabel(client.leadStatus)}
                    </span>
                  </td>
                  <td className="loan-amount-cell">
                    <span className="loan-amount-inner">
                      {client.loanAmount > 0 ? formatCurrency(client.loanAmount) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}