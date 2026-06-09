import { DEFAULT_REVIEW_AUTHOR, type Review, type ReviewCategory, type ReviewInfoSection, type ReviewListItem, type ReviewDocType } from "@/types/review";

type ArweaveIndexTransaction = {
  txid?: string;
  id?: string;
  timestamp?: string | null;
  tags?: Array<{ name: string; value: string }>;
};

type ArweaveTag = { name: string; value: string };

type ArweaveDocument = Record<string, unknown>;

export type RankedReviewSummary = ReviewListItem & {
  txid: string;
  average_score: number | null;
  featured: boolean;
};

type ReviewIndexResult = {
  summaries: RankedReviewSummary[];
  featuredTxids: string[];
  byTxid: Record<string, { name: string; date: string; average_score: number | null; dao_name: string | null }>;
};

const INDEX_API_URL = import.meta.env.VITE_ARWEAVE_INDEX_API_URL ?? "/api/index";
const ARWEAVE_GATEWAY_URL = (import.meta.env.VITE_ARWEAVE_GATEWAY_URL ?? "https://arweave.net").replace(/\/+$/, "");
const FEATURED_REVIEW_DAO = "NootropicsDAO";

let reviewIndexPromise: Promise<ReviewIndexResult> | null = null;
/** Bump when review mapping shape changes so stale browser-session cache is ignored. */
const REVIEW_CACHE_VERSION = 2;
const reviewPromiseCache = new Map<string, Promise<Review>>();

const reviewCacheKey = (txid: string) => `${REVIEW_CACHE_VERSION}:${txid}`;

const readString = (record: ArweaveDocument, keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

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

const humanize = (key: string): string =>
  key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

async function safeJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = (data && (data.error || data.message)) || response.statusText || fallbackMessage;
    throw new Error(typeof message === "string" ? message : fallbackMessage);
  }

  return data as T;
}

const compareByScoreDesc = (left: { average_score: number | null; created_at: string }, right: { average_score: number | null; created_at: string }) => {
  const scoreDelta = (right.average_score ?? Number.NEGATIVE_INFINITY) - (left.average_score ?? Number.NEGATIVE_INFINITY);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
};

const getArweaveDocumentUrl = (txid: string) => `${ARWEAVE_GATEWAY_URL}/${txid}`;

const tagsToMap = (tags: ArweaveTag[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const tag of tags) {
    if (tag?.name) {
      map.set(tag.name, tag.value ?? "");
    }
  }
  return map;
};

const parseSummary = (
  txid: string,
  document: ArweaveDocument,
  fallbackDate?: string | null,
  tags: ArweaveTag[] = []
) => {
  const tagMap = tagsToMap(tags);
  const title =
    readString(document, ["name", "title", "research_name", "research_dao", "dao_name"]) ??
    readString(document, ["compounds"]) ??
    tagMap.get("compounds")?.trim() ??
    tagMap.get("research_name")?.trim() ??
    tagMap.get("name")?.trim() ??
    tagMap.get("DaoName")?.trim() ??
    tagMap.get("dao_name")?.trim() ??
    "Untitled Review";
  const dao_name = readString(document, ["dao_name", "research_dao", "DaoName"]) ?? DEFAULT_REVIEW_AUTHOR;
  const platform = readString(document, ["platform"]) ?? tagMap.get("platform")?.trim() ?? null;
  const category = readString(document, ["category"]) ?? tagMap.get("category")?.trim() ?? null;
  const compound = readString(document, ["compounds"]) ?? tagMap.get("compounds")?.trim() ?? null;
  const date = readString(document, ["date", "review_date", "created_at"]) ?? fallbackDate ?? new Date(0).toISOString();
  const average_score = readNumber(document, ["composite_score", "average_score"]);

  return { txid, title, dao_name, platform, category, compound, date, average_score };
};

const normalizeIndexTransactions = (payload: unknown): ArweaveIndexTransaction[] => {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid index response");
  }

  return payload.filter((item): item is ArweaveIndexTransaction => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const maybeTxid = "txid" in item ? item.txid : "id" in item ? item.id : undefined;
    return typeof maybeTxid === "string" && maybeTxid.length > 0;
  }).map((item) => ({
    ...item,
    txid: item.txid ?? item.id,
    tags: Array.isArray(item.tags) ? item.tags : undefined
  }));
};

