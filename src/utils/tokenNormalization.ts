import type { TokenChain } from "@/types/token";

type JsonRecord = Record<string, unknown>;

const CHAIN_ID_MAP: Record<number, TokenChain> = {
  1: "ethereum",
  8453: "base"
};

const ARRAY_KEYS = ["items", "data", "results", "tokens", "daos", "agents", "records", "list"];

const ADDRESS_KEYS = [
  "address",
  "tokenAddress",
  "contractAddress",
  "mintAddress",
  "mint",
  "tokenMint",
  "assetAddress",
  "ca",
  "onchainID",
  "onchainId"
];

const SYMBOL_KEYS = ["symbol", "ticker", "tokenTicker", "tokenSymbol", "code"];
const NAME_KEYS = ["name", "title", "tokenName", "displayName", "daoName", "agentName", "projectName"];
const CHAIN_KEYS = ["chain", "network", "chainName", "tokenChain", "blockchain", "chainId", "networkId"];

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const firstString = (record: JsonRecord, keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key];
    const asString = toString(value);
    if (asString) return asString;
  }
  return null;
};

export const parseChain = (value: unknown): TokenChain => {
  if (typeof value === "number") {
    return CHAIN_ID_MAP[value] ?? "unknown";
  }
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "unknown";
  if (normalized === "1" || normalized.includes("ethereum") || normalized === "eth" || normalized.includes("mainnet")) {
    return "ethereum";
  }
  if (normalized === "8453" || normalized.includes("base")) return "base";
  if (normalized.includes("solana") || normalized === "sol") return "solana";
  return "unknown";
};

const normalizeAddress = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const prefixed = trimmed.includes(":") ? trimmed.split(":").at(-1) ?? trimmed : trimmed;
  if (prefixed.startsWith("0x")) return prefixed.toLowerCase();
  return prefixed;
};

const chainFromAddressPrefix = (value: string): TokenChain => {
  const trimmed = value.trim();
  if (!trimmed.includes(":")) return "unknown";
  const prefix = trimmed.split(":")[0];
  return parseChain(prefix);
};

export const coinKeyFrom = (chain: TokenChain, address: string): string | null => {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress || chain === "unknown") return null;
  if (chain === "solana") return `solana:${normalizedAddress}`;
  if (!normalizedAddress.startsWith("0x")) return null;
  return `${chain}:${normalizedAddress.toLowerCase()}`;
};

const inferChainFromRecord = (record: JsonRecord, address: string): TokenChain => {
  const explicit = firstString(record, CHAIN_KEYS);
  const parsedExplicit = parseChain(explicit ?? record.chainId ?? record.networkId);
  if (parsedExplicit !== "unknown") return parsedExplicit;

  const serialized = JSON.stringify(record).toLowerCase();
  if (/(\b|_)sol(ana)?(\b|_)/.test(serialized)) return "solana";
  if (/(\b|_)base(\b|_)/.test(serialized)) return "base";
  if (address.startsWith("0x")) return "ethereum";
  return "unknown";
};

export const extractTokenCore = (record: JsonRecord) => {
  const symbol = firstString(record, SYMBOL_KEYS);
  const name = firstString(record, NAME_KEYS);

  const candidateAddress =
    firstString(record, ADDRESS_KEYS) ??
    (isRecord(record.token) ? firstString(record.token, ADDRESS_KEYS) : null) ??
    (isRecord(record.asset) ? firstString(record.asset, ADDRESS_KEYS) : null);

  if (!candidateAddress) return null;

  const prefixedChain = chainFromAddressPrefix(candidateAddress);
  const address = normalizeAddress(candidateAddress);
  if (address.length < 8) return null;

  const inferred = inferChainFromRecord(record, address);
  const chain = inferred !== "unknown" ? inferred : prefixedChain;
  const coinKey = coinKeyFrom(chain, address);
  if (!coinKey) return null;

  return {
    symbol: symbol ?? name ?? address.slice(0, 8),
    name: name ?? symbol ?? coinKey,
    address,
    chain,
    coinKey
  };
};

export const extractLooseTokenFields = (record: JsonRecord) => {
  const symbol = firstString(record, SYMBOL_KEYS);
  const name = firstString(record, NAME_KEYS);
  if (!symbol && !name) return null;
  return {
    symbol: symbol ?? name ?? "UNKNOWN",
    name: name ?? symbol ?? "Unknown token"
  };
};

const flattenMapLikeObject = (record: JsonRecord): JsonRecord[] => {
  const entries = Object.entries(record);
  if (!entries.length) return [];

  const scalarValueOnly = entries.every(([, value]) => typeof value === "string" || typeof value === "number");
  if (!scalarValueOnly) return [];

  const looksAddressLike = (value: string) => {
    if (value.startsWith("0x")) return true;
    if (value.includes(":")) {
      const [prefix, suffix] = value.split(":");
      return parseChain(prefix) !== "unknown" && Boolean(suffix);
    }
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  };

  return entries.map(([key, value]) => {
    if (typeof value === "string" && looksAddressLike(value.trim())) {
      return { symbol: key, address: value };
    }
    return { symbol: key, name: String(value) };
  });
};

export const extractRecords = (payload: unknown): JsonRecord[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (!isRecord(payload)) return [];

  for (const key of ARRAY_KEYS) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }

  const mapped = flattenMapLikeObject(payload);
  if (mapped.length) return mapped;

  return [payload];
};

export const looksLikeBioIpt = (record: JsonRecord): boolean => {
  if (record.isIpt === true) return true;

  const tagFields = ["type", "tokenType", "assetType", "category", "kind", "source"];
  const tags = tagFields
    .map((field) => toString(record[field])?.toLowerCase() ?? "")
    .filter(Boolean);
  if (tags.some((tag) => tag.includes("ipt"))) return true;

  const serialized = JSON.stringify(record).toLowerCase();
  return serialized.includes('"isipt":true') || (serialized.includes("molecule") && serialized.includes("ipt"));
};
