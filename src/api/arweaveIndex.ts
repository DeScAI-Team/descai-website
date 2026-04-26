import fs from "node:fs";
import path from "node:path";
import express, { type Request, type Response } from "express";
import { queryGQL } from "arweavekit/graphql";

type JsonRecord = Record<string, unknown>;

type ArweaveTransaction = {
  txid: string;
  uploaderAddress: string;
  blockHeight: number | null;
  timestamp: string | null;
  status: "confirmed" | "pending";
};

type ArweaveGraphQlEdge = {
  cursor: string;
  node: {
    id: string;
    owner: {
      address: string;
    };
    block: {
      height: number;
      timestamp: number;
    } | null;
  };
};

type ArweaveGraphQlResponse = {
  data?: {
    transactions?: {
      pageInfo?: {
        hasNextPage?: boolean;
      };
      edges?: ArweaveGraphQlEdge[];
    };
  };
};

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
type CachedJsonResponse = {
  payload: unknown;
  fetchedAt: number;
  expiresAt: number;
};
const runtimeProcess = globalThis as typeof globalThis & {
  process?: {
    cwd?: () => string;
    env?: Record<string, string | undefined>;
  };
};

const loadLocalEnv = () => {
  const env = runtimeProcess.process?.env;
  const cwd = runtimeProcess.process?.cwd?.();
  if (!env || !cwd) return;

  const envPath = path.resolve(cwd, ".env");
  if (!fs.existsSync(envPath)) return;

  const source = fs.readFileSync(envPath, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || env[key] !== undefined) continue;

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;

    env[key] = value;
  }
};

loadLocalEnv();

const app = express();
const PORT = 3001; // Run on port 3001 to avoid conflicts main web app!
const MOLECULE_GRAPHQL_ENDPOINT =
  runtimeProcess.process?.env?.MOLECULE_GRAPHQL_ENDPOINT ?? "https://production.graphql.api.molecule.xyz/graphql";
const MOLECULE_API_KEY = runtimeProcess.process?.env?.MOLECULE_API_KEY;
const PUMP_DISCOVERY_URL = "https://pump.science/api/token-tickers";
const BIODAO_DAOS_URL = "https://app.bio.xyz/api/liquid-daos";
const BIODAO_AGENTS_URL = "https://app.bio.xyz/api/liquid-agents";
const ARWEAVE_EXIT_TOKEN = runtimeProcess.process?.env?.ARWEAVE_EXIT_TOKEN;
const UPSTREAM_CACHE_TTL_MS = 5 * 60 * 1000;
const upstreamCache = new Map<string, CachedJsonResponse>();

const WALLETS = [
  "-tFrKF2NuT5_X1cNOTHJmZw3xhss0K5WnXl3wYxRYLM"
  // "Add_More_Wallet_IDs_Here",
];

// Arweave GraphQL Query
const GQL_QUERY = `
  query getTransactions($owners: [String!], $after: String) {
    transactions(owners: $owners, first: 100, after: $after) {
      pageInfo { hasNextPage }
      edges {
        cursor
        node {
          id
          owner { address }
          block { height timestamp }
        }
      }
    }
  }
`;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");
const getExitRequestToken = (req: Request): string | null => {
  const authHeader = req.header("authorization");
  if (authHeader) {
    const [scheme, ...tokenParts] = authHeader.trim().split(/\s+/);
    if (scheme.toLowerCase() === "bearer") {
      const bearerToken = tokenParts.join(" ").trim();
      if (bearerToken) return bearerToken;
    }
  }

  return null;
};

const MOLECULE_DISCOVERY_QUERY = `
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

const fetchMoleculeRecords = async (): Promise<JsonRecord[]> => {
  if (!MOLECULE_API_KEY) {
    throw new Error("Missing MOLECULE_API_KEY");
  }

  const response = await fetch(MOLECULE_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": MOLECULE_API_KEY
    },
    body: JSON.stringify({ query: MOLECULE_DISCOVERY_QUERY })
  });

  if (!response.ok) {
    throw new Error(`Molecule request failed (${response.status})`);
  }

  const parsed = (await response.json()) as GraphQLResponse<{ ipts?: MoleculeIptRecord[] }>;
  if (parsed.errors?.length) {
    const message = parsed.errors.map((entry) => entry.message).filter(Boolean).join("; ");
    throw new Error(message || "Molecule GraphQL error");
  }

  const ipts = parsed.data?.ipts ?? [];
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
};

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Upstream request failed (${response.status}) for ${url}`);
  }
  return response.json();
};

const readFreshCache = (key: string): CachedJsonResponse | null => {
  const cached = upstreamCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) return null;
  return cached;
};

const writeCache = (key: string, payload: unknown, ttlMs = UPSTREAM_CACHE_TTL_MS): unknown => {
  upstreamCache.set(key, {
    payload,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + ttlMs
  });
  return payload;
};

const getCachedUpstreamJson = async (cacheKey: string, url: string): Promise<unknown> => {
  const fresh = readFreshCache(cacheKey);
  if (fresh) {
    return fresh.payload;
  }

  try {
    const payload = await fetchJson(url);
    return writeCache(cacheKey, payload);
  } catch (error) {
    const stale = upstreamCache.get(cacheKey);
    if (stale) {
      return stale.payload;
    }
    throw error;
  }
};

