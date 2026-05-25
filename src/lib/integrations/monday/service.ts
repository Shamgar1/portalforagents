import "server-only";

import { getMondayEnv, getMondayOpportunitySyncEnv } from "@/lib/integrations/monday/env";
import type {
  MondayBoardPreview,
  MondayBoardService,
  MondayItemDebugSnapshot,
  MondayOpportunityItem,
  MondayOpportunitySyncFetchResult,
} from "@/lib/integrations/monday/types";

type MondayGraphQLError = {
  message: string;
};

type MondayGraphQLResponse<TData> = {
  data?: TData;
  errors?: MondayGraphQLError[];
};

type BoardPreviewQueryResult = {
  boards: Array<{
    id: string;
    name: string;
    columns: Array<{
      id: string;
      title: string;
      type: string;
    }>;
    items_page: {
      items: Array<{
        id: string;
        name: string;
        group: {
          title: string;
        } | null;
        column_values: Array<{
          id: string;
          text: string | null;
          value: string | null;
          type: string;
          label?: string | null;
        }>;
      }>;
    } | null;
  }>;
};

type OpportunityItemsPageItems = {
  id: string;
  name: string;
  group?: { title: string } | null;
  column_values: Array<{
    id: string;
    text: string | null;
    value: string | null;
    type: string;
    label?: string | null;
  }>;
};

type OpportunityItemsFirstPageResult = {
  boards: Array<{
    id: string;
    items_count?: number | null;
    items_page: {
      cursor: string | null;
      items: OpportunityItemsPageItems[];
    } | null;
  }>;
};

type NextItemsPageResult = {
  next_items_page: {
    cursor: string | null;
    items: OpportunityItemsPageItems[];
  } | null;
};

type ItemDebugQueryResult = {
  items: Array<{
    id: string;
    name: string;
    column_values: Array<{
      id: string;
      text: string | null;
      value: string | null;
      type: string;
      label?: string | null;
    }>;
  }> | null;
};

const MAX_ITEMS_PER_PAGE = 500;

/** Includes StatusValue.label so color/status columns (e.g. סוכן מפנה) return the human-readable option. */
const COLUMN_VALUES_SELECTION =
  "id text type value ... on StatusValue { label }";

function mapBoardItemsToOpportunities(
  boardId: string,
  items: OpportunityItemsPageItems[]
): MondayOpportunityItem[] {
  return items.map((item) => ({
    boardId,
    id: item.id,
    name: item.name,
    groupTitle: item.group?.title ?? "",
    columnValues: item.column_values.map((columnValue) => ({
      id: columnValue.id,
      text: columnValue.text,
      value: columnValue.value,
      type: columnValue.type,
      label: columnValue.label ?? undefined,
    })),
  }));
}

function resolveMondaySyncColumnIds(): string[] {
  const {
    loanAmountColumnId,
    expectedCommissionColumnId,
    masterPaymentColumnId,
    dealCreationDateColumnId,
    referringAgentColumnId,
    agentNumberColumnId,
    paymentToAgentNumberColumnId,
  } = getMondayOpportunitySyncEnv();

  return [
    ...new Set(
      [
        "deal_stage",
        dealCreationDateColumnId,
        loanAmountColumnId,
        expectedCommissionColumnId,
        masterPaymentColumnId,
        referringAgentColumnId,
        agentNumberColumnId,
        paymentToAgentNumberColumnId,
      ].filter((x): x is string => Boolean(x))
    ),
  ];
}

class MondayApiService implements MondayBoardService {
  async getBoardPreview(limit = 10): Promise<MondayBoardPreview> {
    const { boardId } = getMondayEnv();

    const data = await this.query<BoardPreviewQueryResult>(
      `
        query GetBoardPreview($boardIds: [ID!], $limit: Int!) {
          boards(ids: $boardIds) {
            id
            name
            columns {
              id
              title
              type
            }
            items_page(limit: $limit) {
              items {
                id
                name
                group {
                  title
                }
                column_values {
                  ${COLUMN_VALUES_SELECTION}
                }
              }
            }
          }
        }
      `,
      {
        boardIds: [boardId],
        limit,
      }
    );

    const board = data.boards[0];

    if (!board) {
      throw new Error(`Monday opportunities board ${boardId} was not found.`);
    }

    return {
      boardId: board.id,
      boardName: board.name,
      columns: (board.columns ?? []).map((col) => ({
        id: col.id,
        title: col.title,
        type: col.type,
      })),
      items:
        board.items_page?.items.map((item) => ({
          id: item.id,
          name: item.name,
          group: {
            title: item.group?.title ?? "",
          },
          column_values: item.column_values.map((columnValue) => ({
            id: columnValue.id,
            text: columnValue.text,
            type: columnValue.type,
            value: columnValue.value,
            label: columnValue.label ?? undefined,
          })),
        })) ?? [],
    };
  }

