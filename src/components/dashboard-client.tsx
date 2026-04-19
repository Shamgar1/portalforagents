"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DashboardTable } from "@/components/dashboard-table";
import { formatCurrency } from "@/lib/dashboard/formatters";
import { getLeadStatusLabel } from "@/lib/dashboard/status";
import { ClientRecord } from "@/lib/types";

type StatusFilter = "all" | ClientRecord["leadStatus"];
type SortOption =
  | "created-desc"
  | "created-asc"
  | "loan-desc"
  | "loan-asc"
  | "commission-desc"
  | "commission-asc"
  | "name-asc";

type DashboardClientProps = {
  clients: ClientRecord[];
  canAddManualLead?: boolean;
};

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "created-desc", label: "תאריך יצירה - חדש לישן" },
  { value: "created-asc", label: "תאריך יצירה - ישן לחדש" },
  { value: "loan-desc", label: "סכום הלוואה מהגבוה לנמוך" },
  { value: "loan-asc", label: "סכום הלוואה מהנמוך לגבוה" },
  { value: "commission-desc", label: "דמי טיפול מהגבוה לנמוך" },
  { value: "commission-asc", label: "דמי טיפול מהנמוך לגבוה" },
  { value: "name-asc", label: "שם לקוח א-ת" }
];

export function DashboardClient({ clients, canAddManualLead = false }: DashboardClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created-desc");

  const statusOptions = useMemo(
    () => [
      { value: "all" as const, label: "כל הסטטוסים" },
      ...Array.from(new Set(clients.map((client) => client.leadStatus))).map((status) => ({
        value: status,
        label: getLeadStatusLabel(status)
      }))
    ],
    [clients]
  );

  const visibleClients = useMemo(() => {
    const filtered = statusFilter === "all"
      ? [...clients]
      : clients.filter((client) => client.leadStatus === statusFilter);

    filtered.sort((left, right) => {
      switch (sortBy) {
        case "created-asc":
          return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
        case "created-desc":
          return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
        case "loan-desc":
          return right.loanAmount - left.loanAmount;
        case "loan-asc":
          return left.loanAmount - right.loanAmount;
        case "commission-desc":
          return right.expectedCommission - left.expectedCommission;
        case "commission-asc":
          return left.expectedCommission - right.expectedCommission;
        case "name-asc":
          return left.clientName.localeCompare(right.clientName, "he");
        default:
          return 0;
      }
    });

    return filtered;
  }, [clients, sortBy, statusFilter]);

  const summary = useMemo(() => {
    return visibleClients.reduce(
      (totals, client) => {
        totals.totalDeals += 1;
        totals.totalExpectedCommission += client.expectedCommission;
        totals.totalLoanAmount += client.loanAmount;
        return totals;
      },
      {
        totalDeals: 0,
        totalExpectedCommission: 0,
        totalLoanAmount: 0
      }
    );
  }, [visibleClients]);

  const tableControls = (
    <>
      <select
        className="table-select"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
        aria-label="סינון לפי סטטוס"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        className="table-select table-select-wide"
        value={sortBy}
        onChange={(event) => setSortBy(event.target.value as SortOption)}
        aria-label="מיון"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {canAddManualLead ? (
        <Link href="/dashboard/leads/new" className="btn btn-primary">
          הוספת ליד ידנית
        </Link>
      ) : null}
    </>
  );

  return (
    <section className="grid gap-6 max-w-6xl mx-auto w-full">
      <section className="stats-row">
        <article className="card stat-card stat-card--indigo">
          <p className="stat-label">סה״כ לידים</p>
          <p className="stat-value">{summary.totalDeals}</p>
          <p className="stat-sub">מחושב לפי הרשומות המוצגות כרגע</p>
        </article>

        <article className="card stat-card stat-card--emerald">
          <p className="stat-label">סה״כ דמי טיפול - תשלום נטו</p>
          <p className="stat-value stat-value-compact">{formatCurrency(summary.totalExpectedCommission)}</p>
          <p className="stat-sub">מתעדכן בהתאם לסינון ולמיון הפעילים</p>
        </article>

        <article className="card stat-card stat-card--violet">
          <p className="stat-label">סה״כ סכום הלוואות</p>
          <p className="stat-value stat-value-compact">{formatCurrency(summary.totalLoanAmount)}</p>
          <p className="stat-sub">מבוסס על כלל הלידים המוצגים</p>
        </article>
      </section>

      <DashboardTable clients={visibleClients} controls={tableControls} />
    </section>
  );
}
