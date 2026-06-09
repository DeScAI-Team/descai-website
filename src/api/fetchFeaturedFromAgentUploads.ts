import { fetchArweaveDocument } from "@/api/arweaveLoader";
import { prefetchStructureImagesFromTags } from "@/api/pubchem";
import { getArweaveGatewayBaseUrl, getOverviewAgentAddress } from "@/api/fetchOverviewSidebarsFromArweave";

type ArweaveTag = { name: string; value: string };

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

type ArweaveDocument = Record<string, unknown>;

export type FeaturedUploadSummary = {
  txid: string;
  composite_score: number | null;
  review_date: string | null;
  published_at: string | null;
};

export type FeaturedIndexResult = {
  featuredTxids: string[];
  summaries: FeaturedUploadSummary[];
};

const FEATURED_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;
const FEATURED_CANDIDATE_LIMIT = 40;
const FEATURED_CACHE_TOP_N = 5;

const FEATURED_REVIEW_TAG_FILTERS = [{ name: "doctype", values: ["review"] }] as const;

const FEATURED_TX_QUERY = `
  query FeaturedTxs($owners: [String!]!, $tags: [TagFilter!]!, $after: String) {
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

let featuredCache: FeaturedIndexResult | null = null;
let featuredIndexPromise: Promise<FeaturedIndexResult> | null = null;

const readNumber = (record: ArweaveDocument, keys: string[]): number | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const readString = (record: ArweaveDocument, keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const publishedTime = (iso: string | null): number =>
  iso && Number.isFinite(new Date(iso).getTime()) ? new Date(iso).getTime() : Number.NEGATIVE_INFINITY;

const compareByCompositeScore = (left: FeaturedUploadSummary, right: FeaturedUploadSummary) => {
  const scoreDelta = (right.composite_score ?? Number.NEGATIVE_INFINITY) - (left.composite_score ?? Number.NEGATIVE_INFINITY);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }
  return publishedTime(right.published_at) - publishedTime(left.published_at);
};

const fetchRecentReviewEdges = async (agentAddress: string, signal?: AbortSignal) => {
  const gatewayBase = getArweaveGatewayBaseUrl();
  const graphqlUrl = `${gatewayBase}/graphql`;
  const cutoffMs = Date.now() - FEATURED_LOOKBACK_MS;
  const recentEdges: GqlEdge[] = [];
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
        query: FEATURED_TX_QUERY,
        variables: {
          owners: [agentAddress],
          tags: FEATURED_REVIEW_TAG_FILTERS,
          after: cursor
        }
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Arweave GraphQL request failed (${response.status})`);
    }

    const payload = (await response.json()) as GqlTransactionsResponse;
    if (payload.errors?.length) {
      const message = payload.errors.map((entry) => entry.message).filter(Boolean).join("; ");
      throw new Error(message || "Arweave GraphQL returned errors");
    }

    const page = payload.data?.transactions;
    const batch = page?.edges ?? [];
    if (!batch.length) {
      break;
    }

    let reachedOlderThanWindow = false;

    for (const edge of batch) {
      const blockTimestampSec = edge.node.block?.timestamp;
      if (typeof blockTimestampSec !== "number" || !Number.isFinite(blockTimestampSec)) {
        continue;
      }

      const publishedMs = blockTimestampSec * 1000;
      if (publishedMs < cutoffMs) {
        reachedOlderThanWindow = true;
        continue;
      }

      recentEdges.push(edge);
    }

    hasNextPage = Boolean(page?.pageInfo?.hasNextPage);
    cursor = batch[batch.length - 1]?.cursor ?? null;

    if (reachedOlderThanWindow || !hasNextPage || !cursor) {
      break;
    }
  }

  return recentEdges.sort((left, right) => {
    const leftTime = left.node.block?.timestamp ?? 0;
    const rightTime = right.node.block?.timestamp ?? 0;
    return rightTime - leftTime;
  });
};

const buildFeaturedSummaries = async (edges: GqlEdge[]): Promise<FeaturedUploadSummary[]> => {
  const candidates = edges.slice(0, FEATURED_CANDIDATE_LIMIT);

  const settled = await Promise.allSettled(
    candidates.map(async (edge) => {
      const document = await fetchArweaveDocument(edge.node.id);
      const blockTimestampSec = edge.node.block?.timestamp;
      const published_at =
        typeof blockTimestampSec === "number" && Number.isFinite(blockTimestampSec)
          ? new Date(blockTimestampSec * 1000).toISOString()
          : null;

      return {
        txid: edge.node.id,
        composite_score: readNumber(document, ["composite_score", "average_score"]),
        review_date: readString(document, ["review_date", "date", "created_at"]),
        published_at
      } satisfies FeaturedUploadSummary;
    })
  );

  return settled
    .filter((result): result is PromiseFulfilledResult<FeaturedUploadSummary> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((summary) => summary.composite_score !== null)
    .sort(compareByCompositeScore);
};

const emptyFeaturedResult = (): FeaturedIndexResult => ({
  featuredTxids: [],
  summaries: []
});

export function getCachedFeaturedTxids(): string[] {
  return featuredCache?.featuredTxids ?? [];
}

/**
 * Ranks the newest agent review uploads from the last two weeks by composite_score.
 * Only the newest 40 candidates are scored. The top five txids are kept in memory for the session.
 */
export async function fetchFeaturedFromAgentUploads(
  forceRefresh = false,
  signal?: AbortSignal
): Promise<FeaturedIndexResult> {
  if (!forceRefresh && featuredCache) {
    return featuredCache;
  }

  if (!forceRefresh && featuredIndexPromise) {
    return featuredIndexPromise;
  }

  featuredIndexPromise = (async () => {
    const agentAddress = getOverviewAgentAddress();
    if (!agentAddress) {
      return emptyFeaturedResult();
    }

    const edges = await fetchRecentReviewEdges(agentAddress, signal);
    if (!edges.length) {
      return emptyFeaturedResult();
    }

    const ranked = await buildFeaturedSummaries(edges);
    const topSummaries = ranked.slice(0, FEATURED_CACHE_TOP_N);
    const topTxids = new Set(topSummaries.map((summary) => summary.txid));
    const topTagEntries = edges
      .filter((edge) => topTxids.has(edge.node.id))
      .map((edge) => ({ txid: edge.node.id, tags: edge.node.tags ?? [] }));

    prefetchStructureImagesFromTags(topTagEntries);

    const result: FeaturedIndexResult = {
      featuredTxids: topSummaries.map((summary) => summary.txid),
      summaries: topSummaries
    };

    featuredCache = result;
    return result;
  })();

  try {
    return await featuredIndexPromise;
  } catch (error) {
    featuredIndexPromise = null;
    throw error;
  } finally {
    featuredIndexPromise = null;
  }
}
