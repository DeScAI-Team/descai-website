import {
  GENERIC_DEFAULT_ASSET,
  PLATFORM_DEFAULT_ASSETS,
  REVIEW_VISUAL_LIBRARY,
  type ReviewVisualAsset
} from "@/data/reviewVisualLibrary";
import type { Review, ReviewListItem } from "@/types/review";

export type ReviewVisualMode = "structure" | "cover";

export type ReviewCoverPick = {
  url: string;
  mode: ReviewVisualMode;
};

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
  "review",
  "overview",
  "featured",
  "agent",
  "descai",
  "research",
  "dao"
]);

const normalizePlatformKey = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase().replace(/[.\s_-]/g, "");

const normalizeCategoryKey = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase().replace(/[.\s-]/g, "_");

const normalizeHaystack = (text: string | null | undefined): string =>
  (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text: string | null | undefined): string[] => {
  const haystack = normalizeHaystack(text);
  if (!haystack) {
    return [];
  }

  return haystack
    .split(" ")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
};

const uniqueTokens = (chunks: string[]): string[] => {
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const chunk of chunks) {
    for (const token of tokenize(chunk)) {
      if (!seen.has(token)) {
        seen.add(token);
        tokens.push(token);
      }
    }
  }

  return tokens;
};

const hashTxid = (txid: string): number => {
  let hash = 0;
  for (let index = 0; index < txid.length; index += 1) {
    hash = (hash * 31 + txid.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const extractCategoryRationales = (review: ReviewListItem | Review): string[] => {
  if (!("categories" in review) || !Array.isArray(review.categories)) {
    return [];
  }

  return review.categories
    .map((category) => {
      const rationale = category.section?.rationale;
      return typeof rationale === "string" ? rationale : "";
    })
    .filter(Boolean);
};

const extractReviewTokens = (review: ReviewListItem | Review) => {
  const titleHaystack = normalizeHaystack(review.title);
  const daoHaystack = normalizeHaystack(review.dao_name);
  const compoundHaystack = normalizeHaystack(review.compound);

  const titleDaoTokens = uniqueTokens([review.title, review.dao_name, review.compound]);
  const contextTokens = uniqueTokens([review.platform, review.category]);
  const statementTokens = uniqueTokens(
    "review_statement" in review && typeof review.review_statement === "string"
      ? [review.review_statement.slice(0, 600)]
      : []
  );
  const rationaleTokens = uniqueTokens(extractCategoryRationales(review));

  const categoryLabelTokens =
    "categories" in review && Array.isArray(review.categories)
      ? uniqueTokens(review.categories.map((category) => category.label))
      : [];

  const categoryKeys =
    "categories" in review && Array.isArray(review.categories)
      ? review.categories.map((category) => normalizeCategoryKey(category.key))
      : [];

  const fullHaystack = normalizeHaystack(
    [review.title, review.dao_name, review.compound, review.category, review.platform, review.review_statement]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
  );

  return {
    titleHaystack,
    daoHaystack,
    compoundHaystack,
    fullHaystack,
    titleDaoTokens,
    contextTokens,
    statementTokens,
    rationaleTokens,
    categoryLabelTokens,
    categoryKeys,
    platformKey: normalizePlatformKey(review.platform),
    categoryKey: normalizeCategoryKey(review.category)
  };
};

const keywordInHaystack = (keyword: string, haystack: string): boolean => {
  const normalized = keyword.trim().toLowerCase().replace(/[.\s_-]/g, " ");
  if (!normalized || normalized.length < 3) {
    return false;
  }
  return haystack.includes(normalized);
};

const keywordMatchesToken = (keyword: string, tokens: string[]): boolean => {
  const normalized = keyword.trim().toLowerCase().replace(/[.\s_-]/g, "");
  if (!normalized) {
    return false;
  }

  return tokens.some((token) => token === normalized || token.includes(normalized) || normalized.includes(token));
};

const scoreAsset = (
  asset: ReviewVisualAsset,
  tokens: ReturnType<typeof extractReviewTokens>
): number => {
  let score = 0;

  for (const keyword of asset.keywords) {
    if (keywordInHaystack(keyword, tokens.titleHaystack) || keywordInHaystack(keyword, tokens.daoHaystack)) {
      score += 6;
    } else if (keywordInHaystack(keyword, tokens.compoundHaystack)) {
      score += 5;
    } else if (keywordInHaystack(keyword, tokens.fullHaystack)) {
      score += 4;
    } else if (
      keywordMatchesToken(keyword, tokens.statementTokens) ||
      keywordMatchesToken(keyword, tokens.rationaleTokens) ||
      keywordMatchesToken(keyword, tokens.categoryLabelTokens)
    ) {
      score += 3;
    } else if (keywordMatchesToken(keyword, tokens.contextTokens)) {
      score += 1;
    }
  }

  if (asset.isDefault) {
    if (asset.platforms?.some((platform) => normalizePlatformKey(platform) === tokens.platformKey)) {
      score += 2;
    }
    if (asset.categories?.some((category) => normalizeCategoryKey(category) === tokens.categoryKey)) {
      score += 2;
    }
  }

  if (!asset.isDefault && asset.categoryKeys?.some((key) => tokens.categoryKeys.includes(normalizeCategoryKey(key)))) {
    score += 2;
  }

  return score;
};

const platformDefaultUrl = (platformKey: string): string | null => {
  if (!platformKey) {
    return null;
  }
  return PLATFORM_DEFAULT_ASSETS[platformKey] ?? null;
};

const pickFromCandidates = (candidates: ReviewVisualAsset[], txid: string): ReviewVisualAsset => {
  const index = hashTxid(txid) % candidates.length;
  return candidates[index] ?? candidates[0];
};

/** Synchronous cover pick from bundled library metadata. */
export const pickReviewCoverImage = (review: ReviewListItem | Review): ReviewCoverPick => {
  const txid = review.txid ?? review.id;
  const tokens = extractReviewTokens(review);

  const scored = REVIEW_VISUAL_LIBRARY.map((asset) => ({
    asset,
    score: scoreAsset(asset, tokens)
  }));

  const domainScored = scored
    .filter((entry) => !entry.asset.isDefault && entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (domainScored.length) {
    const bestScore = domainScored[0].score;
    const topCandidates = domainScored.filter((entry) => entry.score === bestScore).map((entry) => entry.asset);
    const picked = pickFromCandidates(topCandidates, txid);
    return { url: picked.src, mode: "cover" };
  }

  const platformFallback = platformDefaultUrl(tokens.platformKey);
  if (platformFallback) {
    return { url: platformFallback, mode: "cover" };
  }

  return { url: GENERIC_DEFAULT_ASSET, mode: "cover" };
};
