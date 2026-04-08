import type { Review, ReviewCategory, ReviewInfoSection, ReviewListItem } from "@/types/review";

type ArweaveIndexTransaction = {
  txid?: string;
  id?: string;
  timestamp?: string | null;
};

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
const reviewPromiseCache = new Map<string, Promise<Review>>();

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

const parseSummary = (txid: string, document: ArweaveDocument, fallbackDate?: string | null) => {
  const title = readString(document, ["name", "title"]) ?? readString(document, ["dao_name"]) ?? "Untitled Review";
  const dao_name = readString(document, ["dao_name"]);
  const date = readString(document, ["date", "review_date", "created_at"]) ?? fallbackDate ?? new Date(0).toISOString();
  const average_score = readNumber(document, ["average_score"]);

  return { txid, title, dao_name, date, average_score };
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
  });
};

export async function fetchIndexTransactions(): Promise<ArweaveIndexTransaction[]> {
  const response = await fetch(INDEX_API_URL);
  return normalizeIndexTransactions(await safeJson<unknown>(response, "Failed to fetch Arweave index"));
}

export async function fetchArweaveDocument(txid: string): Promise<ArweaveDocument> {
  const response = await fetch(getArweaveDocumentUrl(txid));
  return safeJson<ArweaveDocument>(response, `Failed to fetch Arweave document ${txid}`);
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
        return parseSummary(txid, document, transaction.timestamp ?? null);
      })
    );

    const summaries = documents
      .filter((result): result is PromiseFulfilledResult<{ txid: string; title: string; dao_name: string | null; date: string; average_score: number | null }> => result.status === "fulfilled")
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
  const reservedKeys = new Set(["name", "date", "average_score", "dao_name", "review_date", "created_at", "title", "categories"]);

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

const mapDocumentToReview = (txid: string, document: ArweaveDocument): Review => ({
  id: txid,
  txid,
  title: readString(document, ["name", "title"]) ?? readString(document, ["dao_name"]) ?? "Untitled Review",
  created_at: readString(document, ["date", "review_date", "created_at"]) ?? new Date().toISOString(),
  paper_id: txid,
  dao_name: readString(document, ["dao_name"]),
  average_score: readNumber(document, ["average_score"]),
  categories: buildCategories(document),
  info: buildInfoSections(document)
});

export async function fetchReviewFromArweave(txid: string, forceRefresh = false): Promise<Review> {
  if (!forceRefresh) {
    const cached = reviewPromiseCache.get(txid);
    if (cached) {
      return cached;
    }
  }

  const promise = (async () => {
    const document = await fetchArweaveDocument(txid);
    return mapDocumentToReview(txid, document);
  })();

  reviewPromiseCache.set(txid, promise);

  try {
    return await promise;
  } catch (error) {
    reviewPromiseCache.delete(txid);
    throw error;
  }
}
