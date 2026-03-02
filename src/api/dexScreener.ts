import type { DiscoveredToken, TokenChain, TokenMarketSnapshot } from "@/types/token";

const DEXSCREENER_BASE_URL = import.meta.env.DEV ? "/api/dexscreener" : "https://api.dexscreener.com";
const BATCH_SIZE = 30;

type DexScreenerPair = {
  chainId?: string;
  priceUsd?: number | string | null;
  fdv?: number | string | null;
  marketCap?: number | string | null;
  pairCreatedAt?: number;
  priceChange?: {
    h24?: number | string | null;
  } | null;
  volume?: {
    h24?: number | string | null;
  } | null;
  liquidity?: {
    usd?: number | string | null;
  } | null;
  baseToken?: {
    address?: string | null;
  } | null;
  quoteToken?: {
    address?: string | null;
  } | null;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeAddress = (address: string) => (address.startsWith("0x") ? address.toLowerCase() : address);

const chainIdFor = (chain: TokenChain): string | null => {
  if (chain === "ethereum") return "ethereum";
  if (chain === "base") return "base";
  if (chain === "solana") return "solana";
  return null;
};

const selectBestPair = (pairs: DexScreenerPair[]): DexScreenerPair | null => {
  if (!pairs.length) return null;
  return [...pairs].sort((left, right) => {
    const liquidityDiff = (toNumber(right.liquidity?.usd) ?? -1) - (toNumber(left.liquidity?.usd) ?? -1);
    if (liquidityDiff !== 0) return liquidityDiff;

    const volumeDiff = (toNumber(right.volume?.h24) ?? -1) - (toNumber(left.volume?.h24) ?? -1);
    if (volumeDiff !== 0) return volumeDiff;

    return (right.pairCreatedAt ?? 0) - (left.pairCreatedAt ?? 0);
  })[0];
};

const fetchBatch = async (chain: string, addresses: string[]): Promise<DexScreenerPair[]> => {
  const path = addresses.map(encodeURIComponent).join(",");
  const response = await fetch(`${DEXSCREENER_BASE_URL}/tokens/v1/${chain}/${path}`);
  if (!response.ok) {
    throw new Error(`DexScreener request failed (${response.status}) for ${chain}`);
  }
  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as DexScreenerPair[]) : [];
};

export async function fetchDexScreenerSnapshots(tokens: DiscoveredToken[]): Promise<Record<string, TokenMarketSnapshot>> {
  const snapshots: Record<string, TokenMarketSnapshot> = {};
  const byChain = new Map<string, DiscoveredToken[]>();

  for (const token of tokens) {
    if (!token.coinKey || !token.address) continue;
    const chainId = chainIdFor(token.chain);
    if (!chainId) continue;

    const existing = byChain.get(chainId) ?? [];
    existing.push(token);
    byChain.set(chainId, existing);
  }

  for (const [chainId, chainTokens] of byChain.entries()) {
    for (const batch of chunk(chainTokens, BATCH_SIZE)) {
      try {
        const pairs = await fetchBatch(
          chainId,
          batch
            .map((token) => token.address)
            .filter((address): address is string => Boolean(address))
        );

        for (const token of batch) {
          if (!token.coinKey || !token.address) continue;
          const targetAddress = normalizeAddress(token.address);
          const matchingPairs = pairs.filter((pair) => {
            const baseAddress = pair.baseToken?.address ? normalizeAddress(pair.baseToken.address) : null;
            const quoteAddress = pair.quoteToken?.address ? normalizeAddress(pair.quoteToken.address) : null;
            return baseAddress === targetAddress || quoteAddress === targetAddress;
          });

          const bestPair = selectBestPair(matchingPairs);
          if (!bestPair) continue;

          snapshots[token.coinKey] = {
            tokenId: token.id,
            coinKey: token.coinKey,
            price: toNumber(bestPair.priceUsd),
            priceChange24h: toNumber(bestPair.priceChange?.h24),
            fdv: toNumber(bestPair.fdv),
            marketCap: toNumber(bestPair.marketCap),
            volume24h: toNumber(bestPair.volume?.h24),
            timestampMs: Date.now()
          };
        }
      } catch (error) {
        console.error("DexScreener batch failed", error);
      }
    }
  }

  return snapshots;
}