  /**
   * Paginated board items. Pass columnIds to request only those columns (faster sync);
   * pass null for full column_values. When includeBoardItemCount, first query requests items_count.
   */
  private async fetchBoardItemPages(options: {
    pageSize: number;
    maxItems: number | undefined;
    columnIds: string[] | null;
    includeBoardItemCount: boolean;
    includeGroupInItems: boolean;
  }): Promise<MondayOpportunitySyncFetchResult> {
    const { boardId } = getMondayEnv();
    const pageSize = Math.min(Math.max(1, options.pageSize), MAX_ITEMS_PER_PAGE);
    const filterColumns = Boolean(options.columnIds?.length);
    const groupField = options.includeGroupInItems
      ? `group { title }`
      : "";
    const columnValuesField = filterColumns
      ? `column_values(ids: $columnIds) { ${COLUMN_VALUES_SELECTION} }`
      : `column_values { ${COLUMN_VALUES_SELECTION} }`;

    const itemsCountField = options.includeBoardItemCount ? "items_count" : "";

    const firstVariables: Record<string, unknown> = {
      boardIds: [boardId],
      limit: pageSize,
    };
    if (filterColumns) {
      firstVariables.columnIds = options.columnIds;
    }

    const firstQuery = `
        query GetBoardItemsFirst(
          $boardIds: [ID!]
          $limit: Int!
          ${filterColumns ? "$columnIds: [String!]!" : ""}
        ) {
          boards(ids: $boardIds) {
            id
            ${itemsCountField}
            items_page(limit: $limit) {
              cursor
              items {
                id
                name
                ${groupField}
                ${columnValuesField}
              }
            }
          }
        }
      `;

    const firstData = await this.query<OpportunityItemsFirstPageResult>(firstQuery, firstVariables);

    const board = firstData.boards[0];

    if (!board) {
      throw new Error(`Monday opportunities board ${boardId} was not found.`);
    }

    const boardItemCount =
      options.includeBoardItemCount && board.items_count != null ? board.items_count : null;

    const aggregated: MondayOpportunityItem[] = [];
    let pagesFetched = 0;
    let stoppedReason: MondayOpportunitySyncFetchResult["meta"]["stoppedReason"] = "complete";
    let lastCursorFromMonday: string | null = null;

    const referringForLog = filterColumns
      ? getMondayOpportunitySyncEnv().referringAgentColumnId
      : getMondayEnv().referringAgentColumnId ?? null;
    console.log(
      `[Monday sync] referringAgentColumnId=${JSON.stringify(referringForLog)} column_values filter=${filterColumns ? options.columnIds?.length ?? 0 : "all"} ids`
    );

    const appendPageItems = (rawItems: OpportunityItemsPageItems[]) => {
      const cap = options.maxItems != null ? Math.max(0, options.maxItems - aggregated.length) : rawItems.length;
      const slice = rawItems.slice(0, cap);
      if (slice.length > 0) {
        aggregated.push(...mapBoardItemsToOpportunities(board.id, slice));
      }
    };

    const firstPageItems = board.items_page?.items ?? [];
    pagesFetched = 1;
    appendPageItems(firstPageItems);

    const firstCursor = board.items_page?.cursor ?? null;
    lastCursorFromMonday = firstCursor;

    console.log(
      `[Monday sync] page=${pagesFetched} itemsInPage=${firstPageItems.length} fetchedTotal=${aggregated.length} cursor=${firstCursor ? "set" : "null"}`
    );

    if (options.maxItems != null && aggregated.length >= options.maxItems) {
      stoppedReason = "demo_limit";
      const hasMore =
        (firstCursor != null && firstCursor !== "") ||
        (boardItemCount != null && aggregated.length < boardItemCount);
      return {
        items: aggregated,
        meta: {
          boardItemCount,
          pagesFetched,
          hasMore,
          lastCursor: hasMore ? firstCursor : null,
          stoppedReason,
        },
      };
    }

    let cursor = firstCursor;
    let guard = 0;
    const maxPages = 2000;

    while (cursor != null && cursor !== "" && guard < maxPages) {
      if (options.maxItems != null && aggregated.length >= options.maxItems) {
        stoppedReason = "demo_limit";
        break;
      }

      guard += 1;

      const nextVariables: Record<string, unknown> = {
        cursor,
        limit: pageSize,
      };
      if (filterColumns) {
        nextVariables.columnIds = options.columnIds;
      }

      const nextQuery = `
          query GetBoardItemsNext(
            $cursor: String!
            $limit: Int!
            ${filterColumns ? "$columnIds: [String!]!" : ""}
          ) {
            next_items_page(cursor: $cursor, limit: $limit) {
              cursor
              items {
                id
                name
                ${groupField}
                ${columnValuesField}
              }
            }
          }
        `;

      const nextData = await this.query<NextItemsPageResult>(nextQuery, nextVariables);

      const page = nextData.next_items_page;
      if (!page) {
        throw new Error(
          `Monday sync pagination failed: next_items_page returned null while a cursor was set (after page ${pagesFetched}).`
        );
      }

      const pageItems = page.items ?? [];
      pagesFetched += 1;
      appendPageItems(pageItems);

      const nextCursor = page.cursor ?? null;
      lastCursorFromMonday = nextCursor;

      console.log(
        `[Monday sync] page=${pagesFetched} itemsInPage=${pageItems.length} fetchedTotal=${aggregated.length} cursor=${nextCursor ? "set" : "null"}`
      );

      if (options.maxItems != null && aggregated.length >= options.maxItems) {
        stoppedReason = "demo_limit";
        break;
      }

      if (nextCursor == null || nextCursor === "") {
        lastCursorFromMonday = null;
        break;
      }
      if (nextCursor === cursor && pageItems.length === 0) {
        throw new Error(
          "Monday sync pagination stalled: empty page with an unchanged cursor (possible API bug or bad cursor)."
        );
      }
      cursor = nextCursor;
    }

    if (stoppedReason === "complete" && guard >= maxPages && lastCursorFromMonday) {
      throw new Error(
        `Monday sync exceeded maximum pagination depth (${maxPages} pages). Remaining cursor present; increase max pages or contact support.`
      );
    }

    const lastCursor =
      lastCursorFromMonday != null && lastCursorFromMonday !== "" ? lastCursorFromMonday : null;
    const hasMore =
      lastCursor != null ||
      (stoppedReason === "demo_limit" &&
        boardItemCount != null &&
        aggregated.length < boardItemCount);

    return {
      items: aggregated,
      meta: {
        boardItemCount,
        pagesFetched,
        hasMore,
        lastCursor,
        stoppedReason,
      },
    };
  }

