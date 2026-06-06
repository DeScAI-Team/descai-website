import type { DiscoveredToken, TokenMarketSnapshot } from "@/types/token";

const DEFILLAMA_BASE_URL = (import.meta.env.VITE_DEFILLAMA_BASE_URL as string | undefined) ?? "https://coins.llama.fi";
const MAX_CALLS_PER_MINUTE = 90;
const BATCH_SIZE = 35;
const WINDOW_MS = 60_000;

let requestTimestamps: number[] = [];

type DefiLlamaCoinPayload = {
  price?: number;
  symbol?: string;
  decimals?: number;
  confidence?: number;
  priceChange24h?: number;
  fdv?: number;
  marketCap?: number;
  mcap?: number;
  volume24h?: number;
  timestamp?: number;
};

type DefiLlamaResponse = {
  coins?: Record<string, DefiLlamaCoinPayload>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const enforceRateLimit = async () => {
  while (true) {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
    if (requestTimestamps.length < MAX_CALLS_PER_MINUTE) {
      requestTimestamps.push(now);
      return;
    }
    const waitMs = WINDOW_MS - (now - requestTimestamps[0]) + 20;
    await sleep(Math.max(20, waitMs));
  }
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

const normalizePayload = (coinKey: string, tokenId: string, payload: DefiLlamaCoinPayload): TokenMarketSnapshot => {
  const timestampMs = Date.now();

  return {
    tokenId,
    coinKey,
    price: toNumber(payload.price),
    priceChange24h: toNumber(payload.priceChange24h),
    fdv: toNumber(payload.fdv),
    marketCap: toNumber(payload.marketCap) ?? toNumber(payload.mcap),
    volume24h: toNumber(payload.volume24h),
    timestampMs
  };
};

const fetchBatch = async (coinKeys: string[]): Promise<Record<string, DefiLlamaCoinPayload>> => {
  await enforceRateLimit();
  const keyPath = coinKeys.map((key) => encodeURIComponent(key)).join(",");
  const url = `${DEFILLAMA_BASE_URL}/prices/current/${keyPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DefiLlama request failed (${response.status})`);
  }
  const data = (await response.json()) as DefiLlamaResponse;
  return data.coins ?? {};
};

const fetchHistoricalBatch = async (
  coinKeys: string[],
  timestampSec: number
): Promise<Record<string, DefiLlamaCoinPayload>> => {
  await enforceRateLimit();
  const keyPath = coinKeys.map((key) => encodeURIComponent(key)).join(",");
  const url = `${DEFILLAMA_BASE_URL}/prices/historical/${timestampSec}/${keyPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DefiLlama historical request failed (${response.status})`);
  }
  const data = (await response.json()) as DefiLlamaResponse;
  return data.coins ?? {};
};

export async function fetchTokenSnapshots(tokens: DiscoveredToken[]): Promise<Record<string, TokenMarketSnapshot>> {
  const snapshots: Record<string, TokenMarketSnapshot> = {};
  const byCoinKey = new Map<string, DiscoveredToken>();
  for (const token of tokens) {
    if (!token.coinKey) continue;
    byCoinKey.set(token.coinKey, token);
  }
  const keys = Array.from(byCoinKey.keys());
  if (!keys.length) return snapshots;

  const historicalTimestampSec = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

  for (const batch of chunk(keys, BATCH_SIZE)) {
    try {
      const [currentPayload, historicalPayload] = await Promise.all([
        fetchBatch(batch),
        fetchHistoricalBatch(batch, historicalTimestampSec).catch(
          (): Record<string, DefiLlamaCoinPayload> => ({})
        )
      ]);
      for (const [coinKey, coinPayload] of Object.entries(currentPayload)) {
        const token = byCoinKey.get(coinKey);
        if (!token) continue;
        const snapshot = normalizePayload(coinKey, token.id, coinPayload);
        const historicalPrice = toNumber(historicalPayload[coinKey]?.price);
        const currentPrice = snapshot.price;
        if ((snapshot.priceChange24h === null || snapshot.priceChange24h === undefined) && currentPrice && historicalPrice) {
          snapshot.priceChange24h = ((currentPrice - historicalPrice) / historicalPrice) * 100;
        }
        if ((snapshot.fdv === null || snapshot.fdv === undefined) && snapshot.marketCap !== null) {
          snapshot.fdv = snapshot.marketCap;
        }
        const hasQuote =
          (snapshot.price ?? 0) > 0 || (snapshot.fdv ?? 0) > 0 || (snapshot.marketCap ?? 0) > 0;
        if (hasQuote) {
          snapshots[coinKey] = snapshot;
        }
      }
    } catch (error) {
      console.error("DefiLlama batch failed", error);
    }
  }

  return snapshots;
}
