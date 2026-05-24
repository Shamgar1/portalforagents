import { ReactNode } from "react";

import { ClientRecord } from "@/lib/types";
import { formatClientDealDate, formatCurrency } from "@/lib/dashboard/formatters";
import {
  getCommissionEligibilityBadge,
  getLeadStatusBadgeClass,
  getLeadStatusLabel
} from "@/lib/dashboard/status";

type TablePaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

type DashboardTableProps = {
  clients: ClientRecord[];
  controls?: ReactNode;
  /** Placed directly above the table grid (e.g. admin row-range selector). */
  aboveTable?: ReactNode;
  showAdminColumns?: boolean;
  pagination?: TablePaginationProps;
};

export function DashboardTable({
  clients,
  controls,
  aboveTable,
  showAdminColumns = false,
  pagination,
}: DashboardTableProps) {
  const totalItems = pagination?.totalItems ?? clients.length;
  const pageStart = pagination && totalItems > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : totalItems === 0 ? 0 : 1;
  const pageEnd =
    pagination && totalItems > 0
      ? Math.min(pagination.page * pagination.pageSize, totalItems)
      : totalItems;
  const totalPages =
    pagination && pagination.pageSize > 0
      ? Math.max(1, Math.ceil((pagination.totalItems || 0) / pagination.pageSize))
      : 1;

  const countBadgeLabel =
    pagination && totalItems > 0
      ? `מציג ${pageStart}–${pageEnd} מתוך ${totalItems}`
      : `${totalItems} רשומות`;
  return (
    <div className="table-card" dir="rtl">
      <div className="table-card-toolbar">
        <div className="table-card-controls">
          <span className="table-count-badge">{countBadgeLabel}</span>
          {controls}
        </div>

        <div className="table-card-title-group">
          <h1 className="table-card-title">טבלת לידים</h1>
          <p className="table-card-subtitle">
            תצוגת הזדמנויות מהצד העסקי של ה-Opportunities board.
          </p>
        </div>
      </div>

      {aboveTable ? (
        <div className="table-card-range-row" dir="rtl">
          {aboveTable}
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="dashboard-table">
          <colgroup>
            <col />
            {showAdminColumns ? <col /> : null}
            <col />
            <col className="col-amount" />
            <col className="col-amount" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>שם לקוח</th>
              {showAdminColumns ? <th>סוכן מפנה</th> : null}
              <th>סטטוס ליד</th>
              <th className="loan-amount-cell">סכום הלוואה</th>
              <th className="loan-amount-cell">תשלום לסוכן</th>
              <th>תאריך יצירה</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={showAdminColumns ? 6 : 5}>
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
                      {!client.assignedAgentId ? (
                        <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                          לא משויך
                        </span>
                      ) : null}
                    </div>
                  </td>
                  {showAdminColumns ? (
                    <td className="text-sm text-slate-700">
                      {client.referringAgentText?.trim() || "—"}
                    </td>
                  ) : null}
                  <td>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getLeadStatusBadgeClass(
                        client.leadStatus
                      )}`}
                    >
                      {getLeadStatusLabel(client.leadStatus)}
                    </span>
                  </td>
                  <td className="loan-amount-cell">
                    <span className="loan-amount-inner">{formatCurrency(client.loanAmount)}</span>
                  </td>
                  <td className="loan-amount-cell">
                    <div className="loan-amount-stack">
                      <span className="loan-amount-inner">
                        {formatCurrency(client.expectedCommission)}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${eligibility.className}`}
                      >
                        {eligibility.label}
                      </span>
                    </div>
                  </td>
                  <td className="text-sm text-slate-600">{formatClientDealDate(client)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalItems > pagination.pageSize ? (
        <div className="table-pagination" dir="rtl">
          <p className="table-pagination-meta">
            עמוד {pagination.page} מתוך {totalPages} · {pagination.pageSize} שורות לעמוד
          </p>
          <div className="table-pagination-buttons">
            <button
              type="button"
              className="btn btn-outline"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              aria-label="עמוד קודם"
            >
              הקודם
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              aria-label="עמוד הבא"
            >
              הבא
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