  /**
   * All opportunities on the board via cursor pagination (items_page + next_items_page).
   * Full column_values; use getOpportunityItemsForSync for minimal columns.
   */
  async getOpportunityItems(limit = MAX_ITEMS_PER_PAGE): Promise<MondayOpportunityItem[]> {
    const pageSize = Math.min(Math.max(1, limit), MAX_ITEMS_PER_PAGE);
    const { items } = await this.fetchBoardItemPages({
      pageSize,
      maxItems: undefined,
      columnIds: null,
      includeBoardItemCount: false,
      includeGroupInItems: true,
    });
    return items;
  }

  async getOpportunityItemsForSync(options?: {
    pageSize?: number;
    maxItems?: number;
  }): Promise<MondayOpportunitySyncFetchResult> {
    const columnIds = resolveMondaySyncColumnIds();
    if (columnIds.length === 0) {
      throw new Error("Monday sync could not resolve any column ids to fetch.");
    }

    const pageSize = Math.min(
      Math.max(1, options?.pageSize ?? MAX_ITEMS_PER_PAGE),
      MAX_ITEMS_PER_PAGE
    );

    return this.fetchBoardItemPages({
      pageSize,
      maxItems: options?.maxItems,
      columnIds,
      includeBoardItemCount: true,
      includeGroupInItems: true,
    });
  }

  /** TEMPORARY: debug single item; not used by sync. */
  async getItemDebugSnapshot(itemId: string): Promise<MondayItemDebugSnapshot | null> {
    const trimmed = itemId.trim();
    if (!trimmed) {
      return null;
    }

    const data = await this.query<ItemDebugQueryResult>(
      `
        query GetItemDebug($ids: [ID!]) {
          items(ids: $ids) {
            id
            name
            column_values {
              ${COLUMN_VALUES_SELECTION}
            }
          }
        }
      `,
      { ids: [trimmed] }
    );

    const item = data.items?.[0];
    if (!item) {
      return null;
    }

    return {
      id: item.id,
      name: item.name,
      column_values: item.column_values.map((columnValue) => ({
        id: columnValue.id,
        text: columnValue.text,
        type: columnValue.type,
        value: columnValue.value,
        label: columnValue.label ?? undefined,
      })),
    };
  }

