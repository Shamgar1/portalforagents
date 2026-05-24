import { formatCurrency } from "@/lib/dashboard/formatters";
import {
  isFailedLeadStatusContaining,
  isSuccessfulLeadStatus,
} from "@/lib/dashboard/lead-statuses";
import type { ClientRecord } from "@/lib/types";

const PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

const UNASSIGNED_REFERRING_LABEL = "ללא שיוך";

type AdminAnalyticsProps = {
  clients: ClientRecord[];
};

type ReferringSlice = {
  /** Normalized grouping key: trimmed referring_agent_text, or "" for empty/null. */
  key: string;
  label: string;
  totalLeads: number;
  successful: number;
  failed: number;
  commission: number;
};

function referringGroupKey(client: ClientRecord): string {
  return client.referringAgentText?.trim() ?? "";
}

function buildReferringSlices(clients: ClientRecord[]): ReferringSlice[] {
  const map = new Map<string, ReferringSlice>();

  for (const client of clients) {
    const key = referringGroupKey(client);
    const label = key === "" ? UNASSIGNED_REFERRING_LABEL : key;

    let slice = map.get(key);
    if (!slice) {
      slice = {
        key,
        label,
        totalLeads: 0,
        successful: 0,
        failed: 0,
        commission: 0,
      };
      map.set(key, slice);
    }

    slice.totalLeads += 1;

    if (isSuccessfulLeadStatus(client.leadStatus)) {
      slice.successful += 1;
      slice.commission += client.expectedCommission;
    }

    if (isFailedLeadStatusContaining(client.leadStatus)) {
      slice.failed += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.totalLeads !== a.totalLeads) {
      return b.totalLeads - a.totalLeads;
    }
    return a.label.localeCompare(b.label, "he");
  });
}

function PieRing({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-slate-500">אין לידים מוצלחים לפי סוכן מפנה.</p>
    );
  }

  let cumulative = 0;
  const parts = slices.map((segment) => {
    const start = (cumulative / total) * 100;
    cumulative += segment.value;
    const end = (cumulative / total) * 100;

    return `${segment.color} ${start}% ${end}%`;
  });

  return (
    <div className="admin-analytics-pie-wrap">
      <div
        className="admin-analytics-pie"
        style={{ background: `conic-gradient(${parts.join(", ")})` }}
        role="img"
        aria-label="התפלגות לידים מוצלחים לפי סוכן מפנה"
      />
      <ul className="admin-analytics-legend">
        {slices.map((segment) => (
          <li key={segment.label} className="admin-analytics-legend-item">
            <span className="admin-analytics-swatch" style={{ background: segment.color }} />
            <span>
              {segment.label}: {segment.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminAnalytics({ clients }: AdminAnalyticsProps) {
  const slices = buildReferringSlices(clients);
  const pieSlices = slices
    .filter((s) => s.successful > 0)
    .map((s, index) => ({
      label: s.label,
      value: s.successful,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }));

  return (
    <section className="admin-analytics card" dir="rtl">
      <h2 className="admin-analytics-title">תובנות לפי סוכן מפנה</h2>
      <p className="admin-analytics-subtitle text-sm text-slate-600 mb-6">
        מקובץ לפי ערך סוכן מפנה שנשמר ממאנדיי (שדה referring_agent_text). עמלות מחושבות
        רק ללידים בסטטוס בוצע ושולם.
      </p>

      <div className="admin-analytics-grid">
        <div>
          <h3 className="text-base font-semibold text-slate-900 mb-3">
            לידים מוצלחים לפי סוכן מפנה
          </h3>
          <PieRing slices={pieSlices} />
        </div>

        <div className="table-wrap">
          <table className="admin-analytics-table dashboard-table">
            <colgroup>
              <col />
              <col />
              <col />
              <col />
              <col className="col-amount" />
            </colgroup>
            <thead>
              <tr>
                <th>סוכן מפנה</th>
                <th>סה״כ לידים</th>
                <th>מוצלחים</th>
                <th>נסגרו ללא הצלחה</th>
                <th className="loan-amount-cell">סה״כ עמלות (מוצלחים)</th>
              </tr>
            </thead>
            <tbody>
              {slices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    אין נתונים
                  </td>
                </tr>
              ) : null}
              {slices.map((row, index) => (
                <tr key={row.key === "" ? "__unassigned_referring__" : row.key}>
                  <td className="td-name">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="admin-analytics-swatch-inline"
                        style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      {row.label}
                    </span>
                  </td>
                  <td>{row.totalLeads}</td>
                  <td>{row.successful}</td>
                  <td>{row.failed}</td>
                  <td className="loan-amount-cell">
                    <span className="loan-amount-inner">{formatCurrency(row.commission)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
