import { discoverAllDesciTokens } from "@/api/desciDiscovery";
import type { DesciDiscoveryResult, DiscoverySourceStatus } from "@/api/desciDiscovery";
import { fetchDexScreenerSnapshots } from "@/api/dexScreener";
import { fetchTokenSnapshots } from "@/api/defiLlama";
import { fallbackDiscoveredTokens } from "@/data/fallbackTokens";
import type { DiscoveredToken, TokenMarketSnapshot, TokenWithMarketData } from "@/types/token";
import { readJsonCache, writeJsonCache } from "@/utils/localCache";

const DISCOVERY_CACHE_KEY = "descai.tokens.discovery.v3";
const LEGACY_DISCOVERY_CACHE_KEYS = ["descai.tokens.discovery.v2"];
const MARKET_CACHE_KEY = "descai.tokens.market.v2";
const ROTATION_CURSOR_KEY = "descai.tokens.rotation.cursor.v2";
const DISCOVERY_REPORT_KEY = "descai.tokens.discovery.report.v1";

const DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000;
const MARKET_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type DiscoveryCache = {
  updatedAt: number;
  tokens: DiscoveredToken[];
};

export type DiscoveryReport = {
  mode: "live" | "cache" | "legacy_cache" | "fallback";
  tokenCount: number;
  generatedAt: number;
  reason?: string;
  sources?: DiscoverySourceStatus[];
};

type MarketCache = {
  updatedAt: number;
  snapshots: Record<string, TokenMarketSnapshot>;
};

let discoveryInFlight: Promise<DesciDiscoveryResult> | null = null;

const now = () => Date.now();

const readDiscoveryCache = (): DiscoveryCache | null => readJsonCache<DiscoveryCache>(DISCOVERY_CACHE_KEY);

const readLegacyDiscoveryCache = (): DiscoveryCache | null => {
  for (const key of LEGACY_DISCOVERY_CACHE_KEYS) {
    const cache = readJsonCache<DiscoveryCache>(key);
    if (cache?.tokens?.length) return cache;
  }
  return null;
};

const writeDiscoveryCache = (tokens: DiscoveredToken[]) => {
  writeJsonCache<DiscoveryCache>(DISCOVERY_CACHE_KEY, { updatedAt: now(), tokens });
};

const readDiscoveryReport = (): DiscoveryReport | null => readJsonCache<DiscoveryReport>(DISCOVERY_REPORT_KEY);

