import { discoverAllDesciTokens } from "@/api/desciDiscovery";
import { fetchTokenSnapshots } from "@/api/defiLlama";
import { fallbackDiscoveredTokens } from "@/data/fallbackTokens";
import type { DiscoveredToken, TokenMarketSnapshot, TokenWithMarketData } from "@/types/token";
import { readJsonCache, writeJsonCache } from "@/utils/localCache";

const DISCOVERY_CACHE_KEY = "descai.tokens.discovery.v5";
const MARKET_CACHE_KEY = "descai.tokens.market.v3";
const ROTATION_CURSOR_KEY = "descai.tokens.rotation.cursor.v2";

const DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000;
const MARKET_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type DiscoveryCache = {
  updatedAt: number;
  tokens: DiscoveredToken[];
};

type MarketCache = {
  updatedAt: number;
  snapshots: Record<string, TokenMarketSnapshot>;
};

let discoveryInFlight: Promise<DiscoveredToken[]> | null = null;

const now = () => Date.now();

const readDiscoveryCache = (): DiscoveryCache | null => readJsonCache<DiscoveryCache>(DISCOVERY_CACHE_KEY);

const writeDiscoveryCache = (tokens: DiscoveredToken[]) => {
  writeJsonCache<DiscoveryCache>(DISCOVERY_CACHE_KEY, { updatedAt: now(), tokens });
};

const readMarketCache = (): MarketCache => {
  const cache = readJsonCache<MarketCache>(MARKET_CACHE_KEY);
  if (!cache || !cache.snapshots) {
    return { updatedAt: 0, snapshots: {} };
  }
  return cache;
};

const writeMarketCache = (snapshots: Record<string, TokenMarketSnapshot>) => {
  const retained: Record<string, TokenMarketSnapshot> = {};
  const timestamp = now();
  for (const [coinKey, snapshot] of Object.entries(snapshots)) {
    if (timestamp - snapshot.timestampMs <= MARKET_RETENTION_MS) {
      retained[coinKey] = snapshot;
    }
  }
  writeJsonCache<MarketCache>(MARKET_CACHE_KEY, { updatedAt: timestamp, snapshots: retained });
};

const isDiscoveryFresh = (cache: DiscoveryCache | null) => {
  if (!cache) return false;
  return now() - cache.updatedAt <= DISCOVERY_TTL_MS;
};

export const getCachedMarketSnapshots = (): Record<string, TokenMarketSnapshot> => {
  return sanitizeSnapshots(readMarketCache().snapshots);
};

const positiveNumber = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

const snapshotHasQuote = (snapshot: TokenMarketSnapshot | undefined): boolean => {
  if (!snapshot) return false;
  return (
    positiveNumber(snapshot.price) !== null ||
    positiveNumber(snapshot.fdv) !== null ||
    positiveNumber(snapshot.marketCap) !== null
  );
};

const sanitizeSnapshots = (snapshots: Record<string, TokenMarketSnapshot>): Record<string, TokenMarketSnapshot> => {
  const sanitized: Record<string, TokenMarketSnapshot> = {};
  for (const [coinKey, snapshot] of Object.entries(snapshots)) {
    if (snapshotHasQuote(snapshot)) {
      sanitized[coinKey] = snapshot;
    }
  }
  return sanitized;
};

const seededSnapshotFor = (token: DiscoveredToken): TokenMarketSnapshot | undefined => {
  if (!token.marketSeed) return undefined;

  return {
    tokenId: token.id,
    coinKey: token.coinKey ?? `seed:${token.id}`,
    price: token.marketSeed.price ?? null,
    priceChange24h: token.marketSeed.priceChange24h ?? null,
    fdv: token.marketSeed.fdv ?? token.marketSeed.marketCap ?? null,
    marketCap: token.marketSeed.marketCap ?? null,
    volume24h: token.marketSeed.volume24h ?? null,
    timestampMs: token.marketSeed.timestampMs ?? token.discoveryTimestamp
  };
};

