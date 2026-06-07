"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardTable } from "@/components/dashboard-table";
import { dealOrRecordTimeMs, formatCurrency } from "@/lib/dashboard/formatters";
import {
  isFailedLeadStatusContaining,
  isSuccessfulLeadStatus,
} from "@/lib/dashboard/lead-statuses";
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
type AssignmentFilter = "all" | "assigned" | "unassigned";

const ADMIN_TABLE_PAGE_SIZE = 50;

type DashboardClientProps = {
  clients: ClientRecord[];
  canAddManualLead?: boolean;
};

type MondaySyncResponse = {
  ok: boolean;
  masterPaymentColumnId?: string;
  agentNumberColumnId?: string;
  requestedColumnIds?: string[];
  totalFetched: number;
  syncedCount: number;
  unmatchedCount: number;
  unmatchedItems: unknown[];
  sampleReferringAgents?: string[];
  sampleMasterPayments?: number[];
  formulaColumnDebugSamples?: unknown[];
  sampleMasterPaymentRawColumns?: Array<{
    itemId: string;
    columnId: string;
    found: boolean;
    type: string | null;
    text: string | null;
    display_value: string | null;
    value: string | null;
  }>;
  samplePaymentToAgentNumberRawColumns?: Array<{
    itemId: string;
    columnId: string;
    found: boolean;
    type: string | null;
    text: string | null;
    display_value: string | null;
    value: string | null;
  }>;
  sampleAgentNumberRawColumns?: Array<{
    itemId: string;
    found: boolean;
    columnId: string | null;
    type: string | null;
    text: string | null;
    value: string | null;
    label: string | null;
  }>;
  sampleParsedAgentNumbers?: string[];
  sampleUpsertAgentNumbers?: Array<string | null>;
  distinctReferringAgents?: string[];
  boardItemCount?: number | null;
  pagesFetched?: number;
  hasMore?: boolean;
  lastCursor?: string | null;
  stoppedReason?: "complete" | "demo_limit";
  durationMs?: number;
  totalClientsInDatabaseAfterSync?: number;
  error?: string;
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
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [isSyncingMonday, setIsSyncingMonday] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<MondaySyncResponse | null>(null);

  const [adminTablePage, setAdminTablePage] = useState(1);

  async function handleMondaySync() {
    setIsSyncingMonday(true);
    setSyncError(null);

    try {
      const response = await fetch("/api/integrations/monday/sync", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json()) as MondaySyncResponse;

      if (!response.ok || !payload.ok) {
        setSyncResult(null);
        setSyncError(payload.error ?? "Monday sync failed.");
        return;
      }

      setSyncResult(payload);
    } catch {
      setSyncResult(null);
      setSyncError("Monday sync failed.");
    } finally {
      setIsSyncingMonday(false);
    }
  }

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
    let filtered =
      statusFilter === "all"
        ? [...clients]
        : clients.filter((client) => client.leadStatus === statusFilter);

    if (canAddManualLead) {
      if (assignmentFilter === "assigned") {
        filtered = filtered.filter((client) => Boolean(client.assignedAgentId));
      }

      if (assignmentFilter === "unassigned") {
        filtered = filtered.filter((client) => !client.assignedAgentId);
      }
    }

    filtered.sort((left, right) => {
      switch (sortBy) {
        case "created-asc":
          return (
            dealOrRecordTimeMs(left.dealCreatedAt, left.createdAt) -
            dealOrRecordTimeMs(right.dealCreatedAt, right.createdAt)
          );
        case "created-desc":
          return (
            dealOrRecordTimeMs(right.dealCreatedAt, right.createdAt) -
            dealOrRecordTimeMs(left.dealCreatedAt, left.createdAt)
          );
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
  }, [assignmentFilter, canAddManualLead, clients, sortBy, statusFilter]);

  useEffect(() => {
    if (!canAddManualLead) return;
    setAdminTablePage(1);
  }, [assignmentFilter, canAddManualLead, sortBy, statusFilter]);

  const adminSummary = useMemo(() => {
    return clients.reduce(
      (totals, client) => {
        totals.totalDeals += 1;
        if (isSuccessfulLeadStatus(client.leadStatus)) {
          totals.closedSuccessfully += 1;
        }
        if (isFailedLeadStatusContaining(client.leadStatus)) {
          totals.closedWithoutSuccess += 1;
        }
        totals.totalExpectedCommission += client.expectedCommission;
        totals.totalLoanAmount += client.loanAmount;
        return totals;
      },
      {
        totalDeals: 0,
        closedSuccessfully: 0,
        closedWithoutSuccess: 0,
        totalExpectedCommission: 0,
        totalLoanAmount: 0,
      }
    );
  }, [clients]);

  const filteredSummary = useMemo(() => {
    return visibleClients.reduce(
      (totals, client) => {
        totals.totalDeals += 1;
        if (isSuccessfulLeadStatus(client.leadStatus)) {
          totals.closedSuccessfully += 1;
        }
        if (isFailedLeadStatusContaining(client.leadStatus)) {
          totals.closedWithoutSuccess += 1;
        }
        totals.totalExpectedCommission += client.expectedCommission;
        totals.totalLoanAmount += client.loanAmount;
        return totals;
      },
      {
        totalDeals: 0,
        closedSuccessfully: 0,
        closedWithoutSuccess: 0,
        totalExpectedCommission: 0,
        totalLoanAmount: 0,
      }
    );
  }, [visibleClients]);

  const summary = canAddManualLead ? adminSummary : filteredSummary;

  const paginatedVisibleClients = useMemo(() => {
    if (!canAddManualLead) return visibleClients;
    const start = (adminTablePage - 1) * ADMIN_TABLE_PAGE_SIZE;
    return visibleClients.slice(start, start + ADMIN_TABLE_PAGE_SIZE);
  }, [adminTablePage, canAddManualLead, visibleClients]);

  const adminTableTotalPages = canAddManualLead
    ? Math.max(1, Math.ceil(visibleClients.length / ADMIN_TABLE_PAGE_SIZE))
    : 1;

  const adminTableRangeOptions = useMemo(() => {
    if (!canAddManualLead) return [];
    const n = visibleClients.length;
    if (n === 0) {
      return [{ page: 1, label: "אין רשומות בסינון" }];
    }
    const pages = Math.ceil(n / ADMIN_TABLE_PAGE_SIZE);
    return Array.from({ length: pages }, (_, i) => {
      const page = i + 1;
      const start = (page - 1) * ADMIN_TABLE_PAGE_SIZE + 1;
      const end = Math.min(page * ADMIN_TABLE_PAGE_SIZE, n);
      return { page, label: `${start}–${end}` };
    });
  }, [canAddManualLead, visibleClients.length]);

  useEffect(() => {
    if (!canAddManualLead) return;
    if (adminTablePage <= adminTableTotalPages) return;
    setAdminTablePage(adminTableTotalPages);
  }, [adminTablePage, adminTableTotalPages, canAddManualLead]);

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
        <select
          className="table-select"
          value={assignmentFilter}
          onChange={(event) => setAssignmentFilter(event.target.value as AssignmentFilter)}
          aria-label="סינון לפי שיוך סוכן"
        >
          <option value="all">כל הרשומות</option>
          <option value="assigned">משויכות</option>
          <option value="unassigned">לא משויכות</option>
        </select>
      ) : null}

      {canAddManualLead ? (
        <Link href="/dashboard/leads/new" className="btn btn-primary">
          הוספת ליד ידנית
        </Link>
      ) : null}

      {canAddManualLead ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleMondaySync}
          disabled={isSyncingMonday}
        >
          {isSyncingMonday ? "Syncing..." : "Sync Monday"}
        </button>
      ) : null}
    </>
  );

  const safeAdminPage = Math.min(adminTablePage, adminTableTotalPages);

  const adminAboveTable =
    canAddManualLead && adminTableRangeOptions.length > 0 ? (
      <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="shrink-0">הצג רשומות</span>
        <select
          className="table-select table-select-wide min-w-[8.5rem]"
          value={visibleClients.length === 0 ? 1 : safeAdminPage}
          onChange={(event) => setAdminTablePage(Number(event.target.value))}
          aria-label="הצג רשומות"
          disabled={visibleClients.length === 0}
        >
          {adminTableRangeOptions.map((opt) => (
            <option key={opt.page} value={opt.page}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    ) : null;

  return (
    <section className="grid gap-6 max-w-6xl mx-auto w-full">
      <section className="stats-row">
        <article className="card stat-card stat-card--indigo">
          <p className="stat-label">סה״כ לידים</p>
          <p className="stat-value">{summary.totalDeals}</p>
          <p className="stat-sub">
            {canAddManualLead
              ? "מחושב על כל הרשומות המסונכרנות (לא מוגבל לעמוד בטבלה)"
              : "מחושב לפי הרשומות המוצגות כרגע"}
          </p>
        </article>

        <article className="card stat-card stat-card--teal">
          <p className="stat-label">לידים שנסגרו בהצלחה</p>
          <p className="stat-value">{summary.closedSuccessfully}</p>
          <p className="stat-sub">
            {canAddManualLead
              ? "לפי סטטוס בוצע ושולם, על כל הנתונים המסונכרנים"
              : "לפי סטטוס בוצע ושולם, מתוך הרשומות המוצגות כרגע"}
          </p>
        </article>

        {canAddManualLead ? (
          <article className="card stat-card stat-card--rose">
            <p className="stat-label">עסקאות שנסגרו ללא הצלחה</p>
            <p className="stat-value">{adminSummary.closedWithoutSuccess}</p>
            <p className="stat-sub">
              סטטוס מכיל &quot;נסגר ללא הצלחה&quot;, על כל הנתונים המסונכרנים
            </p>
          </article>
        ) : null}

        <article className="card stat-card stat-card--emerald">
          <p className="stat-label">תשלום לסוכן</p>
          <p className="stat-value stat-value-compact">
            {formatCurrency(summary.totalExpectedCommission)}
          </p>
          <p className="stat-sub">
            {canAddManualLead
              ? "סכום דמי טיפול לפי כל הרשומות המסונכרנות"
              : "מתעדכן בהתאם לסינון ולמיון הפעילים"}
          </p>
        </article>

        <article className="card stat-card stat-card--violet">
          <p className="stat-label">סה״כ סכום הלוואות</p>
          <p className="stat-value stat-value-compact">{formatCurrency(summary.totalLoanAmount)}</p>
          <p className="stat-sub">
            {canAddManualLead
              ? "מבוסס על כל הלידים המסונכרנים"
              : "מבוסס על כלל הלידים המוצגים"}
          </p>
        </article>
      </section>

      <DashboardTable
        clients={canAddManualLead ? paginatedVisibleClients : visibleClients}
        controls={tableControls}
        aboveTable={adminAboveTable}
        showAdminColumns={canAddManualLead}
        pagination={
          canAddManualLead
            ? {
                page: safeAdminPage,
                pageSize: ADMIN_TABLE_PAGE_SIZE,
                totalItems: visibleClients.length,
                onPageChange: setAdminTablePage,
              }
            : undefined
        }
      />

      {canAddManualLead ? (
        <article className="card p-4">
          <p className="text-sm font-semibold mb-2">Monday Sync (temp dev tool)</p>
          {syncError ? <p className="text-sm text-red-600">{syncError}</p> : null}
          {syncResult ? (
            <div className="text-sm space-y-1">
              <p>totalFetched: {syncResult.totalFetched}</p>
              {syncResult.boardItemCount != null ? (
                <p>boardItemCount (Monday): {syncResult.boardItemCount}</p>
              ) : null}
              <p>pagesFetched: {syncResult.pagesFetched ?? "—"}</p>
              <p>hasMore: {String(syncResult.hasMore ?? false)}</p>
              <p>durationMs: {syncResult.durationMs ?? "—"}</p>
              <p>totalClientsInDatabaseAfterSync: {syncResult.totalClientsInDatabaseAfterSync ?? "—"}</p>
              <p>stoppedReason: {syncResult.stoppedReason ?? "—"}</p>
              {syncResult.lastCursor ? (
                <p className="break-all text-xs opacity-80">lastCursor: {syncResult.lastCursor}</p>
              ) : (
                <p className="text-xs opacity-80">lastCursor: null</p>
              )}
              <p>syncedCount: {syncResult.syncedCount}</p>
              <p>unmatchedCount: {syncResult.unmatchedCount}</p>
              <p>masterPaymentColumnId: {syncResult.masterPaymentColumnId ?? "—"}</p>
              <p>agentNumberColumnId: {syncResult.agentNumberColumnId ?? "—"}</p>
              {syncResult.requestedColumnIds && syncResult.requestedColumnIds.length > 0 ? (
                <p className="text-xs break-all">
                  requestedColumnIds: {syncResult.requestedColumnIds.join(", ")}
                </p>
              ) : null}
              {syncResult.sampleParsedAgentNumbers &&
              syncResult.sampleParsedAgentNumbers.length > 0 ? (
                <p>
                  sampleParsedAgentNumbers: {syncResult.sampleParsedAgentNumbers.join(" · ")}
                </p>
              ) : null}
              {syncResult.sampleUpsertAgentNumbers &&
              syncResult.sampleUpsertAgentNumbers.length > 0 ? (
                <p>
                  sampleUpsertAgentNumbers:{" "}
                  {syncResult.sampleUpsertAgentNumbers
                    .map((value) => value ?? "null")
                    .join(" · ")}
                </p>
              ) : null}
              {syncResult.sampleAgentNumberRawColumns &&
              syncResult.sampleAgentNumberRawColumns.length > 0 ? (
                <details className="mt-2">
                  <summary className="cursor-pointer select-none font-medium text-slate-700">
                    sampleAgentNumberRawColumns ({syncResult.sampleAgentNumberRawColumns.length})
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                    {JSON.stringify(syncResult.sampleAgentNumberRawColumns, null, 2)}
                  </pre>
                </details>
              ) : null}
              {syncResult.distinctReferringAgents && syncResult.distinctReferringAgents.length > 0 ? (
                <p className="text-xs">
                  distinctReferringAgents ({syncResult.distinctReferringAgents.length}):{" "}
                  {syncResult.distinctReferringAgents.join(" · ")}
                </p>
              ) : null}
              {syncResult.sampleMasterPayments && syncResult.sampleMasterPayments.length > 0 ? (
                <p>
                  sampleMasterPayments: {syncResult.sampleMasterPayments.join(" · ")}
                </p>
              ) : null}
              {syncResult.sampleMasterPaymentRawColumns &&
              syncResult.sampleMasterPaymentRawColumns.length > 0 ? (
                <div>
                  <p className="font-medium">
                    sampleMasterPaymentRawColumns (formula_mm2vcvt2,{" "}
                    {syncResult.sampleMasterPaymentRawColumns.length})
                  </p>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/5 p-2 text-xs">
                    {JSON.stringify(syncResult.sampleMasterPaymentRawColumns, null, 2)}
                  </pre>
                </div>
              ) : null}
              {syncResult.samplePaymentToAgentNumberRawColumns &&
              syncResult.samplePaymentToAgentNumberRawColumns.length > 0 ? (
                <div>
                  <p className="font-medium">
                    samplePaymentToAgentNumberRawColumns (formula_mm3hmh8d,{" "}
                    {syncResult.samplePaymentToAgentNumberRawColumns.length})
                  </p>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/5 p-2 text-xs">
                    {JSON.stringify(syncResult.samplePaymentToAgentNumberRawColumns, null, 2)}
                  </pre>
                </div>
              ) : null}
              {syncResult.formulaColumnDebugSamples &&
              syncResult.formulaColumnDebugSamples.length > 0 ? (
                <div>
                  <p className="font-medium">formulaColumnDebugSamples</p>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/5 p-2 text-xs">
                    {JSON.stringify(syncResult.formulaColumnDebugSamples, null, 2)}
                  </pre>
                </div>
              ) : null}
              {syncResult.sampleReferringAgents && syncResult.sampleReferringAgents.length > 0 ? (
                <p>
                  sampleReferringAgents: {syncResult.sampleReferringAgents.join(" · ")}
                </p>
              ) : null}
              <p className="text-amber-700">
                פריטים ללא התאמת סוכן סונכרנו בהצלחה, אך נשארו ללא שיוך (agent_id = null).
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer select-none font-medium text-slate-700">
                  הצג פריטים לא משויכים
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(syncResult.unmatchedItems, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <p className="text-sm opacity-80">
              Click "Sync Monday" to run a temporary admin-only sync.
            </p>
          )}
        </article>
      ) : null}
    </section>
  );
}
