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
  referringAgentText?: string;
  /** YYYY-MM-DD from Monday column deal_creation_date when present. */
  dealCreatedAt?: string;
  sourceBoard: string;
};

export type MondayOpportunitySyncResult = {
  /** Resolved `MONDAY_REFERRING_AGENT_COLUMN_ID` for this sync (strict env). */
  referringAgentColumnId: string;
  requestedColumnIds: string[];
  totalFetched: number;
  syncedCount: number;
  unmatchedCount: number;
  unmatchedItems: MondayOpportunitySyncRow[];
  /** First 20 non-empty `referring_agent_text` values encountered in fetch order. */
  sampleReferringAgents: string[];
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
