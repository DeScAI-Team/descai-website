import { fetchRankedReviews, fetchReviewFromArweave as fetchArweaveReview } from "@/api/arweaveLoader";
import type { Review, ReviewListItem } from "@/types/review";

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

  return reviews
    .filter((review) =>
      [review.title ?? "", review.paper_id ?? "", review.txid]
        .join(" ")
        .toLowerCase()
        .includes(trimmed)
    )
    .slice(0, safeLimit);
}