  private async query<TData>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<TData> {
    const { apiToken, apiUrl } = getMondayEnv();
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Monday.com request failed with status ${response.status}: ${errorBody}`
      );
    }

    const payload = (await response.json()) as MondayGraphQLResponse<TData>;

    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join("; "));
    }

    if (!payload.data) {
      throw new Error("Monday.com response did not include data.");
    }

    return payload.data;
  }
}

export function getColumnText(
  item: MondayOpportunityItem,
  columnId: string
): string | undefined {
  const value = item.columnValues.find((columnValue) => columnValue.id === columnId);
  const text = value?.text?.trim();

  return text ? text : undefined;
}

function displayFromColumnValueJson(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.label === "string") {
      const s = parsed.label.trim();
      if (s) return s;
    }
    if (typeof parsed.text === "string") {
      const s = parsed.text.trim();
      if (s) return s;
    }
    const values = parsed.values;
    if (Array.isArray(values) && values.length > 0) {
      const parts = values
        .map((v) => {
          if (typeof v === "string") return v.trim();
          if (v && typeof v === "object" && "name" in v) {
            const n = (v as { name?: unknown }).name;
            return typeof n === "string" ? n.trim() : "";
          }
          return "";
        })
        .filter(Boolean);
      if (parts.length) return parts.join(", ");
    }
  } catch {
    // ignore
  }
  return undefined;
}

/**
 * Human-readable cell text: status/color `label`, then `text`, then parsed JSON (label/text/dropdown names).
 * Use for סוכן מפנה when the column is a Monday status (color) field.
 */
export function getColumnDisplayText(
  item: MondayOpportunityItem,
  columnId: string
): string | undefined {
  const col = item.columnValues.find((columnValue) => columnValue.id === columnId);
  if (!col) {
    return undefined;
  }
  const label = col.label?.trim();
  if (label) {
    return label;
  }
  const text = col.text?.trim();
  if (text) {
    return text;
  }
  return displayFromColumnValueJson(col.value);
}

function ymdFromIsoPrefix(raw: string): string | undefined {
  const match = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}

function ymdFromDateParts(y: number, m0: number, d0: number): string | undefined {
  if (!Number.isFinite(y) || m0 < 1 || m0 > 12 || d0 < 1 || d0 > 31) {
    return undefined;
  }
  const m = String(m0).padStart(2, "0");
  const d = String(d0).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday date columns: JSON value shapes (date / from / to / chosen / timestamp), then `text`. */
export function getColumnDateYmd(
  item: MondayOpportunityItem,
  columnId: string
): string | undefined {
  const column = item.columnValues.find((columnValue) => columnValue.id === columnId);
  if (!column) {
    return undefined;
  }

  if (column.value) {
    try {
      const parsed = JSON.parse(column.value) as Record<string, unknown>;
      const fromBlock = parsed.from as { date?: string } | undefined;

      const rawDate =
        (typeof parsed.date === "string" ? parsed.date : undefined) ??
        (typeof parsed.chosen === "string" ? parsed.chosen : undefined) ??
        (typeof parsed.to === "string" ? parsed.to : undefined) ??
        (typeof fromBlock?.date === "string" ? fromBlock.date : undefined);

      if (typeof rawDate === "string") {
        const ymd = ymdFromIsoPrefix(rawDate);
        if (ymd) {
          return ymd;
        }
      }

      const tsRaw = parsed.timestamp ?? parsed.changed_at;
      const ts = typeof tsRaw === "number" ? tsRaw : typeof tsRaw === "string" ? Number(tsRaw) : NaN;
      if (Number.isFinite(ts)) {
        const ms = ts < 1e12 ? ts * 1000 : ts;
        const date = new Date(ms);
        if (!Number.isNaN(date.getTime())) {
          const ymd = ymdFromDateParts(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
          );
          if (ymd) {
            return ymd;
          }
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const text = column.text?.trim();
  if (text) {
    const iso = ymdFromIsoPrefix(text);
    if (iso) {
      return iso;
    }

    const dmySlash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmySlash) {
      const d0 = Number(dmySlash[1]);
      const m0 = Number(dmySlash[2]);
      const y = Number(dmySlash[3]);
      const ymd = ymdFromDateParts(y, m0, d0);
      if (ymd) {
        return ymd;
      }
    }

    const dmyDot = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dmyDot) {
      const d0 = Number(dmyDot[1]);
      const m0 = Number(dmyDot[2]);
      const y = Number(dmyDot[3]);
      const ymd = ymdFromDateParts(y, m0, d0);
      if (ymd) {
        return ymd;
      }
    }

    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) {
      const date = new Date(parsed);
      return ymdFromDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }
  }

  return undefined;
}

export function parseMoney(text: string | undefined): number {
  if (!text) {
    return 0;
  }

  const sanitized = text.replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(sanitized);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function getMondayService(): MondayBoardService {
  return new MondayApiService();
}
