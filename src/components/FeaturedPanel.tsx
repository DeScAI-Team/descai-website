import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchReviewById, fetchReviews } from "@/api/reviews";
import type { Review } from "@/types/review";

type RatingRow = { label: string; value: number | null };

const ratingColors: Record<string, string> = {
  Originality: "#ff4444",
  "Data Transparency": "#b546ff",
  Accuracy: "#ff6b2d",
  Clarity: "#3b8cff",
  Rigor: "#52ff92"
};

const toPercent = (value?: number | null) =>
  typeof value === "number" && !Number.isNaN(value) ? Math.round(value * 100) : null;

const averageScore = (review?: Review | null) => {
  if (!review) return null;
  const scores = [
    review.originality_score,
    review.clarity_score,
    review.rigor_score,
    review.reproducibility_score,
    review.data_transparency_score,
    review.interpretation_congruence_score,
    review.field_familiarity_score
  ].filter((score): score is number => typeof score === "number");

  if (!scores.length) return null;
  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return Math.round(avg * 100);
};

const getNarrative = (review?: Review | null) =>
  review?.originality_review?.review_statement ||
  review?.originality_review?.rationale ||
  review?.clarity_review?.review_statement ||
  review?.clarity_review?.rationale ||
  review?.rigor_reproducibility_review?.review_statement ||
  review?.data_transparency_review?.review_statement ||
  review?.interpretation_ethics_review?.review_statement;

const countSections = (review?: Review | null) => {
  if (!review) return null;
  return [
    review.originality_review,
    review.clarity_review,
    review.rigor_reproducibility_review,
    review.data_transparency_review,
    review.interpretation_ethics_review
  ].filter(Boolean).length;
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const FeaturedPanel = () => {
  const [detailedReviews, setDetailedReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clamp3: React.CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden"
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchReviews();
        if (cancelled) return;

        const idsToFetch = list.slice(0, 5).map((item) => item.id);
        if (!idsToFetch.length) {
          setDetailedReviews([]);
          return;
        }

        const fetched = await Promise.all(
          idsToFetch.map(async (itemId) => {
            try {
              return await fetchReviewById(itemId);
            } catch (err) {
              console.error("Failed to load review", err);
              return null;
            }
          })
        );

        if (!cancelled) {
          setDetailedReviews(fetched.filter(Boolean) as Review[]);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Failed to load reviews");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredReview = detailedReviews[0] ?? null;

  const ratings: RatingRow[] = useMemo(() => {
    return [
      { label: "Originality", value: toPercent(featuredReview?.originality_score) },
      { label: "Data Transparency", value: toPercent(featuredReview?.data_transparency_score) },
      { label: "Accuracy", value: toPercent(featuredReview?.interpretation_congruence_score) },
      { label: "Clarity", value: toPercent(featuredReview?.clarity_score) },
      { label: "Rigor", value: toPercent(featuredReview?.rigor_score ?? featuredReview?.reproducibility_score) }
    ];
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
    <article className="space-y-6 rounded-[16px] border border-white/5 bg-[#0c0d23] p-5 shadow-inner shadow-white/5 animate-pulse">
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
          <div key={idx} className="h-24 w-24 rounded-full bg-white/10" />
        ))}
      </div>
    </article>
  );

  return (
    <section className="rounded-[20px] bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[4px] shadow-[0_0_45px_rgba(255,68,255,0.35)]">
      <div className="relative overflow-hidden rounded-[16px] border border-white/10 bg-[#060017]/95 px-4 pt-0 pb-4 text-white shadow-[0_25px_60px_rgba(1,0,22,0.75)]">
        <div className="absolute inset-0 -z-10 opacity-50">
          <div className="neon-blur left-1/3 top-6 translate-x-1/2 bg-[#ff6bd5]" />
          <div className="neon-blur left-1/4 top-1/2 bg-[#7b9dff]" />
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
          <article className="space-y-4 rounded-[16px] border border-white/5 bg-[#0c0d23] p-5 text-white/80 shadow-inner shadow-white/5">
            <h3 className="text-2xl font-semibold">No featured review yet</h3>
            <p className="text-white/70">Add a review in Supabase to populate this section.</p>
          </article>
        )}

        {!loading && featuredReview && (
          <article className="space-y-6 rounded-[16px] border border-white/5 bg-[#0c0d23] p-5 shadow-inner shadow-white/5">
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
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#ff9cf5] underline-offset-4 transition hover:text-white hover:underline"
              >
                Read the full review
                <span aria-hidden className="text-white/60">→</span>
              </Link>
            </section>

            <div className="grid grid-cols-5 gap-4 justify-items-center">
              {ratings.map(({ label, value }, index) => {
                const arcColor = ratingColors[label] ?? "#ff6bd5";
                const angle = (value ?? 0) * 3.6;
                const columnPositions = [2, 4, 1, 3, 5];
                return (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-3 text-xs uppercase tracking-wide"
                    style={{ gridColumn: `${columnPositions[index]} / span 1` }}
                  >
                    <span className="text-center text-white/70">{label.replace("Data ", "").toUpperCase()}</span>
                    <div
                      className="relative h-24 w-24 rounded-full"
                      style={{
                        background:
                          `radial-gradient(circle at center, #0c0d23 63%, transparent 64%), ` +
                          `conic-gradient(${arcColor} ${angle}deg, rgba(255,255,255,0.12) 0)`
                      }}
                    >
                      <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-[#050410] text-lg font-semibold text-white">
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
