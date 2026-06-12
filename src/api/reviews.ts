import { fetchRankedReviews, fetchReviewFromArweave as fetchArweaveReview } from "@/api/arweaveLoader";
import type { Review, ReviewListItem } from "@/types/review";

const normalizeSearchKey = (value: string) =>
  value.trim().toLowerCase().replace(/[.\s_\-()]/g, "");

const reviewSearchHaystack = (review: ReviewListItem) =>
  [
    review.title,
    review.paper_id,
    review.txid,
    review.dao_name,
    review.platform,
    review.category,
    review.compound,
    review.symbol,
    review.ticker,
    ...(review.search_labels ?? [])
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();

const reviewSearchFields = (review: ReviewListItem): string[] =>
  [
    review.title,
    review.compound,
    review.dao_name,
    review.platform,
    review.category,
    review.symbol,
    review.ticker,
    ...(review.search_labels ?? [])
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

const reviewMatchesSearchTerm = (review: ReviewListItem, term: string) => {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) return false;

  const haystack = reviewSearchHaystack(review);

  const termTokens = trimmed.split(/\s+/).filter(Boolean);
  if (termTokens.length >= 2 && termTokens.every((token) => haystack.includes(token))) {
    return true;
  }

  if (haystack.includes(trimmed)) return true;

  const normalizedTerm = normalizeSearchKey(term);
  if (normalizedTerm.length < 2) return false;

  for (const field of reviewSearchFields(review)) {
    const normalizedField = normalizeSearchKey(field);
    if (!normalizedField) continue;
    if (normalizedField === normalizedTerm || normalizedField.includes(normalizedTerm)) {
      return true;
    }
  }

  return false;
};

const reviewTitle = (review: ReviewListItem): string =>
  (review.title ?? review.compound ?? review.ticker ?? review.symbol ?? review.paper_id ?? review.id).trim();

const reviewPublishedTime = (review: ReviewListItem): number => {
  const time = new Date(review.created_at).getTime();
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
};

/** Keep the newest review when multiple share the same title (case-insensitive). */
const dedupeReviewsByTitle = (reviews: ReviewListItem[]): ReviewListItem[] => {
  const byTitle = new Map<string, ReviewListItem>();

  for (const review of reviews) {
    const key = reviewTitle(review).toLowerCase();
    if (!key) continue;

    const existing = byTitle.get(key);
    if (!existing || reviewPublishedTime(review) > reviewPublishedTime(existing)) {
      byTitle.set(key, review);
    }
  }

  return [...byTitle.values()];
};

export async function fetchReviews(): Promise<ReviewListItem[]> {
  return fetchRankedReviews();
}

export async function fetchReviewById(id: string): Promise<Review> {
  return fetchArweaveReview(id);
}

export async function fetchReviewFromArweave(txId: string): Promise<Review> {
  return fetchArweaveReview(txId);
}

export async function searchReviews(term: string, limit = 8): Promise<ReviewListItem[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.trunc(limit), 200) : 8;
  const reviews = await fetchRankedReviews();

  return dedupeReviewsByTitle(reviews.filter((review) => reviewMatchesSearchTerm(review, trimmed)))
    .sort((left, right) => reviewPublishedTime(right) - reviewPublishedTime(left))
    .slice(0, safeLimit);
}
