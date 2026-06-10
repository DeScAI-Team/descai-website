import { requireEnv, sleep } from "./env.mjs";

const DEFAULT_DATABASE_ID = "9b6bc07b-fce1-42bf-b813-2c7e1670d9ae";
const DEFAULT_POLL_INTERVAL_MS = 15_000;
const DEFAULT_MAX_WAIT_MS = 2 * 60 * 60 * 1000;

function getD1Config() {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = requireEnv("CLOUDFLARE_API_TOKEN");
  const databaseId =
    process.env.CLOUDFLARE_D1_DATABASE_ID?.trim() || DEFAULT_DATABASE_ID;

  return { accountId, apiToken, databaseId };
}

/**
 * Run a parameterized SQL query against Cloudflare D1.
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function queryD1(sql, params = []) {
  const { accountId, apiToken, databaseId } = getD1Config();
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ sql, params }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const errors = payload.errors?.map((e) => e.message).join("; ") || response.statusText;
    throw new Error(`D1 query failed (${response.status}): ${errors}`);
  }

  const result = payload.result?.[0];
  if (!result?.success) {
    const error = result?.error || "unknown D1 error";
    throw new Error(`D1 query error: ${error}`);
  }

  return result.results ?? [];
}

/**
 * Poll orchestrator_status_events for rows recorded after `since`.
 * Calls onEvent for each new row; resolves when status is "done".
 */
export async function pollStatusEvents({
  since,
  onEvent,
  log,
  pollIntervalMs = Number(process.env.D1_POLL_INTERVAL_MS) || DEFAULT_POLL_INTERVAL_MS,
  maxWaitMs = Number(process.env.D1_MAX_WAIT_MS) || DEFAULT_MAX_WAIT_MS,
}) {
  const deadline = Date.now() + maxWaitMs;
  let lastSeenId = 0;

  log?.(`Polling D1 for status events after ${since}…`);

  while (Date.now() < deadline) {
    const rows = await queryD1(
      `SELECT id, run_id, status, recorded_at
       FROM orchestrator_status_events
       WHERE recorded_at > ?
       ORDER BY id ASC`,
      [since]
    );

    for (const row of rows) {
      const id = Number(row.id);
      if (!Number.isFinite(id) || id <= lastSeenId) continue;

      lastSeenId = id;
      onEvent?.(row);

      if (String(row.status).toLowerCase() === "done") {
        return row;
      }
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`Timed out after ${maxWaitMs}ms waiting for status=done in D1`);
}
