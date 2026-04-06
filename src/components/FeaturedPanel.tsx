import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchReviewFromArweave } from "@/api/reviews";
import type { Review } from "@/types/review";

type RatingRow = { label: string; value: number | null };
type FeaturedPanelProps = {
  featuredTxids: string[];
  sourceLoading?: boolean;
  sourceError?: string | null;
};

const ratingColors = ["#ff4444", "#b546ff", "#ff6b2d", "#3b8cff", "#52ff92"];

const normalizeScore = (value?: number | null) =>
  typeof value === "number" && !Number.isNaN(value) ? Math.round(value <= 1 ? value * 100 : value) : null;

const averageScore = (review?: Review | null) => {
  if (!review) return null;
  if (typeof review.average_score === "number") {
    return normalizeScore(review.average_score);
  }

  const scores = (review.categories ?? [])
    .map((category) => normalizeScore(category.score))
    .filter((score): score is number => typeof score === "number");

  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
};

const getNarrative = (review?: Review | null) =>
  [
    ...(review?.categories ?? []).flatMap((category) => [
      category.section?.review_statement,
      category.section?.rationale,
      category.section?.summary,
      category.section?.text
    ]),
    ...(review?.info ?? []).flatMap((section) => [section.content?.summary, section.content?.text])
  ].find((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);

const countSections = (review?: Review | null) => {
  if (!review) return null;
  return (review.categories?.length ?? 0) + (review.info?.length ?? 0);
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const FeaturedPanel = ({ featuredTxids, sourceLoading = false, sourceError = null }: FeaturedPanelProps) => {
  const [detailedReviews, setDetailedReviews] = useState<Review[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const clamp3: React.CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden"
  };

  useEffect(() => {
    if (!featuredTxids.length) {
      setDetailedReviews([]);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const fetched = await Promise.allSettled(
          featuredTxids.map(async (txid) => {
            const review = await fetchReviewFromArweave(txid);
            return review;
          })
        );

        if (!cancelled) {
          const reviews = fetched
            .filter((result): result is PromiseFulfilledResult<Review> => result.status === "fulfilled")
            .map((result) => result.value);

          if (!reviews.length) {
            throw new Error("Featured research could not be loaded from Arweave");
          }

          setDetailedReviews(reviews);
        }
      } catch (err) {
        if (!cancelled) setDetailError((err as Error).message || "Failed to load featured research");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [featuredTxids]);

  const featuredReview = detailedReviews[0] ?? null;
  const loading = sourceLoading || detailLoading;
  const error = sourceError ?? detailError;

  const ratings: RatingRow[] = useMemo(() => {
    const topCategories = (featuredReview?.categories ?? [])
      .slice(0, 5)
      .map((category) => ({ label: category.label, value: normalizeScore(category.score) }));

    while (topCategories.length < 5) {
      topCategories.push({ label: `Metric ${topCategories.length + 1}`, value: null });
    }

    return topCategories;
  }, [featuredReview]);

  const overviewText = getNarrative(featuredReview);
  const average = averageScore(featuredReview);

  const meta = [
    { label: "Paper", value: featuredReview?.paper_id || "—" },
    { label: "Published", value: formatDate(featuredReview?.created_at) },
    { label: "Average Score", value: average !== null ? `${average}%` : "Pending" },
    { label: "Sections", value: countSections(featuredReview) ?? "—" }
  ];

  const SkeletonCard = () => (
    <article className="space-y-6 rounded-[16px] border border-white/10 bg-[#1a2247] p-5 shadow-inner shadow-white/10 animate-pulse">
      <div className="h-8 w-3/4 rounded-lg bg-white/10" />
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="h-3 w-16 rounded bg-white/10" />
            <div className="h-4 w-20 rounded bg-white/20" />
          </div>
        ))}
      </div>
      <div className="h-4 w-24 rounded bg-white/10" />
      <div className="h-16 rounded-2xl bg-white/10" />
      <div className="grid grid-cols-5 gap-4 justify-items-center">
        {[...Array(5)].map((_, idx) => (
          <div key={idx} className="h-28 w-28 rounded-full bg-white/10" />
        ))}
      </div>
    </article>
  );

  return (
      <section className="rounded-[20px] bg-gradient-to-br from-[#3c537f] via-[#273960] to-[#16213c] p-[4px] shadow-[0_0_30px_rgba(60,83,127,0.24)]">
        <div className="relative overflow-hidden rounded-[16px] border border-white/15 bg-[#141c3d]/95 px-4 pt-0 pb-4 text-white shadow-[0_25px_60px_rgba(1,0,22,0.75)]">
          <div className="absolute inset-0 -z-10 opacity-50">
            <div className="neon-blur left-1/3 top-6 translate-x-1/2 bg-[#2b5176]" />
            <div className="neon-blur left-1/4 top-1/2 bg-[#59b8ff]" />
          </div>

        <div className="mb-1 -mt-4 flex flex-wrap items-center gap-4">
          <h2 className="flex-1 max-w-none whitespace-nowrap text-center font-display text-[3.4rem] md:text-[3.8rem] uppercase tracking-[0.28em] text-white">
            <span className="featured-chip inline-flex px-8">Featured Research</span>
          </h2>
          {loading && (
            <span className="ml-auto whitespace-nowrap text-xs uppercase tracking-[0.3em] text-white/60">
              Updating…
            </span>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
            {error} — showing placeholders until data loads.
          </p>
        )}

        {loading && <SkeletonCard />}

        {!loading && !featuredReview && (
          <article className="space-y-4 rounded-[16px] border border-white/10 bg-[#1a2247] p-5 text-white/80 shadow-inner shadow-white/10">
            <h3 className="text-2xl font-semibold">No featured review yet</h3>
            <p className="text-white/70">No ranked Arweave research was available from the current index.</p>
          </article>
        )}

        {!loading && featuredReview && (
          <article className="space-y-6 rounded-[16px] border border-white/10 bg-[#1a2247] p-5 shadow-inner shadow-white/10">
            <header className="space-y-3">
              <h3
                className="font-display text-2xl md:text-[1.65rem] font-semibold leading-tight tracking-[0.02em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
                style={clamp3}
              >
                {featuredReview.title || "Untitled Review"}
              </h3>
              {featuredReview.paper_id && (
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">Paper ID: {featuredReview.paper_id}</p>
              )}
            </header>

            <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-[1fr_1fr_1fr_auto] md:gap-5">
              {meta.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-white/60 whitespace-nowrap">{label}</dt>
                  <dd className="font-semibold leading-snug">{value}</dd>
                </div>
              ))}
            </dl>

            <section className="space-y-4 text-sm leading-relaxed text-white/80">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-base uppercase tracking-[0.3em] text-white/70">Overview</h4>
              </div>
              <p className="text-base leading-relaxed" style={clamp3}>
                {overviewText || "No summary available yet."}
              </p>
              <Link
                to={`/review/${featuredReview.id}`}
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#9fc3ff] underline-offset-4 transition hover:text-white hover:underline"
              >
                Read the full review
                <span aria-hidden className="text-white/60">→</span>
              </Link>
            </section>

            <div className="grid grid-cols-5 gap-5 justify-items-center">
              {ratings.map(({ label, value }, index) => {
                const arcColor = ratingColors[index % ratingColors.length] ?? "#59b8ff";
                const angle = (value ?? 0) * 3.6;
                const columnPositions = [2, 4, 1, 3, 5];
                return (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-3 text-xs uppercase tracking-wide"
                    style={{ gridColumn: `${columnPositions[index]} / span 1` }}
                  >
                    <span className="text-center text-white/70">{label.toUpperCase()}</span>
                    <div
                      className="relative h-28 w-28 rounded-full"
                      style={{
                        background:
                          `radial-gradient(circle at center, #1a2247 63%, transparent 64%), ` +
                          `conic-gradient(${arcColor} ${angle}deg, rgba(255,255,255,0.12) 0)`
                      }}
                    >
                      <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-[#111936] text-[1.15rem] font-semibold text-white">
                        {value !== null ? value : "—"}
                        {value !== null && <span className="text-[0.65rem] font-normal text-white/60">%</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        )}
      </div>
    </section>
  );
};

export default FeaturedPanel;
