import type { Review, ReviewCategory, ReviewInfoSection, ReviewListItem } from "@/types/review";

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

/**Convert underscores to spaces for readability*/
const humanize = (key: string): string =>
  key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const fetchReviewFromArweave = async (txId: string): Promise<Review> => {
  const gatewayUrl = `https://arweave.net/${txId}`;

  const response = await fetch(gatewayUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch from Arweave: ${response.statusText}`);
  }

  const arweaveData = await response.json();

  // Dynamically build categories from the keys that exist
  const rawCategories: Record<string, unknown> = arweaveData.categories ?? {};

  const categories: ReviewCategory[] = Object.entries(rawCategories).map(
    ([key, value]: [string, unknown]) => {
      const category = (value ?? {}) as Record<string, unknown>;
      const rawScore = typeof category.score === "number" ? category.score : null;

      // Build a ReviewSection from every non-score property
      const { score: _score, ...rest } = category;
      const section = Object.keys(rest).length > 0 ? rest : null;

      return {
        key,
        label: humanize(key),
        score: rawScore,
        section
      };
    }
  );

  // Dynamically build info sections from remaining keys
  // Keys are already handled elsewhere and should not appear as info sections
  const RESERVED_KEYS = new Set(["dao_name", "review_date", "average_score", "categories"]);

  const info: ReviewInfoSection[] = Object.entries(arweaveData as Record<string, unknown>)
    .filter(([key]) => !RESERVED_KEYS.has(key))
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      // If the value is a plain string, wrap it so SectionBlock can render it
      const content =
        typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : { text: String(value) };

      return { key, label: humanize(key), content };
    });

  const mappedReview: Review = {
    id: txId,
    title: arweaveData.dao_name || "Untitled Review",
    created_at: arweaveData.review_date || new Date().toISOString(),
    paper_id: "Arweave Upload",
    average_score: typeof arweaveData.average_score === "number" ? arweaveData.average_score : null,
    categories,
    info
  };

  return mappedReview;
};

export async function searchReviews(term: string, limit = 8): Promise<ReviewListItem[]> {
  const { restUrl, headers } = getConfig();
  const trimmed = term.trim();
  if (!trimmed) return [];
  const encoded = encodeURIComponent(trimmed);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.trunc(limit), 200) : 8;
  const url = `${restUrl}/reviews?select=id,created_at,title,paper_id&or=(title.ilike.*${encoded}*,paper_id.ilike.*${encoded}*)&order=created_at.desc&limit=${safeLimit}`;
  const res = await fetch(url, { headers });
  const data = await safeJson<ReviewListItem[]>(res);
  return data ?? [];
}
