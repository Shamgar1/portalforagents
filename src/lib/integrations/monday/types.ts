export type MondayClientSyncRecord = {
  itemId: string;
  boardId?: string;
  lastSyncedAt?: string;
};

export type MondayBoardItem = {
  id: string;
  name: string;
};

export type MondayBoardPreview = {
  boardId: string;
  boardName: string;
  items: MondayBoardItem[];
};

export interface MondayBoardService {
  getBoardPreview(limit?: number): Promise<MondayBoardPreview>;
}

export interface MondaySyncService {
  syncClient(clientId: string): Promise<MondayClientSyncRecord>;
}
