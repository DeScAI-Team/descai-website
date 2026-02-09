import type { DiscoveredToken, TokenChain } from "@/types/token";
import { projectTokens } from "@/data/content";

const toChain = (value: string): TokenChain => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "eth" || normalized === "ethereum") return "ethereum";
  if (normalized === "base") return "base";
  if (normalized === "sol" || normalized === "solana") return "solana";
  return "unknown";
};

export const fallbackDiscoveredTokens = (): DiscoveredToken[] => {
  const timestamp = Date.now();

  return projectTokens.map((token, index) => {
    const rawPrice = Number(token.price.replace(/[^0-9.-]/g, ""));
    const rawChange = Number(token.change.replace(/[^0-9.-]/g, ""));
    const signedChange = token.change.trim().startsWith("-") ? -Math.abs(rawChange) : Math.abs(rawChange);

    return {
      id: `fallback:${index}:${token.ticker}`,
      symbol: token.ticker.startsWith("$") ? token.ticker.toUpperCase() : `$${token.ticker.toUpperCase()}`,
      name: token.name,
      address: null,
      chain: toChain(token.chain),
      coinKey: null,
      platform: "Molecule",
      platforms: ["Molecule"],
      sources: ["molecule"],
      discoveryTimestamp: timestamp,
      marketSeed: {
        price: Number.isFinite(rawPrice) ? rawPrice : null,
        priceChange24h: Number.isFinite(signedChange) ? signedChange : null,
        fdv: null,
        marketCap: null,
        volume24h: null,
        timestampMs: timestamp
      }
    };
  });
};
