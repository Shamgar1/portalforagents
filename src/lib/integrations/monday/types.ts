export type MondayClientSyncRecord = {
  itemId: string;
  boardId?: string;
  lastSyncedAt?: string;
};

export type MondayBoardItem = {
  id: string;
  name: string;
  group: {
    title: string;
  };
  column_values: MondayOpportunityColumnValue[];
};

export type MondayBoardColumn = {
  id: string;
  title: string;
  type: string;
};

export type MondayBoardPreview = {
  boardId: string;
  boardName: string;
  columns: MondayBoardColumn[];
  items: MondayBoardItem[];
};

export type MondayOpportunityColumnValue = {
  id: string;
  text: string | null;
  value: string | null;
  type: string;
  /** Status/color column label from `... on StatusValue { label }` when present. */
  label?: string | null;
  /** Formula column display from `... on FormulaValue { display_value }` when present. */
  displayValue?: string | null;
};

export type MondayFormulaColumnDebugSample = {
  itemId: string;
  rawMasterPayment: string | null;
  parsedMasterPayment: number;
  rawPaymentToAgentNumber: string | null;
  parsedPaymentToAgentNumber: number;
};

/** Raw Monday `column_values` payload for one column (no parsing). */
export type MondayColumnRawDebugSample = {
  itemId: string;
  columnId: string;
  found: boolean;
  type: string | null;
  text: string | null;
  display_value: string | null;
  value: string | null;
};

/** TEMPORARY: admin debug API — raw item + column_values from Monday. */
export type MondayItemDebugSnapshot = {
  id: string;
  name: string;
  column_values: MondayOpportunityColumnValue[];
};

export type MondayOpportunityItem = {
  boardId: string;
  id: string;
  name: string;
  groupTitle: string;
  columnValues: MondayOpportunityColumnValue[];
};

export type MondayOpportunitySyncRow = {
  mondayItemId: string;
  clientName: string;
  leadStatus: string;
  loanAmount: number;
  expectedCommission: number;
  masterPayment?: number;
  agentNumber?: string;
  paymentToAgentNumber?: number;
  referringAgentText?: string;
  /** YYYY-MM-DD from Monday column deal_creation_date when present. */
  dealCreatedAt?: string;
  sourceBoard: string;
};

export type MondayOpportunitySyncResult = {
  /** Resolved `MONDAY_REFERRING_AGENT_COLUMN_ID` for this sync (strict env). */
  referringAgentColumnId: string;
  /** Resolved column id for תשלום לסוכן → `clients.master_payment`. */
  masterPaymentColumnId: string;
  /** Resolved column id for תשלום למספר סוכן → `clients.payment_to_agent_number`. */
  paymentToAgentNumberColumnId: string;
  agentNumberColumnId?: string;
  requestedColumnIds: string[];
  totalFetched: number;
  syncedCount: number;
  unmatchedCount: number;
  unmatchedItems: MondayOpportunitySyncRow[];
  /** First 20 non-empty `referring_agent_text` values encountered in fetch order. */
  sampleReferringAgents: string[];
  /** First 20 non-zero `master_payment` values mapped from Monday. */
  sampleMasterPayments: number[];
  /** Up to 5 items: raw/parsed formula columns for master + sub-agent payment. */
  formulaColumnDebugSamples: MondayFormulaColumnDebugSample[];
  /** Up to 5 items: raw Monday payload for `formula_mm2vcvt2` (תשלום לסוכן). */
  sampleMasterPaymentRawColumns: MondayColumnRawDebugSample[];
  /** Up to 5 items: raw Monday payload for `formula_mm3hmh8d` (תשלום למספר סוכן). */
  samplePaymentToAgentNumberRawColumns: MondayColumnRawDebugSample[];
  /** Up to 5 raw Monday column payload samples for agent number column id. */
  sampleAgentNumberRawColumns: Array<{
    itemId: string;
    found: boolean;
    columnId: string | null;
    type: string | null;
    text: string | null;
    value: string | null;
    label: string | null;
  }>;
  sampleParsedAgentNumbers: string[];
  sampleUpsertAgentNumbers: Array<string | null>;
  /** Unique non-empty labels from `MONDAY_REFERRING_AGENT_COLUMN_ID` this sync (e.g. color column). */
  distinctReferringAgents: string[];
  /** Items on the Monday board (from `boards.items_count`), when returned. */
  boardItemCount: number | null;
  pagesFetched: number;
  /** True if Monday still has a next page cursor or fetched count is below board total. */
  hasMore: boolean;
  /** Cursor after the last page; null when Monday pagination is complete. */
  lastCursor: string | null;
  stoppedReason: "complete" | "demo_limit";
  durationMs: number;
  /** `count(*)` on `public.clients` after sync completes. */
  totalClientsInDatabaseAfterSync: number;
};

export type MondayOpportunitySyncFetchMeta = {
  boardItemCount: number | null;
  pagesFetched: number;
  hasMore: boolean;
  /** Monday’s next-page cursor after the last fetched page; null when pagination finished. */
  lastCursor: string | null;
  stoppedReason: "complete" | "demo_limit";
};

export type MondayOpportunitySyncFetchResult = {
  items: MondayOpportunityItem[];
  meta: MondayOpportunitySyncFetchMeta;
};

export interface MondayBoardService {
  getBoardPreview(limit?: number): Promise<MondayBoardPreview>;
  getOpportunityItems(limit?: number): Promise<MondayOpportunityItem[]>;
  /** Sync path: paginated fetch with optional column filter and optional item cap (demo). */
  getOpportunityItemsForSync(options?: {
    pageSize?: number;
    maxItems?: number;
  }): Promise<MondayOpportunitySyncFetchResult>;
  /** TEMPORARY: fetch one item by id for debugging column_values (admin route only). */
  getItemDebugSnapshot(itemId: string): Promise<MondayItemDebugSnapshot | null>;
}

export interface MondaySyncService {
  syncClient(clientId: string): Promise<MondayClientSyncRecord>;
}
