import "server-only";

import { getMondayEnv } from "@/lib/integrations/monday/env";
import type {
  MondayBoardPreview,
  MondayBoardService,
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
    items_page: {
      items: Array<{
        id: string;
        name: string;
      }>;
    } | null;
  }>;
};

class MondayApiService implements MondayBoardService {
  async getBoardPreview(limit = 10): Promise<MondayBoardPreview> {
    const { boardId } = getMondayEnv();
    const data = await this.query<BoardPreviewQueryResult>(
      `
        query GetBoardPreview($boardIds: [ID!], $limit: Int!) {
          boards(ids: $boardIds) {
            id
            name
            items_page(limit: $limit) {
              items {
                id
                name
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
      throw new Error(`Monday board ${boardId} was not found.`);
    }

    return {
      boardId: board.id,
      boardName: board.name,
      items:
        board.items_page?.items.map((item) => ({
          id: item.id,
          name: item.name,
        })) ?? [],
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

export function getMondayService(): MondayBoardService {
  return new MondayApiService();
}
