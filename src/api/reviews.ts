import type { Review, ReviewListItem } from "@/types/review";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const getConfig = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  const base = SUPABASE_URL.endsWith("/") ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
  return {
    restUrl: `${base}/rest/v1`,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  };
};

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = (data && (data.error || data.message)) || response.statusText;
    throw new Error(typeof message === "string" ? message : "Failed to fetch reviews");
  }
  return data as T;
}

export async function fetchReviews(): Promise<ReviewListItem[]> {
  const { restUrl, headers } = getConfig();
  const url = `${restUrl}/reviews?select=id,created_at,title,paper_id&order=created_at.desc`;
  const res = await fetch(url, { headers });
  const data = await safeJson<ReviewListItem[]>(res);
  return data ?? [];
}

export async function fetchReviewById(id: string): Promise<Review> {
  const { restUrl, headers } = getConfig();
  const safeId = encodeURIComponent(id);
  const url = `${restUrl}/reviews?select=*&id=eq.${safeId}&limit=1`;
  const res = await fetch(url, { headers });
  const data = await safeJson<Review[]>(res);
  const review = data?.[0];
  if (!review) {
    throw new Error("Review not found");
  }
  return review;
}