const writeDiscoveryReport = (report: DiscoveryReport) => {
  writeJsonCache<DiscoveryReport>(DISCOVERY_REPORT_KEY, report);
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

const hasCoreMarketFields = (snapshot: TokenMarketSnapshot | undefined) => {
  if (!snapshot) return false;
  return snapshot.price != null && snapshot.priceChange24h != null && (snapshot.fdv != null || snapshot.marketCap != null);
};

const mergeSnapshot = (
  primary: TokenMarketSnapshot | undefined,
  secondary: TokenMarketSnapshot | undefined
): TokenMarketSnapshot | undefined => {
  if (!primary) return secondary;
  if (!secondary) return primary;

  return {
    ...primary,
    price: primary.price ?? secondary.price,
    priceChange24h: primary.priceChange24h ?? secondary.priceChange24h,
    fdv: primary.fdv ?? secondary.fdv ?? secondary.marketCap,
    marketCap: primary.marketCap ?? secondary.marketCap,
    volume24h: primary.volume24h ?? secondary.volume24h,
    timestampMs: Math.max(primary.timestampMs, secondary.timestampMs)
  };
};

export const getCachedMarketSnapshots = (): Record<string, TokenMarketSnapshot> => {
  return readMarketCache().snapshots;
};

export const getLastDiscoveryReport = (): DiscoveryReport | null => readDiscoveryReport();

export const getDiscoveredTokens = async (force = false): Promise<DiscoveredToken[]> => {
  const cached = readDiscoveryCache();
  const legacyCached = readLegacyDiscoveryCache();
  const fallback = fallbackDiscoveredTokens();
  if (!force && isDiscoveryFresh(cached) && cached) {
    if (cached.tokens.length < fallback.length) {
      writeDiscoveryCache(fallback);
      writeDiscoveryReport({
        mode: "fallback",
        tokenCount: fallback.length,
        generatedAt: now(),
        reason: "Cached discovery set was smaller than the built-in fallback dataset"
      });
      return fallback;
    }
    if (!readDiscoveryReport()) {
      writeDiscoveryReport({
        mode: "cache",
        tokenCount: cached.tokens.length,
        generatedAt: now()
      });
    }
    return cached.tokens;
  }

  if (!discoveryInFlight) {
    discoveryInFlight = discoverAllDesciTokens()
      .then((result) => {
        if (result.tokens.length) {
          writeDiscoveryCache(result.tokens);
          writeDiscoveryReport({
            mode: "live",
            tokenCount: result.tokens.length,
            generatedAt: now(),
            sources: result.sources
          });
        }
        return result;
      })
      .finally(() => {
        discoveryInFlight = null;
      });
  }

  try {
    const discovered = await discoveryInFlight;
    if (discovered.tokens.length) return discovered.tokens;
    if (cached?.tokens?.length) {
      writeDiscoveryReport({
        mode: "cache",
        tokenCount: cached.tokens.length,
        generatedAt: now(),
        reason: "Live discovery returned zero tokens",
        sources: discovered.sources
      });
      if (cached.tokens.length >= fallback.length) return cached.tokens;
      writeDiscoveryCache(fallback);
      writeDiscoveryReport({
        mode: "fallback",
        tokenCount: fallback.length,
        generatedAt: now(),
        reason: "Live discovery returned zero tokens",
        sources: discovered.sources
      });
      return fallback;
    }
    if (legacyCached?.tokens?.length) {
      writeDiscoveryCache(legacyCached.tokens);
      writeDiscoveryReport({
        mode: "legacy_cache",
        tokenCount: legacyCached.tokens.length,
        generatedAt: now(),
        reason: "Live discovery returned zero tokens",
        sources: discovered.sources
      });
      return legacyCached.tokens;
    }

    if (fallback.length) {
      writeDiscoveryCache(fallback);
      writeDiscoveryReport({
        mode: "fallback",
        tokenCount: fallback.length,
        generatedAt: now(),
        reason: "Live discovery returned zero tokens",
        sources: discovered.sources
      });
      return fallback;
    }

    return [];
  } catch (error) {
    if (cached?.tokens?.length) {
      if (cached.tokens.length < fallback.length) {
        writeDiscoveryCache(fallback);
        writeDiscoveryReport({
          mode: "fallback",
          tokenCount: fallback.length,
          generatedAt: now(),
          reason: (error as Error).message || "Live discovery failed"
        });
        return fallback;
      }
      writeDiscoveryReport({
        mode: "cache",
        tokenCount: cached.tokens.length,
        generatedAt: now(),
        reason: (error as Error).message || "Live discovery failed"
      });
      return cached.tokens;
    }
    if (legacyCached?.tokens?.length) {
      writeDiscoveryCache(legacyCached.tokens);
      writeDiscoveryReport({
        mode: "legacy_cache",
        tokenCount: legacyCached.tokens.length,
        generatedAt: now(),
        reason: (error as Error).message || "Live discovery failed"
      });
      return legacyCached.tokens;
    }
    if (fallback.length) {
      writeDiscoveryCache(fallback);
      writeDiscoveryReport({
        mode: "fallback",
        tokenCount: fallback.length,
        generatedAt: now(),
        reason: (error as Error).message || "Live discovery failed"
      });
      return fallback;
    }
    console.error("Discovery failed", error);
    throw error;
  }
};

export const mergeTokensWithMarket = (
  tokens: DiscoveredToken[],
  snapshots: Record<string, TokenMarketSnapshot>
): TokenWithMarketData[] => {
  return tokens.map((token) => ({
    ...token,
    market:
      (token.coinKey ? snapshots[token.coinKey] : undefined) ??
      (token.marketSeed
        ? {
            tokenId: token.id,
            coinKey: token.coinKey ?? `seed:${token.id}`,
            price: token.marketSeed.price ?? null,
            priceChange24h: token.marketSeed.priceChange24h ?? null,
            fdv: token.marketSeed.fdv ?? token.marketSeed.marketCap ?? null,
            marketCap: token.marketSeed.marketCap ?? null,
            volume24h: token.marketSeed.volume24h ?? null,
            timestampMs: token.marketSeed.timestampMs ?? token.discoveryTimestamp
          }
        : undefined)
  }));
};

export const refreshSnapshots = async (
  tokens: DiscoveredToken[],
  existingSnapshots?: Record<string, TokenMarketSnapshot>
): Promise<Record<string, TokenMarketSnapshot>> => {
  if (!tokens.length) {
    return existingSnapshots ?? getCachedMarketSnapshots();
  }
  const base = existingSnapshots ?? getCachedMarketSnapshots();
  const fresh = await fetchTokenSnapshots(tokens);
  const dexTargets = tokens.filter((token) => token.coinKey && token.address && !hasCoreMarketFields(fresh[token.coinKey]));
  const dexSnapshots = dexTargets.length ? await fetchDexScreenerSnapshots(dexTargets) : {};
  const merged = {
    ...base,
    ...fresh
  };
  for (const [coinKey, dexSnapshot] of Object.entries(dexSnapshots)) {
    merged[coinKey] = mergeSnapshot(merged[coinKey], dexSnapshot) ?? dexSnapshot;
  }
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
