#!/usr/bin/env bash

set -euo pipefail

timestamp() {
  date +"%Y-%m-%d %H:%M:%S %Z"
}

APP_BASE_URL="${APP_BASE_URL:-}"
MONDAY_SYNC_CRON_SECRET="${MONDAY_SYNC_CRON_SECRET:-}"

if [[ -z "$APP_BASE_URL" ]]; then
  echo "[$(timestamp)] ERROR: APP_BASE_URL is not set"
  exit 1
fi

if [[ -z "$MONDAY_SYNC_CRON_SECRET" ]]; then
  echo "[$(timestamp)] ERROR: MONDAY_SYNC_CRON_SECRET is not set"
  exit 1
fi

SYNC_URL="${APP_BASE_URL%/}/api/integrations/monday/sync/auto"

echo "[$(timestamp)] INFO: Triggering Monday auto sync: $SYNC_URL"

http_response="$(
  curl -sS \
    --max-time 300 \
    -X POST "$SYNC_URL" \
    -H "x-sync-secret: $MONDAY_SYNC_CRON_SECRET" \
    -H "content-type: application/json" \
    -w "\n%{http_code}"
)"

response_body="$(printf "%s" "$http_response" | sed '$d')"
status_code="$(printf "%s" "$http_response" | sed -n '$p')"

echo "[$(timestamp)] INFO: Monday auto sync HTTP status: $status_code"
echo "[$(timestamp)] INFO: Response: $response_body"

if [[ "$status_code" -ge 200 && "$status_code" -lt 300 ]]; then
  echo "[$(timestamp)] INFO: Monday auto sync completed successfully"
  exit 0
fi

echo "[$(timestamp)] ERROR: Monday auto sync failed"
exit 1