const mergeSnapshotWithSeed = (
  snapshot: TokenMarketSnapshot | undefined,
  seed: TokenMarketSnapshot | undefined
): TokenMarketSnapshot | undefined => {
  const liveSnapshot = snapshotHasQuote(snapshot) ? snapshot : undefined;
  if (!liveSnapshot) return seed;
  if (!seed) return liveSnapshot;

  return {
    ...seed,
    ...liveSnapshot,
    price: positiveNumber(liveSnapshot.price) ?? positiveNumber(seed.price),
    priceChange24h: liveSnapshot.priceChange24h ?? seed.priceChange24h,
    fdv: positiveNumber(liveSnapshot.fdv) ?? positiveNumber(seed.fdv),
    marketCap: positiveNumber(liveSnapshot.marketCap) ?? positiveNumber(seed.marketCap),
    volume24h: positiveNumber(liveSnapshot.volume24h) ?? positiveNumber(seed.volume24h),
    timestampMs: liveSnapshot.timestampMs ?? seed.timestampMs
  };
};

export const getDiscoveredTokens = async (force = false): Promise<DiscoveredToken[]> => {
  const cached = readDiscoveryCache();
  if (!force && isDiscoveryFresh(cached) && cached) {
    return cached.tokens;
  }

  if (!discoveryInFlight) {
    discoveryInFlight = discoverAllDesciTokens()
      .then((tokens) => {
        if (tokens.length) {
          writeDiscoveryCache(tokens);
          return tokens;
        }

        const fallbackTokens = fallbackDiscoveredTokens();
        writeDiscoveryCache(fallbackTokens);
        return fallbackTokens;
      })
      .finally(() => {
        discoveryInFlight = null;
      });
  }

  try {
    const discovered = await discoveryInFlight;
    if (discovered.length) return discovered;
    if (cached?.tokens?.length) return cached.tokens;
    return fallbackDiscoveredTokens();
  } catch (error) {
    if (cached?.tokens?.length) return cached.tokens;
    console.error("Discovery failed", error);
    return fallbackDiscoveredTokens();
  }
};

export const mergeTokensWithMarket = (
  tokens: DiscoveredToken[],
  snapshots: Record<string, TokenMarketSnapshot>
): TokenWithMarketData[] => {
  return tokens.map((token) => ({
    ...token,
    market: mergeSnapshotWithSeed(token.coinKey ? snapshots[token.coinKey] : undefined, seededSnapshotFor(token))
  }));
};

export const refreshSnapshots = async (
  tokens: DiscoveredToken[],
  existingSnapshots?: Record<string, TokenMarketSnapshot>
): Promise<Record<string, TokenMarketSnapshot>> => {
  if (!tokens.length) {
    return existingSnapshots ?? getCachedMarketSnapshots();
  }
  const base = sanitizeSnapshots(existingSnapshots ?? getCachedMarketSnapshots());
  const fresh = sanitizeSnapshots(await fetchTokenSnapshots(tokens));
  const merged = sanitizeSnapshots({
    ...base,
    ...fresh
  });
  writeMarketCache(merged);
  return merged;
};

export const pickRotationChunk = (tokens: DiscoveredToken[], size = 60): DiscoveredToken[] => {
  if (!tokens.length) return [];
  const chunkSize = Math.max(1, size);
  const rawCursor = Number(readJsonCache<number>(ROTATION_CURSOR_KEY) ?? 0);
  const cursor = Number.isFinite(rawCursor) ? Math.max(0, Math.floor(rawCursor)) : 0;
  const normalizedCursor = cursor % tokens.length;

  const picked: DiscoveredToken[] = [];
  for (let offset = 0; offset < Math.min(chunkSize, tokens.length); offset += 1) {
    picked.push(tokens[(normalizedCursor + offset) % tokens.length]);
  }

  const nextCursor = (normalizedCursor + chunkSize) % tokens.length;
  writeJsonCache<number>(ROTATION_CURSOR_KEY, nextCursor);
  return picked;
};
