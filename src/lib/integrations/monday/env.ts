import "server-only";

const DEFAULT_MONDAY_API_URL = "https://api.monday.com/v2";

export function getMondayEnv() {
  const apiToken = process.env.MONDAY_API_TOKEN?.trim();
  const boardId = process.env.MONDAY_BOARD_ID?.trim();
  const apiUrl = process.env.MONDAY_API_URL?.trim() || DEFAULT_MONDAY_API_URL;

  if (!apiToken || !boardId) {
    throw new Error("Monday.com environment variables are missing.");
  }

  return { apiToken, boardId, apiUrl };
}

export function isMondayConfigured() {
  return Boolean(process.env.MONDAY_API_TOKEN && process.env.MONDAY_BOARD_ID);
}
