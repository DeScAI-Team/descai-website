import type { ReviewListItem } from "@/types/review";

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound";
const PUBCHEM_MAX_CONCURRENT = 4;
const PUBCHEM_MAX_TERMS = 10;
const PUBCHEM_NEGATIVE_CACHE_MS = 10 * 60 * 1000;
const LS_CACHE_KEY = "descai:pubchem:v2";
const LS_TXID_CACHE_KEY = "descai:pubchem:txid:v1";

const structureImageCache = new Map<string, string>();
const negativeLookupCache = new Map<string, number>();
const txidStructureCache = new Map<string, string>();
const inflightLookups = new Map<string, Promise<string | null>>();
const preloadedUrls = new Set<string>();

let pubchemActive = 0;
const pubchemWaiters: Array<() => void> = [];

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase().replace(/[.\s_-]/g, "");

const acquirePubChemSlot = async () => {
  if (pubchemActive < PUBCHEM_MAX_CONCURRENT) {
    pubchemActive += 1;
    return;
  }

  await new Promise<void>((resolve) => {
    pubchemWaiters.push(resolve);
  });
  pubchemActive += 1;
};

const releasePubChemSlot = () => {
  pubchemActive -= 1;
  const next = pubchemWaiters.shift();
  if (next) {
    next();
  }
};

const loadPersistedCache = () => {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(LS_CACHE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [compound, url] of Object.entries(parsed)) {
      if (typeof compound === "string" && typeof url === "string" && url.length > 0) {
        structureImageCache.set(compound.trim().toLowerCase(), url);
      }
    }

    const txidRaw = window.localStorage.getItem(LS_TXID_CACHE_KEY);
    if (txidRaw) {
      const txidParsed = JSON.parse(txidRaw) as Record<string, string>;
      for (const [txid, url] of Object.entries(txidParsed)) {
        if (typeof txid === "string" && typeof url === "string" && url.length > 0) {
          txidStructureCache.set(txid, url);
        }
      }
    }
  } catch {
    // Ignore corrupt cache payloads.
  }
};

const persistCompoundUrl = (compoundKey: string, url: string) => {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(LS_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[compoundKey] = url;
    window.localStorage.setItem(LS_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore quota or serialization errors.
  }
};

loadPersistedCache();

export const isPumpScienceReview = (review: ReviewListItem): boolean => {
  if (normalizeToken(review.platform) === "pumpscience") {
    return true;
  }

  return normalizeToken(review.category) === "compounds";
};

const isLikelyAcronym = (term: string): boolean => /^[A-Z0-9]{2,6}$/.test(term.trim());

const isNegativeLookup = (compoundKey: string): boolean => {
  const expiresAt = negativeLookupCache.get(compoundKey);
  if (!expiresAt) {
    return false;
  }

  if (Date.now() >= expiresAt) {
    negativeLookupCache.delete(compoundKey);
    return false;
  }

  return true;
};

const rememberNegativeLookup = (compoundKey: string) => {
  negativeLookupCache.set(compoundKey, Date.now() + PUBCHEM_NEGATIVE_CACHE_MS);
};

const splitCompoundList = (raw: string): string[] => {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return [];

  const candidates: string[] = [];
  const parenMatch = trimmed.match(/\(([^)]+)\)/);
  if (parenMatch?.[1]) {
    candidates.push(parenMatch[1].trim());
  }

  const segments = trimmed
    .split(/[,+/|&]|\band\b/i)
    .map((part) => part.replace(/[()]/g, " ").trim())
    .filter(Boolean);

  for (const segment of segments) {
    candidates.push(segment);
    const words = segment.split(/\s+/).filter((word) => word.length > 2);
    if (words.length > 1) {
      candidates.push(...words);
    }
  }

  return candidates;
};

