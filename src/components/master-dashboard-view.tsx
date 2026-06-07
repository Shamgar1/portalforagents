"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

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

const AGENT_NUMBER_PORTAL_ROOT_ID = "agent-number-autocomplete-portal-root";

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

type MasterAgentNumberFilterProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

function filterDigits(value: string): string {
  return value.normalize("NFKC").replace(/\D/g, "");
}

function ensureAgentNumberPortalRoot(): HTMLElement {
  const portalRootId = "agent-number-autocomplete-portal-root";
  let root = document.getElementById(portalRootId);
  if (!root) {
    root = document.createElement("div");
    root.id = portalRootId;
    document.body.appendChild(root);
  }
  return root;
}

function MasterAgentNumberFilter({ options, value, onChange }: MasterAgentNumberFilterProps) {
  const [searchText, setSearchText] = useState("");
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const portalRootRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const committedValueRef = useRef(value);

  const normalizedOptions = useMemo(
    () =>
      Array.from(
        new Set(
          options
            .map((agentNumber) => String(agentNumber).trim())
            .filter((agentNumber) => agentNumber.length > 0)
        )
      ).sort((left, right) => left.localeCompare(right, "he", { numeric: true })),
    [options]
  );

  useLayoutEffect(() => {
    const root = ensureAgentNumberPortalRoot();
    portalRootRef.current = root;
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (committedValueRef.current === value) {
      return;
    }
    committedValueRef.current = value;
    setSearchText(value === "all" ? "" : value);
  }, [value]);

  const queryDigits = filterDigits(searchText);

  const filteredOptions = useMemo(() => {
    if (!queryDigits) {
      return normalizedOptions;
    }
    return normalizedOptions.filter((agentNumber) =>
      filterDigits(agentNumber).startsWith(queryDigits)
    );
  }, [normalizedOptions, queryDigits]);

  const updateMenuPosition = useCallback(() => {
    const inputEl = inputRef.current;
    if (!inputEl) {
      return;
    }
    const rect = inputEl.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) {
      updateMenuPosition();
    }
  }, [open, updateMenuPosition, searchText, filteredOptions.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (inputWrapRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleScrollOrResize() {
      updateMenuPosition();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [open, updateMenuPosition]);

  function selectOption(next: string) {
    committedValueRef.current = next;
    if (next === "all") {
      onChange("all");
      setSearchText("");
    } else {
      onChange(next);
      setSearchText(next);
    }
    setOpen(false);
  }

  const showAllOption = !queryDigits;
  const showNoMatches = queryDigits.length > 0 && filteredOptions.length === 0;

  const portalContainer = portalReady ? portalRootRef.current : null;

  const portalDropdown =
    open && portalContainer && menuPosition ? (
      <ul
        ref={menuRef}
        id={listboxId}
        role="listbox"
        className="agent-number-portal-dropdown"
        dir="rtl"
        style={{
          position: "fixed",
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          zIndex: 999999,
          margin: 0,
          padding: "6px",
          listStyle: "none",
          maxHeight: 280,
          overflowY: "auto",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          background: "#ffffff",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
        }}
      >
        {showAllOption ? (
          <li className="agent-autocomplete-item" role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={value === "all"}
              className={`agent-autocomplete-option ${
                value === "all" ? "agent-autocomplete-option--selected" : ""
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption("all")}
            >
              הכל
            </button>
          </li>
        ) : null}
        {filteredOptions.map((agentNumber) => (
          <li key={agentNumber} className="agent-autocomplete-item" role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={value === agentNumber}
              className={`agent-autocomplete-option ${
                value === agentNumber ? "agent-autocomplete-option--selected" : ""
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(agentNumber)}
            >
              {agentNumber}
            </button>
          </li>
        ))}
        {showNoMatches ? (
          <li className="agent-autocomplete-empty" role="presentation">
            אין מספרים תואמים
          </li>
        ) : null}
      </ul>
    ) : null;

  return (
    <>
      <div className="agent-autocomplete" ref={inputWrapRef} dir="rtl">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          className="agent-autocomplete-input"
          value={searchText}
          onChange={(event) => {
            const next = event.target.value;
            setSearchText(next);
            setOpen(true);
            updateMenuPosition();
            if (filterDigits(next).length === 0) {
              committedValueRef.current = "all";
              onChange("all");
            }
          }}
          onFocus={() => {
            setOpen(true);
            updateMenuPosition();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label="חיפוש לפי מספר סוכן"
          placeholder="בחירה לפי סוכן / מספר סוכן"
          autoComplete="off"
        />
      </div>
      {portalDropdown && portalContainer
        ? createPortal(portalDropdown, portalContainer)
        : null}
    </>
  );
}

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
  totalLoanAmount: number;
  totalMasterPayment: number;
  totalAgentNumberPayment: number;
};

function sectionStats(rows: ClientRecord[]): SectionStats {
  return rows.reduce(
    (acc, row) => {
      acc.count += 1;
      acc.totalLoanAmount += row.loanAmount ?? 0;
      acc.totalMasterPayment += row.masterPayment ?? 0;
      acc.totalAgentNumberPayment += row.paymentToAgentNumber ?? 0;
      return acc;
    },
    {
      count: 0,
      totalLoanAmount: 0,
      totalMasterPayment: 0,
      totalAgentNumberPayment: 0,
    }
  );
}

function formatExecutionDate(client: ClientRecord): string {
  const date = clientDate(client);
  if (!date) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

type SuccessfulSectionProps = {
  rows: ClientRecord[];
};

function SuccessfulSection({ rows }: SuccessfulSectionProps) {
  const stats = useMemo(() => sectionStats(rows), [rows]);

  return (
    <section className="card p-6">
      <div className="mb-4">
        <h3 className="admin-analytics-title">בוצע ושולם</h3>
      </div>

      <div className="stats-row mb-4">
        <article className="card stat-card">
          <p className="stat-label">מספר לקוחות</p>
          <p className="stat-value">{stats.count}</p>
        </article>
        <article className="card stat-card">
          <p className="stat-label">סכום הלוואה</p>
          <p className="stat-value stat-value-compact">{formatCurrency(stats.totalLoanAmount)}</p>
        </article>
        <article className="card stat-card">
          <p className="stat-label">עמלה כוללת</p>
          <p className="stat-value stat-value-compact">{formatCurrency(stats.totalMasterPayment)}</p>
        </article>
        <article className="card stat-card">
          <p className="stat-label">עמלה לסוכן</p>
          <p className="stat-value stat-value-compact">
            {formatCurrency(stats.totalAgentNumberPayment)}
          </p>
        </article>
      </div>

      <div className="table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th>תאריך ביצוע</th>
              <th className="loan-amount-cell">סכום הלוואה</th>
              <th className="loan-amount-cell">עמלה כוללת</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={4}>
                  אין נתונים להצגה.
                </td>
              </tr>
            ) : null}
            {rows.map((client) => (
              <tr key={client.id}>
                <td className="td-name">{client.clientName}</td>
                <td>{formatExecutionDate(client)}</td>
                <td className="loan-amount-cell">
                  <span className="loan-amount-inner">{formatCurrency(client.loanAmount ?? 0)}</span>
                </td>
                <td>
                  <span className="loan-amount-inner">
                    {formatCurrency(client.masterPayment ?? 0)}
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

type InProgressSectionProps = {
  rows: ClientRecord[];
};

function InProgressSection({ rows }: InProgressSectionProps) {
  const stats = useMemo(() => sectionStats(rows), [rows]);

  return (
    <section className="card p-6">
      <div className="mb-4">
        <h3 className="admin-analytics-title">לקוחות בתהליך</h3>
      </div>

      <div className="stats-row mb-4">
        <article className="card stat-card">
          <p className="stat-label">מספר לקוחות</p>
          <p className="stat-value">{stats.count}</p>
        </article>
        <article className="card stat-card">
          <p className="stat-label">סכום הלוואה</p>
          <p className="stat-value stat-value-compact">{formatCurrency(stats.totalLoanAmount)}</p>
        </article>
        <article className="card stat-card">
          <p className="stat-label">עמלות פוטנציאליות</p>
          <p className="stat-value stat-value-compact">
            {formatCurrency(stats.totalMasterPayment + stats.totalAgentNumberPayment)}
          </p>
        </article>
      </div>

      <div className="table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th>סטטוס ליד</th>
              <th className="loan-amount-cell">סכום הלוואה</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={3}>
                  אין נתונים להצגה.
                </td>
              </tr>
            ) : null}
            {rows.map((client) => (
              <tr key={client.id}>
                <td className="td-name">{client.clientName}</td>
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
                  <span className="loan-amount-inner">{formatCurrency(client.loanAmount ?? 0)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type FailedSectionProps = {
  rows: ClientRecord[];
};

function FailedSection({ rows }: FailedSectionProps) {
  const stats = useMemo(() => sectionStats(rows), [rows]);

  return (
    <section className="card p-6">
      <div className="mb-4">
        <h3 className="admin-analytics-title">לקוחות שנסגרו ללא הצלחה</h3>
      </div>

      <div className="stats-row mb-4">
        <article className="card stat-card">
          <p className="stat-label">מספר לקוחות</p>
          <p className="stat-value">{stats.count}</p>
        </article>
      </div>

      <div className="table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>שם לקוח</th>
              <th>תאריך ביצוע</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={2}>
                  אין נתונים להצגה.
                </td>
              </tr>
            ) : null}
            {rows.map((client) => (
              <tr key={client.id}>
                <td className="td-name">{client.clientName}</td>
                <td>{formatExecutionDate(client)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function MasterDashboardView({ clients }: MasterDashboardViewProps) {
  useLayoutEffect(() => {
    ensureAgentNumberPortalRoot();
  }, []);

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
        const agentKey = client.agentNumber?.trim() ?? "";
        acc.totalAgents.add(agentKey);
        acc.totalLeads += 1;
        acc.totalLoanAmount += client.loanAmount ?? 0;

        if (isSuccessfulLeadStatus(client.leadStatus)) {
          acc.successful += 1;
          acc.totalDistributedCommission += client.paymentToAgentNumber ?? 0;
          acc.totalExpectedCommission += client.masterPayment ?? 0;
        } else if (isFailedLeadStatusContaining(client.leadStatus)) {
          acc.failed += 1;
        } else if (isInProgressLeadStatus(client.leadStatus)) {
          acc.inProgress += 1;
          acc.totalExpectedCommission += client.masterPayment ?? 0;
        }

        return acc;
      },
      {
        totalAgents: new Set<string>(),
        totalLeads: 0,
        totalLoanAmount: 0,
        successful: 0,
        inProgress: 0,
        failed: 0,
        totalDistributedCommission: 0,
        totalExpectedCommission: 0,
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
          <p className="stat-label">מספר סוכנים</p>
          <p className="stat-value">{overallSummary.totalAgents.size}</p>
        </article>
        <article className="card stat-card stat-card--emerald">
          <p className="stat-label">מספר לידים</p>
          <p className="stat-value">{overallSummary.totalLeads}</p>
        </article>
        <article className="card stat-card stat-card--teal">
          <p className="stat-label">סכום הלוואות מבוקש</p>
          <p className="stat-value stat-value-compact">{formatCurrency(overallSummary.totalLoanAmount)}</p>
        </article>
        <article className="card stat-card stat-card--rose">
          <p className="stat-label">עמלה שחולקה</p>
          <p className="stat-value stat-value-compact">
            {formatCurrency(overallSummary.totalDistributedCommission)}
          </p>
        </article>
        <article className="card stat-card stat-card--violet">
          <p className="stat-label">עמלה כוללת</p>
          <p className="stat-value stat-value-compact">
            {formatCurrency(overallSummary.totalExpectedCommission)}
          </p>
        </article>
      </section>

      <section className="table-card">
        <div className="table-card-toolbar table-card-toolbar--compact">
          <div className="table-card-controls">
            <span className="table-count-badge">{filteredClients.length} רשומות</span>
            <MasterAgentNumberFilter
              options={distinctAgentNumbers}
              value={selectedAgentNumber}
              onChange={setSelectedAgentNumber}
            />
            <select
              className="table-select"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value as MonthFilter)}
              aria-label="סינון לפי חודש"
            >
              <option value="current">החודש הנוכחי</option>
              <option value="previous">חודש קודם</option>
              <option value="all">הכל</option>
            </select>
          </div>
          <div className="table-card-title-group">
            <h2 className="table-card-title">סינון</h2>
            <p className="table-card-subtitle">בחירה לפי סוכן וחודש.</p>
          </div>
        </div>
      </section>

      <SuccessfulSection rows={successfulRows} />
      <InProgressSection rows={inProgressRows} />
      <FailedSection rows={failedRows} />
    </section>
  );
}
