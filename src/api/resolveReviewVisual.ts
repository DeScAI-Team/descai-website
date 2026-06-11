import { pickReviewCoverImage, type ReviewCoverPick, type ReviewVisualMode } from "@/api/reviewVisualMatcher";
import {
  getCachedStructureUrlForTxid,
  isPumpScienceReview,
  prefetchStructureImagesFromTags,
  resolvePumpScienceStructureImage,
  reviewStubFromTags
} from "@/api/pubchem";
import type { Review, ReviewListItem } from "@/types/review";

export type ReviewVisualResult = {
  url: string | null;
  mode: ReviewVisualMode;
};

const LS_TXID_CACHE_KEY = "descai:review-visual:txid:v2";

type CachedVisual = {
  url: string;
  mode: ReviewVisualMode;
};

const txidVisualCache = new Map<string, CachedVisual>();

const loadPersistedCache = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(LS_TXID_CACHE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Record<string, CachedVisual>;
    for (const [txid, entry] of Object.entries(parsed)) {
      if (typeof entry?.url === "string" && entry.url.length > 0) {
        txidVisualCache.set(txid, {
          url: entry.url,
          mode: entry.mode === "structure" ? "structure" : "cover"
        });
      }
    }
  } catch {
    // Ignore corrupt cache payloads.
  }
};

const persistTxidVisual = (txid: string, entry: CachedVisual) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(LS_TXID_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, CachedVisual>) : {};
    parsed[txid] = entry;
    window.localStorage.setItem(LS_TXID_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore quota or serialization errors.
  }
};

const rememberVisual = (txid: string, result: ReviewVisualResult) => {
  if (!result.url) {
    return;
  }

  const entry: CachedVisual = { url: result.url, mode: result.mode };
  txidVisualCache.set(txid, entry);
  persistTxidVisual(txid, entry);
};

loadPersistedCache();

export const getCachedReviewVisualForTxid = (txid: string): ReviewVisualResult | null => {
  const cached = txidVisualCache.get(txid);
  if (cached) {
    return { url: cached.url, mode: cached.mode };
  }

  const legacyStructureUrl = getCachedStructureUrlForTxid(txid);
  if (legacyStructureUrl) {
    const migrated: ReviewVisualResult = { url: legacyStructureUrl, mode: "structure" };
    rememberVisual(txid, migrated);
    return migrated;
  }

  return null;
};

export const getCachedReviewVisualsForTxids = (txids: string[]): Record<string, ReviewVisualResult> => {
  const visuals: Record<string, ReviewVisualResult> = {};
  for (const txid of txids) {
    const cached = getCachedReviewVisualForTxid(txid);
    if (cached) {
      visuals[txid] = cached;
    }
  }
  return visuals;
};

/** Sync cover pick for tag stubs before full review documents load. */
export const pickReviewVisualFromStub = (review: ReviewListItem): ReviewVisualResult => {
  if (isPumpScienceReview(review)) {
    return { url: null, mode: "structure" };
  }

  const cover = pickReviewCoverImage(review);
  return { url: cover.url, mode: cover.mode };
};

export async function resolveReviewVisual(review: ReviewListItem | Review): Promise<ReviewVisualResult> {
  const txid = review.txid ?? review.id;
  const cached = getCachedReviewVisualForTxid(txid);
  if (cached) {
    return cached;
  }

  if (isPumpScienceReview(review)) {
    const structureUrl = await resolvePumpScienceStructureImage(review);
    const result: ReviewVisualResult = {
      url: structureUrl,
      mode: "structure"
    };
    rememberVisual(txid, result);
    return result;
  }

  const cover: ReviewCoverPick = pickReviewCoverImage(review);
  const result: ReviewVisualResult = {
    url: cover.url,
    mode: cover.mode
  };
  rememberVisual(txid, result);
  return result;
}

/** Precompute sync cover picks and warm any cached structure URLs. */
export const prefetchReviewVisualsFromStubs = (stubs: ReviewListItem[]): Record<string, ReviewVisualResult> => {
  const visuals: Record<string, ReviewVisualResult> = {};

  for (const stub of stubs) {
    const txid = stub.txid ?? stub.id;
    const cached = getCachedReviewVisualForTxid(txid);
    if (cached) {
      visuals[txid] = cached;
      continue;
    }

    const picked = pickReviewVisualFromStub(stub);
    if (picked.url) {
      rememberVisual(txid, picked);
      visuals[txid] = picked;
    }
  }

  return visuals;
};

/** Early featured prefetch: sync cover picks plus async PubChem for compound stubs. */
export const prefetchReviewVisualsFromTagEntries = (
  entries: Array<{ txid: string; tags: Array<{ name: string; value: string }> }>
) => {
  const stubs = entries.map(({ txid, tags }) => reviewStubFromTags(txid, tags));
  prefetchReviewVisualsFromStubs(stubs);
  prefetchStructureImagesFromTags(entries);
};