const getCachedUpstreamJsonOrFallback = async (cacheKey: string, url: string, fallback: unknown): Promise<unknown> => {
  try {
    return await getCachedUpstreamJson(cacheKey, url);
  } catch {
    return fallback;
  }
};

app.get("/api/index", async (_req: Request, res: Response) => {
  try {
    let allTransactions: ArweaveTransaction[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    // Query all WALLETS transcations, loop with cursor based pagnation enabled
    while (hasNextPage) {
      const response = (await queryGQL(GQL_QUERY, {
        gateway: "arweave.net",
        filters: {
          owners: WALLETS,
          after: cursor
        }
      })) as ArweaveGraphQlResponse;

      const data = response.data?.transactions;
      const edges = data?.edges;

      if (!edges || edges.length === 0) break; //Empty list returned in case results not found (or error)

      const formatted = edges.map((edge) => {
        const node = edge.node;
        const block = node.block;
        const isConfirmed = block !== null;

        return {
          txid: node.id,
          uploaderAddress: node.owner.address,
          blockHeight: block?.height ?? null,
          timestamp: block ? new Date(block.timestamp * 1000).toISOString() : null,
          status: isConfirmed ? "confirmed" : "pending"
        } satisfies ArweaveTransaction;
      });

      allTransactions = [...allTransactions, ...formatted];
      hasNextPage = Boolean(data.pageInfo?.hasNextPage);

      if (hasNextPage) {
        cursor = edges[edges.length - 1].cursor; // Access last element to fetch next page
      }
    }

    //Sort: descending timestamp. (Pending transactions go at the top.)
    allTransactions.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : Infinity;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : Infinity;
      return timeB - timeA;
    });

    res.json(allTransactions);
  } catch (error: unknown) {
    console.error(`[ERROR] Arweave Indexer: ${getErrorMessage(error)}`);

    // Return 503 JSON error body if gateway is unreachable
    res.status(503).json({
      error: "Arweave gateway unreachable",
      message: "The service could not connect to the Arweave network." 
    });
  }
});

app.get("/api/molecule/ipts", async (_req: Request, res: Response) => {
  try {
    const records = await fetchMoleculeRecords();
    res.json(records);
  } catch (error: unknown) {
    console.error(`[ERROR] Molecule Proxy: ${getErrorMessage(error)}`);
    const isConfigError = getErrorMessage(error) === "Missing MOLECULE_API_KEY";

    res.status(isConfigError ? 503 : 502).json({
      error: "Molecule discovery unavailable",
      message: isConfigError ? "The API server is missing MOLECULE_API_KEY." : "The API server could not fetch Molecule token data."
    });
  }
});

app.get("/api/pump-science/token-tickers", async (_req: Request, res: Response) => {
  try {
    const payload = await getCachedUpstreamJson("pump-science:token-tickers", PUMP_DISCOVERY_URL);
    res.json(payload);
  } catch (error: unknown) {
    console.error(`[ERROR] Pump.Science Proxy: ${getErrorMessage(error)}`);
    const payload = await getCachedUpstreamJsonOrFallback("pump-science:token-tickers", PUMP_DISCOVERY_URL, []);
    res.setHeader("X-Upstream-Status", "degraded");
    res.json(payload);
  }
});

app.get("/api/bio/liquid-daos", async (_req: Request, res: Response) => {
  try {
    const payload = await getCachedUpstreamJson("bio:liquid-daos", BIODAO_DAOS_URL);
    res.json(payload);
  } catch (error: unknown) {
    console.error(`[ERROR] BioDAO DAO Proxy: ${getErrorMessage(error)}`);
    const payload = await getCachedUpstreamJsonOrFallback("bio:liquid-daos", BIODAO_DAOS_URL, []);
    res.setHeader("X-Upstream-Status", "degraded");
    res.json(payload);
  }
});

app.get("/api/bio/liquid-agents", async (_req: Request, res: Response) => {
  try {
    const payload = await getCachedUpstreamJson("bio:liquid-agents", BIODAO_AGENTS_URL);
    res.json(payload);
  } catch (error: unknown) {
    console.error(`[ERROR] BioDAO Agent Proxy: ${getErrorMessage(error)}`);
    const payload = await getCachedUpstreamJsonOrFallback("bio:liquid-agents", BIODAO_AGENTS_URL, []);
    res.setHeader("X-Upstream-Status", "degraded");
    res.json(payload);
  }
});

const server = app.listen(PORT, () => {
  console.log(`API server listening: http://localhost:${PORT}/api/index`);
});

// Endpoint to cleanly exit the API
app.get("/api/exit", (req: Request, res: Response) => {
  if (!ARWEAVE_EXIT_TOKEN) {
    res.status(503).json({
      error: "Exit endpoint disabled",
      message: "Must set ARWEAVE_EXIT_TOKEN to call /api/exit."
    });
    return;
  }

  const providedToken = getExitRequestToken(req);
  if (!providedToken || providedToken !== ARWEAVE_EXIT_TOKEN) {
    res.status(401).json({
      error: "Unauthorized",
      message: "A valid developer token is required to shut down the server."
    });
    return;
  }

  console.log("Shutting down Arweave Indexer...");
  res.json({ message: "Shutting down server..." });
  server.close(() => {
    console.log("Arweave Indexer stopped.");
  });
});