const prioritizeCompoundTerms = (candidates: string[]): string[] => {
  const seen = new Set<string>();
  const primary: string[] = [];
  const acronyms: string[] = [];

  for (const term of candidates) {
    const cleaned = term.trim();
    const key = cleaned.toLowerCase();
    if (!key || key.length < 3 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    if (isLikelyAcronym(cleaned)) {
      acronyms.push(cleaned);
    } else {
      primary.push(cleaned);
    }
  }

  const byWordCount = (left: string, right: string) =>
    left.split(/\s+/).length - right.split(/\s+/).length || left.length - right.length;

  primary.sort(byWordCount);
  acronyms.sort((left, right) => left.length - right.length);

  return [...primary, ...acronyms].slice(0, PUBCHEM_MAX_TERMS);
};

/** Build ordered PubChem search terms from review metadata. */
export const extractCompoundSearchTerms = (review: ReviewListItem): string[] => {
  const candidates: string[] = [];

  if (review.compound?.trim()) {
    candidates.push(...splitCompoundList(review.compound));
  }

  const title = review.title?.trim() ?? "";
  if (title && title !== review.compound?.trim()) {
    candidates.push(...splitCompoundList(title));
  }

  return prioritizeCompoundTerms(candidates);
};

const buildStructureImageUrl = (cid: number) =>
  `${PUBCHEM_BASE}/cid/${cid}/PNG?record_type=2d&image_size=225x225`;

export const preloadStructureImage = (url: string) => {
  if (!url || preloadedUrls.has(url)) return;
  preloadedUrls.add(url);

  const img = new Image();
  img.decoding = "async";
  img.src = url;
};

export const getCachedStructureUrlForTxid = (txid: string): string | null =>
  txidStructureCache.get(txid) ?? null;

export const getCachedStructureUrlsForTxids = (txids: string[]): Record<string, string> => {
  const urls: Record<string, string> = {};
  for (const txid of txids) {
    const url = txidStructureCache.get(txid);
    if (url) {
      urls[txid] = url;
    }
  }
  return urls;
};

const cacheStructureUrl = (compoundKey: string, url: string) => {
  structureImageCache.set(compoundKey, url);
  persistCompoundUrl(compoundKey, url);
};

const cacheTxidStructureUrl = (txid: string, url: string) => {
  txidStructureCache.set(txid, url);
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(LS_TXID_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[txid] = url;
    window.localStorage.setItem(LS_TXID_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore quota or serialization errors.
  }
};

const rememberTxidStructureUrl = (txid: string, url: string) => {
  cacheTxidStructureUrl(txid, url);
  preloadStructureImage(url);
};

const resolveFirstStructureUrl = async (terms: string[]): Promise<string | null> => {
  for (const term of terms) {
    const key = term.trim().toLowerCase();
    const cached = structureImageCache.get(key);
    if (cached) {
      return cached;
    }
    if (isNegativeLookup(key)) {
      continue;
    }

    const url = await fetchPubChemStructureImageUrl(term);
    if (url) {
      return url;
    }
  }

  return null;
};

const lookupCidByName = async (compoundName: string): Promise<number | null> => {
  await acquirePubChemSlot();
  try {
    const encoded = encodeURIComponent(compoundName.trim());
    const response = await fetch(`${PUBCHEM_BASE}/name/${encoded}/cids/JSON`);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { IdentifierList?: { CID?: number[] } };
    return payload.IdentifierList?.CID?.[0] ?? null;
  } finally {
    releasePubChemSlot();
  }
};

export async function fetchPubChemStructureImageUrl(compoundName: string): Promise<string | null> {
  const key = compoundName.trim().toLowerCase();
  if (!key) return null;

  const cached = structureImageCache.get(key);
  if (cached) {
    return cached;
  }

  if (isNegativeLookup(key)) {
    return null;
  }

  const inflight = inflightLookups.get(key);
  if (inflight) {
    return inflight;
  }

  const lookup = (async () => {
    try {
      const cid = await lookupCidByName(compoundName);
      if (!cid) {
        rememberNegativeLookup(key);
        return null;
      }

      const url = buildStructureImageUrl(cid);
      cacheStructureUrl(key, url);
      preloadStructureImage(url);
      return url;
    } catch {
      return null;
    } finally {
      inflightLookups.delete(key);
    }
  })();

  inflightLookups.set(key, lookup);
  return lookup;
};

/** Resolve a 2D structure image for PumpScience compound reviews. */
export async function resolvePumpScienceStructureImage(review: ReviewListItem): Promise<string | null> {
  const cachedTxid = txidStructureCache.get(review.id);
  if (cachedTxid) {
    preloadStructureImage(cachedTxid);
    return cachedTxid;
  }

  if (!isPumpScienceReview(review)) {
    return null;
  }

  const terms = extractCompoundSearchTerms(review);
  if (!terms.length) {
    return null;
  }

  const url = await resolveFirstStructureUrl(terms);
  if (url) {
    rememberTxidStructureUrl(review.id, url);
  }
  return url;
};

/** Begin downloading any cached structure PNGs for these txids immediately. */
export const warmCachedStructureImages = (txids: string[]) => {
  for (const txid of txids) {
    const url = txidStructureCache.get(txid);
    if (url) {
      preloadStructureImage(url);
    }
  }
};

/** Prefetch structure images for a batch of reviews in parallel. */
export async function prefetchPumpScienceStructureImages(
  reviews: ReviewListItem[]
): Promise<Record<string, string>> {
  const pumpReviews = reviews.filter(isPumpScienceReview);
  if (!pumpReviews.length) {
    return {};
  }

  const urls: Record<string, string> = {};

  for (const review of pumpReviews) {
    const url = await resolvePumpScienceStructureImage(review);
    if (url) {
      urls[review.id] = url;
      preloadStructureImage(url);
    }
  }

  return urls;
};

/** Build a minimal review stub from Arweave GraphQL tags for early structure prefetch. */
export const reviewStubFromTags = (
  txid: string,
  tags: Array<{ name: string; value: string }>
): ReviewListItem => {
  const tagMap = new Map(tags.map((tag) => [tag.name, tag.value ?? ""]));
  const compound = tagMap.get("compounds")?.trim() || null;

  return {
    id: txid,
    txid,
    created_at: tagMap.get("date")?.trim() || new Date(0).toISOString(),
    title: compound,
    paper_id: txid,
    platform: tagMap.get("platform")?.trim() || null,
    category: tagMap.get("category")?.trim() || null,
    compound
  };
};

/** Kick off structure prefetch without waiting for full Arweave review documents. */
export const prefetchStructureImagesFromTags = (
  entries: Array<{ txid: string; tags: Array<{ name: string; value: string }> }>
) => {
  const stubs = entries.map(({ txid, tags }) => reviewStubFromTags(txid, tags));
  void prefetchPumpScienceStructureImages(stubs);
};
