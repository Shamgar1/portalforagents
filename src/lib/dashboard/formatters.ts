const currencyFormatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatCreatedAt(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return dateFormatter.format(date);
}

/** Display Monday deal_creation_date as DD/MM/YYYY (matches board date, no TZ shift for YYYY-MM-DD). */
export function formatDealCreationDate(value?: string) {
  if (!value) {
    return "—";
  }

  const trimmed = value.trim();
  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());

  return `${dd}/${mm}/${yyyy}`;
}

/** Sort key: Monday date-only uses noon UTC to avoid timezone boundary shifts. */
export function dealOrRecordTimeMs(
  dealCreatedAt?: string | null,
  recordCreatedAt?: string
): number {
  const raw = (dealCreatedAt ?? recordCreatedAt ?? "").trim();
  if (!raw) {
    return 0;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return Date.parse(`${raw}T12:00:00.000Z`);
  }

  return new Date(raw).getTime();
}

export function formatClientDealDate(client: {
  dealCreatedAt?: string | null;
  createdAt: string;
}) {
  return formatDealCreationDate(client.dealCreatedAt ?? client.createdAt);
}
