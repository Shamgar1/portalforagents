import "server-only";

const DEFAULT_MONDAY_API_URL = "https://api.monday.com/v2";

/** Narrow env contract for opportunities sync (no optional column ids, no silent defaults for referring). */
export type MondayOpportunitySyncEnv = {
  apiToken: string;
  boardId: string;
  apiUrl: string;
  loanAmountColumnId: string;
  expectedCommissionColumnId: string;
  referringAgentColumnId: string;
  dealCreationDateColumnId: string;
};

function shellOverrideHint(keys: string[]): string {
  return `If .env.local looks correct but values are wrong, ${keys.join(", ")} may already be set in the shell, Docker, or hosting dashboard—Next.js does not override existing process.env keys. Run e.g. unset ${keys[0]}` + (keys.length > 1 ? ` (and other keys)` : "") + ` and restart the dev server.`;
}

/**
 * Monday env for board preview and ad-hoc calls: only API token + board id are required.
 * Column ids may be undefined; there is no default for `MONDAY_REFERRING_AGENT_COLUMN_ID`.
 */
export function getMondayEnv() {
  const apiToken = process.env.MONDAY_API_TOKEN?.trim();
  const boardId = process.env.MONDAY_OPPORTUNITIES_BOARD_ID?.trim();
  const apiUrl = process.env.MONDAY_API_URL?.trim() || DEFAULT_MONDAY_API_URL;
  const loanAmountColumnId = process.env.MONDAY_LOAN_AMOUNT_COLUMN_ID?.trim();
  const expectedCommissionColumnId =
    process.env.MONDAY_EXPECTED_COMMISSION_COLUMN_ID?.trim();
  const referringAgentColumnId =
    process.env.MONDAY_REFERRING_AGENT_COLUMN_ID?.trim();
  const dealCreationDateColumnId =
    process.env.MONDAY_DEAL_CREATION_DATE_COLUMN_ID?.trim();

  if (!apiToken || !boardId) {
    throw new Error("Monday opportunities board environment variables are missing.");
  }

  return {
    apiToken,
    boardId,
    apiUrl,
    loanAmountColumnId,
    expectedCommissionColumnId,
    referringAgentColumnId,
    dealCreationDateColumnId,
  };
}

/**
 * Strict env for `/api/integrations/monday/sync` and Monday fetch with column filters.
 * Fails fast if any required var is missing (no default for `MONDAY_REFERRING_AGENT_COLUMN_ID`).
 * Deal creation date defaults to `deal_creation_date` only here so sync keeps working when the var is omitted.
 */
export function getMondayOpportunitySyncEnv(): MondayOpportunitySyncEnv {
  const base = getMondayEnv();
  const loanAmountColumnId = base.loanAmountColumnId;
  const expectedCommissionColumnId = base.expectedCommissionColumnId;
  const referringAgentColumnId = base.referringAgentColumnId;
  const dealCreationDateColumnId =
    base.dealCreationDateColumnId?.trim() || "deal_creation_date";

  if (!loanAmountColumnId || !expectedCommissionColumnId || !referringAgentColumnId) {
    const missing: string[] = [];
    if (!loanAmountColumnId) missing.push("MONDAY_LOAN_AMOUNT_COLUMN_ID");
    if (!expectedCommissionColumnId) missing.push("MONDAY_EXPECTED_COMMISSION_COLUMN_ID");
    if (!referringAgentColumnId) missing.push("MONDAY_REFERRING_AGENT_COLUMN_ID");
    throw new Error(
      `Monday opportunities sync requires: ${missing.join(", ")}. ${shellOverrideHint(missing)}`
    );
  }

  return {
    apiToken: base.apiToken,
    boardId: base.boardId,
    apiUrl: base.apiUrl,
    loanAmountColumnId,
    expectedCommissionColumnId,
    referringAgentColumnId,
    dealCreationDateColumnId,
  };
}

export function isMondayConfigured() {
  return Boolean(
    process.env.MONDAY_API_TOKEN && process.env.MONDAY_OPPORTUNITIES_BOARD_ID
  );
}

export function isMondayOpportunitySyncConfigured() {
  return Boolean(
    process.env.MONDAY_API_TOKEN &&
      process.env.MONDAY_OPPORTUNITIES_BOARD_ID &&
      process.env.MONDAY_LOAN_AMOUNT_COLUMN_ID &&
      process.env.MONDAY_EXPECTED_COMMISSION_COLUMN_ID &&
      process.env.MONDAY_REFERRING_AGENT_COLUMN_ID
  );
}
