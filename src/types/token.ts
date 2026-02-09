export type TokenChain = "ethereum" | "base" | "solana" | "unknown";

export type TokenPlatform = "Molecule" | "Pump.Science" | "BioDAO";

export type TokenSource = "molecule" | "pump_science" | "bio_dao_dao" | "bio_dao_agent";

export type SortDirection = "asc" | "desc";

export type TokenSortField =
  | "fdv"
  | "marketCap"
  | "price"
  | "priceChange24h"
  | "symbol"
  | "name"
  | "chain"
  | "platform";

export type DiscoveredToken = {
  id: string;
  symbol: string;
  name: string;
  address: string | null;
  chain: TokenChain;
  coinKey: string | null;
  platform: TokenPlatform;
  platforms: TokenPlatform[];
  sources: TokenSource[];
  discoveryTimestamp: number;
  marketSeed?: {
    price?: number | null;
    priceChange24h?: number | null;
    fdv?: number | null;
    marketCap?: number | null;
    volume24h?: number | null;
    timestampMs?: number;
  };
};

export type TokenMarketSnapshot = {
  tokenId: string;
  coinKey: string;
  price: number | null;
  priceChange24h: number | null;
  fdv: number | null;
  marketCap: number | null;
  volume24h: number | null;
  timestampMs: number;
};

export type TokenWithMarketData = DiscoveredToken & {
  market?: TokenMarketSnapshot;
};
