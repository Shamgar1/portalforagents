import { ReactNode } from "react";

import { ClientRecord } from "@/lib/types";
import { formatCreatedAt, formatCurrency } from "@/lib/dashboard/formatters";
import {
  getCommissionEligibilityBadge,
  getLeadStatusBadgeClass,
  getLeadStatusLabel
} from "@/lib/dashboard/status";

type DashboardTableProps = {
  clients: ClientRecord[];
  controls?: ReactNode;
};

export function DashboardTable({ clients, controls }: DashboardTableProps) {
  return (
    <div className="table-card" dir="rtl">
      <div className="table-card-toolbar">
        <div className="table-card-controls">
          <span className="table-count-badge">{clients.length} רשומות</span>
          {controls}
        </div>

        <div className="table-card-title-group">
          <h1 className="table-card-title">טבלת לידים</h1>
          <p className="table-card-subtitle">
            תצוגת הזדמנויות מהצד העסקי של ה-Opportunities board.
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th>סטטוס ליד</th>
              <th>סכום הלוואה</th>
              <th>דמי טיפול - תשלום נטו</th>
              <th>תאריך יצירה</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={5}>
                  לא נמצאו לקוחות עבור הסינון שבחרת.
                </td>
              </tr>
            ) : null}
            {clients.map((client) => {
              const eligibility = getCommissionEligibilityBadge(client.leadStatus);
              return (
                <tr key={client.id}>
                  <td className="td-name">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{client.clientName}</span>
                    </div>
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
                  <td className="td-amount">{formatCurrency(client.loanAmount)}</td>
                  <td>
                    <div className="flex flex-col items-start gap-2">
                      <span className="td-amount">{formatCurrency(client.expectedCommission)}</span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${eligibility.className}`}
                      >
                        {eligibility.label}
                      </span>
                    </div>
                  </td>
                  <td className="text-sm text-slate-600">{formatCreatedAt(client.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