export async function fetchIndexTransactions(): Promise<ArweaveIndexTransaction[]> {
  const response = await fetch(INDEX_API_URL);
  return normalizeIndexTransactions(await safeJson<unknown>(response, "Failed to fetch Arweave index"));
}

export async function fetchArweaveDocument(txid: string): Promise<ArweaveDocument> {
  const response = await fetch(getArweaveDocumentUrl(txid));
  return safeJson<ArweaveDocument>(response, `Failed to fetch Arweave document ${txid}`);
}

export async function fetchArweaveTransactionTags(txid: string): Promise<ArweaveTag[]> {
  const query = `query Tx($id: ID!) { transaction(id: $id) { tags { name value } } }`;
  const response = await fetch(`${ARWEAVE_GATEWAY_URL}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables: { id: txid } })
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { data?: { transaction?: { tags?: ArweaveTag[] } } };
  return payload.data?.transaction?.tags ?? [];
}

export async function fetchReviewIndex(forceRefresh = false): Promise<ReviewIndexResult> {
  if (!forceRefresh && reviewIndexPromise) {
    return reviewIndexPromise;
  }

  reviewIndexPromise = (async () => {
    const transactions = await fetchIndexTransactions();

    const documents = await Promise.allSettled(
      transactions.map(async (transaction) => {
        const txid = transaction.txid ?? transaction.id;
        if (!txid) {
          throw new Error("Missing transaction id");
        }

        const document = await fetchArweaveDocument(txid);
        return parseSummary(txid, document, transaction.timestamp ?? null, transaction.tags ?? []);
      })
    );

    const summaries = documents
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<{
          txid: string;
          title: string;
          dao_name: string | null;
          platform: string | null;
          category: string | null;
          compound: string | null;
          date: string;
          average_score: number | null;
        }> => result.status === "fulfilled"
      )
      .map((result) => result.value)
      .sort((left, right) => compareByScoreDesc({ average_score: left.average_score, created_at: left.date }, { average_score: right.average_score, created_at: right.date }));

    if (!summaries.length) {
      throw new Error("No Arweave review documents were available");
    }

    const preferredFeaturedSummaries = summaries.filter(
      (summary) => summary.dao_name?.toLowerCase() === FEATURED_REVIEW_DAO.toLowerCase()
    );
    const featuredTxids = (preferredFeaturedSummaries.length ? preferredFeaturedSummaries : summaries)
      .slice(0, 5)
      .map((item) => item.txid);
    const featuredSet = new Set(featuredTxids);

    return {
      summaries: summaries.map((summary) => ({
        id: summary.txid,
        txid: summary.txid,
        title: summary.title,
        created_at: summary.date,
        paper_id: summary.txid,
        dao_name: summary.dao_name,
        platform: summary.platform,
        category: summary.category,
        compound: summary.compound,
        average_score: summary.average_score,
        featured: featuredSet.has(summary.txid)
      })),
      featuredTxids,
      byTxid: Object.fromEntries(
        summaries.map((summary) => [
          summary.txid,
          { name: summary.title, date: summary.date, average_score: summary.average_score, dao_name: summary.dao_name }
        ])
      )
    };
  })();

  try {
    return await reviewIndexPromise;
  } catch (error) {
    reviewIndexPromise = null;
    throw error;
  }
}

export async function fetchRankedReviews(): Promise<RankedReviewSummary[]> {
  const { summaries } = await fetchReviewIndex();
  return summaries;
}

const buildCategories = (document: ArweaveDocument): ReviewCategory[] => {
  const rawCategories = (document.categories ?? {}) as Record<string, unknown>;

  return Object.entries(rawCategories).map(([key, value]) => {
    const category = (value ?? {}) as Record<string, unknown>;
    const rawScore = readNumber(category, ["score"]);
    const { score: _score, ...rest } = category;
    const section = Object.keys(rest).length > 0 ? rest : null;

    return {
      key,
      label: humanize(key),
      score: rawScore,
      section
    };
  });
};

const buildInfoSections = (document: ArweaveDocument): ReviewInfoSection[] => {
  const reservedKeys = new Set([
    "name",
    "date",
    "average_score",
    "composite_score",
    "dao_name",
    "review_date",
    "created_at",
    "title",
    "research_name",
    "compounds",
    "platform",
    "category",
    "categories",
    "review_statement",
    "research_dao",
    "evidence_audit"
  ]);

  return Object.entries(document)
    .filter(([key]) => !reservedKeys.has(key))
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      const content =
        typeof value === "object" && value !== null && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : { text: String(value) };

      return {
        key,
        label: humanize(key),
        content
      };
    });
};

const TAG_TITLE_KEYS = ["DaoName", "dao_name", "daoName", "Dao", "dao", "Name", "name", "ResearchName", "research_name", "Compounds", "compounds", "Title", "title"];
const TAG_DAO_KEYS = ["DaoName", "dao_name", "daoName", "Dao", "dao"];
const TAG_PLATFORM_KEYS = ["platform", "Platform"];
const TAG_CATEGORY_KEYS = ["category", "Category"];
const TAG_COMPOUND_KEYS = ["compounds", "Compounds", "compound", "Compound", "research_name", "ResearchName"];

const DOC_TYPE_TAG_KEYS = ["doctype", "DocType", "doc_type", "Doc_Type"];

const lookupTag = (tagMap: Map<string, string>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = tagMap.get(key)?.trim();
    if (value) return value;
  }
  const lower = new Map<string, string>();
  for (const [name, value] of tagMap) {
    lower.set(name.toLowerCase(), value);
  }
  for (const key of keys) {
    const value = lower.get(key.toLowerCase())?.trim();
    if (value) return value;
  }
  return null;
};

export const parseDocTypeFromTags = (tags: ArweaveTag[]): ReviewDocType | null => {
  const value = lookupTag(tagsToMap(tags), DOC_TYPE_TAG_KEYS)?.toLowerCase();
  if (value === "overview" || value === "review") {
    return value;
  }
  return null;
};

export const buildProjectMatchKeyFromTags = (tags: ArweaveTag[]): string | null => {
  const tagMap = tagsToMap(tags);
  const platform = (lookupTag(tagMap, TAG_PLATFORM_KEYS) ?? "").trim().toLowerCase();
  const title = lookupTag(tagMap, TAG_TITLE_KEYS)?.trim().toLowerCase();
  if (!title) return null;
  return `${platform}::${title}`;
};

const mapDocumentToReview = (
  txid: string,
  document: ArweaveDocument,
  tags: ArweaveTag[] = []
): Review => {
  const tagMap = tagsToMap(tags);
  return {
    id: txid,
    txid,
    title:
      readString(document, ["name", "title", "research_name", "research_dao"]) ??
      readString(document, ["compounds"]) ??
      readString(document, ["dao_name", "DaoName"]) ??
      lookupTag(tagMap, TAG_TITLE_KEYS) ??
      "Untitled Review",
    created_at:
      readString(document, ["date", "review_date", "created_at"]) ??
      lookupTag(tagMap, ["date", "Date", "published", "published_at"]) ??
      new Date().toISOString(),
    paper_id: txid,
    dao_name:
      readString(document, ["dao_name", "research_dao", "DaoName"]) ??
      lookupTag(tagMap, TAG_DAO_KEYS) ??
      DEFAULT_REVIEW_AUTHOR,
    platform: readString(document, ["platform"]) ?? lookupTag(tagMap, TAG_PLATFORM_KEYS) ?? null,
    category: readString(document, ["category"]) ?? lookupTag(tagMap, TAG_CATEGORY_KEYS) ?? null,
    compound:
      readString(document, ["compounds", "compound", "compound_token", "research_name"]) ??
      lookupTag(tagMap, TAG_COMPOUND_KEYS) ??
      null,
    doctype: parseDocTypeFromTags(tags),
    average_score: readNumber(document, ["average_score", "composite_score"]),
    review_statement: readString(document, ["review_statement"]),
    categories: buildCategories(document),
    info: buildInfoSections(document)
  };
};

export async function fetchReviewFromArweave(txid: string, forceRefresh = false): Promise<Review> {
  const cacheKey = reviewCacheKey(txid);
  if (!forceRefresh) {
    const cached = reviewPromiseCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  } else {
    reviewPromiseCache.delete(cacheKey);
  }

  const promise = (async () => {
    const [document, tags] = await Promise.all([
      fetchArweaveDocument(txid),
      fetchArweaveTransactionTags(txid).catch(() => [] as ArweaveTag[])
    ]);
    return mapDocumentToReview(txid, document, tags);
  })();

  reviewPromiseCache.set(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    reviewPromiseCache.delete(cacheKey);
    throw error;
  }
}
