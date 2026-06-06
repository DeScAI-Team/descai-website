import { fetchRankedReviews, fetchReviewFromArweave as fetchArweaveReview } from "@/api/arweaveLoader";
import type { Review, ReviewListItem } from "@/types/review";

const reviewSearchHaystack = (review: ReviewListItem) =>
  [
    review.title,
    review.paper_id,
    review.txid,
    review.dao_name,
    review.platform,
    review.category,
    review.compound
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();

const reviewTitle = (review: ReviewListItem): string =>
  (review.title ?? review.compound ?? review.paper_id ?? review.id).trim();

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
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) return [];

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.trunc(limit), 200) : 8;
  const reviews = await fetchRankedReviews();

  return dedupeReviewsByTitle(reviews.filter((review) => reviewSearchHaystack(review).includes(trimmed)))
    .sort((left, right) => reviewPublishedTime(right) - reviewPublishedTime(left))
    .slice(0, safeLimit);
}
