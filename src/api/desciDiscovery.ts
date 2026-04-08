import type { DiscoveredToken, TokenPlatform, TokenSource } from "@/types/token";
import { extractLooseTokenFields, extractRecords, extractTokenCore, isRecord, looksLikeBioIpt, parseChain } from "@/utils/tokenNormalization";

const PUMP_DISCOVERY_URL = "/api/pump-science/token-tickers";
const BIODAO_DAOS_URL = "/api/bio/liquid-daos";
const BIODAO_AGENTS_URL = "/api/bio/liquid-agents";
const MOLECULE_DISCOVERY_URL = "/api/molecule/ipts";

type JsonRecord = Record<string, unknown>;

const safeFetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Discovery request failed (${response.status}) for ${url}`);
  }
  return response.json();
};

const fetchMoleculeRecords = async (): Promise<JsonRecord[]> => {
  try {
    const payload = await safeFetchJson(MOLECULE_DISCOVERY_URL);
    return extractRecords(payload);
  } catch {
    return [];
  }
};

type NormalizeOptions = {
  platform: TokenPlatform;
  source: TokenSource;
  skipRecord?: (record: JsonRecord) => boolean;
};

const fallbackSeededCore = (record: JsonRecord) => {
  if (!isRecord(record.marketSeed)) return null;

  const loose = extractLooseTokenFields(record);
  if (!loose) return null;

  return {
    symbol: loose.symbol,
    name: loose.name,
    address: null,
    chain: parseChain(record.chain ?? record.chainId ?? record.networkId),
    coinKey: null
  };
};

const normalizeRecords = (records: JsonRecord[], options: NormalizeOptions): DiscoveredToken[] => {
  const now = Date.now();
  const normalized: DiscoveredToken[] = [];

  for (const record of records) {
    if (options.skipRecord?.(record)) continue;
    const core = extractTokenCore(record) ?? fallbackSeededCore(record);
    if (!core) continue;
    const cleanSymbol = core.symbol.replace(/\s+/g, "").toUpperCase();
    const symbol = cleanSymbol.startsWith("$") ? cleanSymbol : `$${cleanSymbol}`;
    const name = core.name;
    const id = `${core.coinKey}:${options.source}`;
    const marketSeed = isRecord(record.marketSeed)
      ? {
          price: typeof record.marketSeed.price === "number" ? record.marketSeed.price : null,
          priceChange24h: typeof record.marketSeed.priceChange24h === "number" ? record.marketSeed.priceChange24h : null,
          fdv: typeof record.marketSeed.fdv === "number" ? record.marketSeed.fdv : null,
          marketCap: typeof record.marketSeed.marketCap === "number" ? record.marketSeed.marketCap : null,
          volume24h: typeof record.marketSeed.volume24h === "number" ? record.marketSeed.volume24h : null,
          timestampMs: typeof record.marketSeed.timestampMs === "number" ? record.marketSeed.timestampMs : now
        }
      : undefined;

    normalized.push({
      id,
      symbol,
      name,
      address: core.address,
      chain: core.chain,
      coinKey: core.coinKey,
      platform: options.platform,
      platforms: [options.platform],
      sources: [options.source],
      discoveryTimestamp: now,
      marketSeed
    });
  }

  return normalized;
};

const dedupeTokens = (tokens: DiscoveredToken[]): DiscoveredToken[] => {
  const merged = new Map<string, DiscoveredToken>();

  for (const token of tokens) {
    const mergeKey = token.coinKey ?? `${token.platform}:${token.symbol}`;
    const existing = merged.get(mergeKey);
    if (!existing) {
      merged.set(mergeKey, token);
      continue;
    }

    const mergedPlatforms = new Set<TokenPlatform>([...existing.platforms, ...token.platforms]);
    const mergedSources = new Set<TokenSource>([...existing.sources, ...token.sources]);

    merged.set(mergeKey, {
      ...existing,
      symbol: existing.symbol.length >= token.symbol.length ? existing.symbol : token.symbol,
      name: existing.name.length >= token.name.length ? existing.name : token.name,
      address: existing.address ?? token.address,
      chain: existing.chain !== "unknown" ? existing.chain : token.chain,
      coinKey: existing.coinKey ?? token.coinKey,
      marketSeed: existing.marketSeed ?? token.marketSeed,
      platform: existing.platform,
      platforms: Array.from(mergedPlatforms),
      sources: Array.from(mergedSources)
    });
  }

  return Array.from(merged.values()).sort((left, right) => left.symbol.localeCompare(right.symbol));
};

export async function discoverAllDesciTokens(): Promise<DiscoveredToken[]> {
  const settled = await Promise.allSettled([
    safeFetchJson(PUMP_DISCOVERY_URL),
    fetchMoleculeRecords(),
    safeFetchJson(BIODAO_DAOS_URL),
    safeFetchJson(BIODAO_AGENTS_URL)
  ]);

  const [pumpResult, moleculeResult, bioDaosResult, bioAgentsResult] = settled;

  const tokens: DiscoveredToken[] = [];

  if (pumpResult.status === "fulfilled") {
    const pumpRecords = extractRecords(pumpResult.value);
    tokens.push(...normalizeRecords(pumpRecords, { platform: "Pump.Science", source: "pump_science" }));
  }

  if (moleculeResult.status === "fulfilled") {
    tokens.push(...normalizeRecords(moleculeResult.value, { platform: "Molecule", source: "molecule" }));
  }

  if (bioDaosResult.status === "fulfilled") {
    const daoRecords = extractRecords(bioDaosResult.value);
    tokens.push(
      ...normalizeRecords(daoRecords, {
        platform: "BioDAO",
        source: "bio_dao_dao",
        skipRecord: looksLikeBioIpt
      })
    );
  }

  if (bioAgentsResult.status === "fulfilled") {
    const agentRecords = extractRecords(bioAgentsResult.value);
    tokens.push(
      ...normalizeRecords(agentRecords, {
        platform: "BioDAO",
        source: "bio_dao_agent",
        skipRecord: looksLikeBioIpt
      })
    );
  }

  return dedupeTokens(tokens);
}
