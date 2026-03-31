import type { DiscoveredToken, TokenPlatform, TokenSource } from "@/types/token";
import { extractRecords, extractTokenCore, isRecord, looksLikeBioIpt } from "@/utils/tokenNormalization";

const PUMP_DISCOVERY_URL = "https://pump.science/api/token-tickers";
const BIODAO_DAOS_URL = "https://app.bio.xyz/api/liquid-daos";
const BIODAO_AGENTS_URL = "https://app.bio.xyz/api/liquid-agents";
const MOLECULE_GRAPHQL_ENDPOINT =
  (import.meta.env.VITE_MOLECULE_GRAPHQL_ENDPOINT as string | undefined) ??
  "https://production.graphql.api.molecule.xyz/graphql";
const MOLECULE_API_KEY = import.meta.env.VITE_MOLECULE_API_KEY as string | undefined;

type JsonRecord = Record<string, unknown>;

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type MoleculeIptRecord = {
  id?: string;
  l2TokenAddress?: string | null;
  name?: string | null;
  symbol?: string | null;
  markets?: Array<{
    chainId?: number | null;
    usdPrice?: number | null;
    usdPrice24hrPercentageChange?: number | null;
    marketCapUsd?: number | null;
    tradingVolume24hr?: number | null;
    chain?: {
      name?: string | null;
      chainId?: number | null;
    } | null;
  }> | null;
};

type MoleculeMarketRecord = NonNullable<MoleculeIptRecord["markets"]>[number];

const safeFetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Discovery request failed (${response.status}) for ${url}`);
  }
  return response.json();
};

const moleculeRequest = async <T>(query: string): Promise<T> => {
  if (!MOLECULE_API_KEY) {
    throw new Error("Missing VITE_MOLECULE_API_KEY");
  }
  const response = await fetch(MOLECULE_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": MOLECULE_API_KEY
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(`Molecule request failed (${response.status})`);
  }
  const parsed = (await response.json()) as GraphQLResponse<T>;
  if (parsed.errors?.length) {
    const message = parsed.errors.map((entry) => entry.message).filter(Boolean).join("; ");
    throw new Error(message || "Molecule GraphQL error");
  }
  if (!parsed.data) {
    throw new Error("Molecule response missing data");
  }
  return parsed.data;
};

const fetchMoleculeRecords = async (): Promise<JsonRecord[]> => {
  if (!MOLECULE_API_KEY) {
    return [];
  }

  const query = `
    query DiscoverMoleculeTokens {
      ipts(limit: 500) {
        id
        l2TokenAddress
        name
        symbol
        markets {
          chainId
          usdPrice
          usdPrice24hrPercentageChange
          marketCapUsd
          tradingVolume24hr
          chain {
            name
            chainId
          }
        }
      }
    }
  `;

  try {
    const data = await moleculeRequest<{ ipts?: MoleculeIptRecord[] }>(query);
    const ipts = data.ipts ?? [];
    return ipts
      .map((ipt) => {
        const markets = (ipt.markets ?? []).filter(Boolean) as MoleculeMarketRecord[];
        const scoredMarkets = [...markets]
          .filter((market) => (market.chainId ?? market.chain?.chainId) !== null && (market.chainId ?? market.chain?.chainId) !== undefined)
          .sort((left, right) => {
            const leftMcap = left.marketCapUsd ?? 0;
            const rightMcap = right.marketCapUsd ?? 0;
            if (rightMcap !== leftMcap) return rightMcap - leftMcap;
            const leftVol = left.tradingVolume24hr ?? 0;
            const rightVol = right.tradingVolume24hr ?? 0;
            if (rightVol !== leftVol) return rightVol - leftVol;
            const leftPrice = left.usdPrice ?? 0;
            const rightPrice = right.usdPrice ?? 0;
            return rightPrice - leftPrice;
          });

        const selectedMarket =
          scoredMarkets.find((market) => (market.usdPrice ?? 0) > 0 && (market.marketCapUsd ?? 0) > 0) ??
          scoredMarkets.find((market) => (market.usdPrice ?? 0) > 0) ??
          scoredMarkets[0];

        const chainId = selectedMarket?.chainId ?? selectedMarket?.chain?.chainId ?? undefined;
        const chain = selectedMarket?.chain?.name ?? undefined;

        return {
          address: ipt.l2TokenAddress ?? ipt.id ?? undefined,
          symbol: ipt.symbol ?? undefined,
          name: ipt.name ?? undefined,
          chainId,
          chain,
          marketSeed: selectedMarket
            ? {
                price: (selectedMarket.usdPrice ?? 0) > 0 ? selectedMarket.usdPrice ?? null : null,
                priceChange24h: selectedMarket.usdPrice24hrPercentageChange ?? null,
                marketCap: (selectedMarket.marketCapUsd ?? 0) > 0 ? selectedMarket.marketCapUsd ?? null : null,
                fdv: (selectedMarket.marketCapUsd ?? 0) > 0 ? selectedMarket.marketCapUsd ?? null : null,
                volume24h: selectedMarket.tradingVolume24hr ?? null,
                timestampMs: Date.now()
              }
            : undefined
        } satisfies JsonRecord;
      })
      .filter((entry) => typeof entry.address === "string");
  } catch {
    return [];
  }
};

type NormalizeOptions = {
  platform: TokenPlatform;
  source: TokenSource;
  skipRecord?: (record: JsonRecord) => boolean;
};

const normalizeRecords = (records: JsonRecord[], options: NormalizeOptions): DiscoveredToken[] => {
  const now = Date.now();
  const normalized: DiscoveredToken[] = [];

  for (const record of records) {
    if (options.skipRecord?.(record)) continue;
    const core = extractTokenCore(record);
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
