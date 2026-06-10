import { requireEnv } from "./env.mjs";

const DEFAULT_BASE_URL = "https://api.1claw.xyz";
export const DEFAULT_SECRET_PATHS = [
  "akash/AGE_SECRET_KEY_ENV",
  "akash/AGE_SECRET_KEY_ARWEAVE",
];

export const ENV_VAR_BY_PATH = {
  "akash/AGE_SECRET_KEY_ENV": "AGE_SECRET_KEY_ENV",
  "akash/AGE_SECRET_KEY_ARWEAVE": "AGE_SECRET_KEY_ARWEAVE",
};

async function readErrorBody(response) {
  try {
    const text = await response.text();
    return text || response.statusText;
  } catch {
    return response.statusText;
  }
}

function readApiKey() {
  const value =
    process.env.ONECLAW_API_KEY?.trim() ||
    process.env.ONECLAW_AGENT_API_KEY?.trim();
  if (!value) {
    throw new Error("Missing required env var: ONECLAW_API_KEY (or ONECLAW_AGENT_API_KEY)");
  }
  return value;
}

function apiKeyKind(apiKey) {
  if (apiKey.startsWith("ocv_")) return "agent";
  if (apiKey.startsWith("1ck_")) return "personal";
  return "unknown";
}

async function fetchAgentToken({ baseUrl, apiKey, agentId }) {
  const body = { api_key: apiKey };
  if (agentId) body.agent_id = agentId;

  const response = await fetch(`${baseUrl}/v1/auth/agent-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await readErrorBody(response);
    const hint =
      apiKeyKind(apiKey) === "personal"
        ? " ONECLAW_API_KEY looks like a personal key (1ck_). Use your agent's ocv_ key from the Agents page, or keep 1ck_ and the script will use it directly."
        : apiKeyKind(apiKey) === "unknown"
          ? " Agent keys start with ocv_; personal dashboard keys start with 1ck_."
          : "";
    throw new Error(`agent-token failed (${response.status}): ${detail}${hint}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("agent-token response missing access_token");
  }

  return data;
}

async function resolveAuth({ baseUrl, apiKey, agentId, log }) {
  const kind = apiKeyKind(apiKey);

  if (kind === "personal") {
    log?.("  auth: personal API key (1ck_) — using as Bearer token");
    return { access_token: apiKey };
  }

  if (kind === "agent") {
    log?.("  auth: agent API key (ocv_) — exchanging for JWT");
    return fetchAgentToken({ baseUrl, apiKey, agentId });
  }

  log?.("  auth: unknown key prefix — trying agent-token exchange");
  return fetchAgentToken({ baseUrl, apiKey, agentId });
}

async function fetchSecret({ baseUrl, token, vaultId, secretPath }) {
  const encodedPath = secretPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const response = await fetch(
    `${baseUrl}/v1/vaults/${encodeURIComponent(vaultId)}/secrets/${encodedPath}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error(`secrets.get failed (${response.status}): ${await readErrorBody(response)}`);
  }

  return response.json();
}

function extractSecretValue(payload) {
  if (!payload || typeof payload !== "object") return undefined;
  if (typeof payload.value === "string") return payload.value;
  if (payload.data && typeof payload.data.value === "string") return payload.data.value;
  return undefined;
}

function parseSecretPaths() {
  const raw = process.env.ONECLAW_SECRET_PATHS?.trim();
  if (!raw) return DEFAULT_SECRET_PATHS;
  return raw.split(",").map((part) => part.trim()).filter(Boolean);
}

export function maskSecret(value) {
  if (!value || typeof value !== "string") return "(empty)";
  if (value.length <= 12) return "***";
  return `${value.slice(0, 16)}…${value.slice(-8)} (len=${value.length})`;
}

/**
 * Fetch configured 1claw secrets and return them keyed by env var name.
 * @param {{ log?: (...args: unknown[]) => void }} [options]
 */
export async function fetchOneclawSecrets({ log } = {}) {
  const apiKey = readApiKey();
  const vaultId = requireEnv("ONECLAW_VAULT_ID");
  const agentId = process.env.ONECLAW_AGENT_ID?.trim();
  const baseUrl = (process.env.ONECLAW_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  const secretPaths = parseSecretPaths();

  log?.("Connecting to 1claw…");
  log?.("  baseUrl:", baseUrl);
  log?.("  vaultId:", vaultId);
  log?.("  agentId:", agentId || "(not set — key-only auth)");
  log?.("  paths:", secretPaths.join(", "));

  const auth = await resolveAuth({ baseUrl, apiKey, agentId, log });
  if (auth.agent_id) {
    log?.("  resolved agentId:", auth.agent_id);
  }

  const secrets = {};
  const failures = [];

  for (const secretPath of secretPaths) {
    const envName = ENV_VAR_BY_PATH[secretPath] ?? secretPath.split("/").pop();

    try {
      const payload = await fetchSecret({
        baseUrl,
        token: auth.access_token,
        vaultId,
        secretPath,
      });
      const value = extractSecretValue(payload);

      if (!value) {
        failures.push(`${secretPath}: response had no string value`);
        continue;
      }

      secrets[envName] = value;
      log?.(`  fetched ${envName}: ${maskSecret(value)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${secretPath}: ${message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Failed to fetch ${failures.length} secret(s): ${failures.join("; ")}`
    );
  }

  return secrets;
}
