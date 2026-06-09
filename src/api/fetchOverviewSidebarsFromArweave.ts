/**
 * Client-side Arweave GraphQL for home sidebars: overview crawls plus compound reviews.
 * Configure agent via VITE_ARWEAVE_OVERVIEW_AGENT_ADDRESS, VITE_ARWEAVE_WALLET_ADDRESS, or ARWEAVE_WALLET_ADDRESS in .env.
 */

type ArweaveTag = { name: string; value: string };
type SidebarTagFilter = { name: string; values: string[] };

type GqlEdge = {
  cursor: string;
  node: {
    id: string;
    tags: ArweaveTag[];
    block: { timestamp: number } | null;
  };
};

type GqlTransactionsResponse = {
  data?: {
    transactions?: {
      pageInfo?: { hasNextPage?: boolean };
      edges?: GqlEdge[];
    };
  };
  errors?: Array<{ message?: string }>;
};

const SIDEBAR_OVERVIEW_TAG_FILTERS: SidebarTagFilter[] = [{ name: "doctype", values: ["overview"] }];

const SIDEBAR_COMPOUND_REVIEW_TAG_FILTERS: SidebarTagFilter[] = [
  { name: "doctype", values: ["review"] },
  { name: "category", values: ["compounds"] }
];

const SIDEBAR_TAG_FILTER_SETS = [SIDEBAR_OVERVIEW_TAG_FILTERS, SIDEBAR_COMPOUND_REVIEW_TAG_FILTERS] as const;

const readClientEnvString = (key: string): string => {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const raw = env[key];
  return typeof raw === "string" ? raw.trim() : "";
};

export const getArweaveGatewayBaseUrl = (): string =>
  (readClientEnvString("VITE_ARWEAVE_GATEWAY_URL") || "https://arweave.net").replace(/\/+$/, "");

export const getOverviewAgentAddress = (): string =>
  readClientEnvString("VITE_ARWEAVE_OVERVIEW_AGENT_ADDRESS") ||
  readClientEnvString("VITE_ARWEAVE_WALLET_ADDRESS") ||
  __SNAPSHOT_ENV_BRIDGE__.arweaveDonation;

export type OverviewArticleRef = {
  txid: string;
  title: string;
  platform: string;
  category: string | null;
  publishedAtIso: string | null;
  articleUrl: string;
};

export type OverviewPlatformGroup = {
  platform: string;
  items: Array<{ name: string; href: string; txid: string; category: string | null }>;
};

const SIDEBAR_TX_QUERY = `
  query SidebarTxs($owners: [String!]!, $tags: [TagFilter!]!, $after: String) {
    transactions(owners: $owners, tags: $tags, first: 100, after: $after) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          tags {
            name
            value
          }
          block {
            timestamp
          }
        }
      }
    }
  }
`;

const tagsToMap = (tags: ArweaveTag[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const tag of tags) {
    if (tag?.name) {
      map.set(tag.name, tag.value ?? "");
    }
  }
  return map;
};

const pickPublishedIso = (blockTimestampSec: number | null | undefined, tagMap: Map<string, string>): string | null => {
  if (typeof blockTimestampSec === "number" && Number.isFinite(blockTimestampSec)) {
    return new Date(blockTimestampSec * 1000).toISOString();
  }

  const fromTags = ["published", "published_at", "date", "created_at"]
    .map((key) => tagMap.get(key)?.trim())
    .find((v) => v && v.length > 0);

  if (!fromTags) return null;

  const parsed = new Date(fromTags);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : fromTags;
};

const buildArticleUrl = (txid: string, _gatewayBase: string, _tagMap: Map<string, string>) => {
  return `/review/${txid}`;
};

const TITLE_TAG_KEYS = [
  "DaoName",
  "dao_name",
  "daoName",
  "dao",
  "Dao",
  "name",
  "Name",
  "research_name",
  "ResearchName",
  "compounds",
  "Compounds",
  "title",
  "Title"
] as const;

const pickTagTitle = (tagMap: Map<string, string>): string | null => {
  for (const key of TITLE_TAG_KEYS) {
    const value = tagMap.get(key)?.trim();
    if (value) return value;
  }
  const lowerMap = new Map<string, string>();
  for (const [name, value] of tagMap) {
    lowerMap.set(name.toLowerCase(), value);
  }
  for (const key of TITLE_TAG_KEYS) {
    const value = lowerMap.get(key.toLowerCase())?.trim();
    if (value) return value;
  }
  return null;
};

const readDocumentString = (document: unknown, keys: string[]): string | null => {
  if (!document || typeof document !== "object") return null;
  const record = document as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const fetchDocumentTitle = async (txid: string, gatewayBase: string, signal?: AbortSignal): Promise<string | null> => {
  try {
    const response = await fetch(`${gatewayBase}/${txid}`, { signal });
    if (!response.ok) return null;
    const document = (await response.json()) as unknown;
    return readDocumentString(document, [
      "dao_name",
      "dao",
      "name",
      "research_name",
      "compounds",
      "title"
    ]);
  } catch {
    return null;
  }
};

const publishedTime = (iso: string | null): number =>
  iso && Number.isFinite(new Date(iso).getTime()) ? new Date(iso).getTime() : Number.NEGATIVE_INFINITY;

/** Keep the newest article when multiple share the same title (case-insensitive). */
const dedupeArticlesByTitle = (articles: OverviewArticleRef[]): OverviewArticleRef[] => {
  const byTitle = new Map<string, OverviewArticleRef>();

  for (const article of articles) {
    const key = article.title.trim().toLowerCase();
    const existing = byTitle.get(key);
    if (!existing || publishedTime(article.publishedAtIso) > publishedTime(existing.publishedAtIso)) {
      byTitle.set(key, article);
    }
  }

  return [...byTitle.values()];
};

const fetchSidebarEdges = async (agentAddress: string, tagFilters: SidebarTagFilter[], signal?: AbortSignal) => {
  const gatewayBase = getArweaveGatewayBaseUrl();
  const graphqlUrl = `${gatewayBase}/graphql`;
  const edges: GqlEdge[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        query: SIDEBAR_TX_QUERY,
        variables: { owners: [agentAddress], tags: tagFilters, after: cursor }
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Arweave GraphQL request failed (${response.status})`);
    }

    const payload = (await response.json()) as GqlTransactionsResponse;
    if (payload.errors?.length) {
      const message = payload.errors.map((e) => e.message).filter(Boolean).join("; ");
      throw new Error(message || "Arweave GraphQL returned errors");
    }

    const page = payload.data?.transactions;
    const batch = page?.edges ?? [];
    edges.push(...batch);

    hasNextPage = Boolean(page?.pageInfo?.hasNextPage);
    cursor = batch.length > 0 ? batch[batch.length - 1].cursor : null;

    if (!hasNextPage || !cursor) {
      break;
    }
  }

  return edges;
};

/**
 * Fetches overview and compound-review transactions for the agent and returns grouped platform links plus a latest-first list.
 */
export async function fetchOverviewSidebarsFromArweave(
  agentAddress: string,
  signal?: AbortSignal
): Promise<{ platformGroups: OverviewPlatformGroup[]; latest: OverviewArticleRef[] }> {
  const trimmed = agentAddress.trim();
  if (!trimmed) {
    return { platformGroups: [], latest: [] };
  }

  const gatewayBase = getArweaveGatewayBaseUrl();
  const edgeBatches = await Promise.all(
    SIDEBAR_TAG_FILTER_SETS.map((tagFilters) => fetchSidebarEdges(trimmed, [...tagFilters], signal))
  );

  const edgesByTxid = new Map<string, GqlEdge>();
  for (const batch of edgeBatches) {
    for (const edge of batch) {
      edgesByTxid.set(edge.node.id, edge);
    }
  }

  const edges = [...edgesByTxid.values()];

  const edgeTagMaps = edges.map((edge) => tagsToMap(edge.node.tags ?? []));

  const documentTitles = await Promise.all(
    edges.map(async (edge, index) => {
      const tagTitle = pickTagTitle(edgeTagMaps[index]);
      if (tagTitle) return null;
      return fetchDocumentTitle(edge.node.id, gatewayBase, signal);
    })
  );

  const articles: OverviewArticleRef[] = edges.map((edge, index) => {
    const tagMap = edgeTagMaps[index];
    const title = pickTagTitle(tagMap) ?? documentTitles[index] ?? `Item ${edge.node.id.slice(0, 6)}…`;
    const platform = tagMap.get("platform")?.trim() || "Other";
    const categoryRaw = tagMap.get("category")?.trim();
    const category = categoryRaw && categoryRaw.length > 0 ? categoryRaw : null;
    const publishedAtIso = pickPublishedIso(edge.node.block?.timestamp ?? null, tagMap);

    return {
      txid: edge.node.id,
      title,
      platform,
      category,
      publishedAtIso,
      articleUrl: buildArticleUrl(edge.node.id, gatewayBase, tagMap)
    };
  });

  const platformBuckets = new Map<string, OverviewArticleRef[]>();

  for (const article of articles) {
    const key = article.platform;
    const list = platformBuckets.get(key) ?? [];
    list.push(article);
    platformBuckets.set(key, list);
  }

  const platformGroups: OverviewPlatformGroup[] = [...platformBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([platform, platformArticles]) => ({
      platform,
      items: dedupeArticlesByTitle(platformArticles)
        .map((article) => ({
          name: article.title,
          href: article.articleUrl,
          txid: article.txid,
          category: article.category
        }))
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
    }));

  const latest = dedupeArticlesByTitle(articles).sort((left, right) => {
    return publishedTime(right.publishedAtIso) - publishedTime(left.publishedAtIso);
  });

  return { platformGroups, latest };
}
