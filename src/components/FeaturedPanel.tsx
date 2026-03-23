import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchReviewById, fetchReviews } from "@/api/reviews";
import type { Review } from "@/types/review";

type RatingRow = { label: string; value: number | null };

const ratingColors: Record<string, string> = {
  Originality: "var(--status-negative, #ef4444)",
  "Data Transparency": "var(--accent-secondary, #a855f7)",
  Accuracy: "var(--status-warning, #f59e0b)",
  Clarity: "var(--status-info, #38bdf8)",
  Rigor: "var(--status-positive, #22c55e)"
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
    <article className="space-y-6 rounded-[14px] border border-border bg-surface-card p-5 animate-pulse">
      <div className="h-8 w-3/4 rounded-lg bg-surface-elevated" />
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="h-3 w-16 rounded bg-surface-elevated" />
            <div className="h-4 w-20 rounded bg-surface-elevated" />
          </div>
        ))}
      </div>
      <div className="h-4 w-24 rounded bg-surface-elevated" />
      <div className="h-16 rounded-2xl bg-surface-elevated" />
      <div className="grid grid-cols-5 gap-4 justify-items-center">
        {[...Array(5)].map((_, idx) => (
          <div key={idx} className="h-20 w-20 rounded-full bg-surface-elevated" />
        ))}
      </div>
    </article>
  );

  return (
    <section className="panel-border shadow-featured">
      <div className="panel-inner relative overflow-hidden px-4 pt-0 pb-4 text-content-primary">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="neon-blur left-1/3 top-6 translate-x-1/2 bg-accent-primary" />
          <div className="neon-blur left-1/4 top-1/2 bg-accent-secondary" />
        </div>

        <div className="mb-1 -mt-3 flex flex-wrap items-center gap-4">
          <h2 className="flex-1 max-w-none whitespace-nowrap text-center">
            <span className="featured-chip inline-flex px-6">Featured Research</span>
          </h2>
          {loading && (
            <span className="ml-auto whitespace-nowrap text-xs uppercase tracking-[0.25em] text-content-subtle">
              Updating...
            </span>
          )}
        </div>

        {error && (
          <p className="error-banner mb-4">
            {error} — showing placeholders until data loads.
          </p>
        )}

        {loading && <SkeletonCard />}

        {!loading && !featuredReview && (
          <article className="space-y-4 rounded-[14px] border border-border bg-surface-card p-5 text-content-muted">
            <h3 className="text-xl font-semibold text-content-primary">No featured review yet</h3>
            <p className="text-content-muted">Add a review in Supabase to populate this section.</p>
          </article>
        )}

        {!loading && featuredReview && (
          <article className="space-y-5 rounded-[14px] border border-border bg-surface-card p-5">
            <header className="space-y-2">
              <h3
                className="text-xl md:text-2xl font-semibold leading-tight tracking-tight text-content-primary"
                style={clamp3}
              >
                {featuredReview.title || "Untitled Review"}
              </h3>
              {featuredReview.paper_id && (
                <p className="text-xs uppercase tracking-[0.18em] text-content-subtle font-mono">
                  Paper ID: {featuredReview.paper_id}
                </p>
              )}
            </header>

            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-[1fr_1fr_1fr_auto] md:gap-4">
              {meta.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-content-subtle text-xs uppercase tracking-wider whitespace-nowrap">{label}</dt>
                  <dd className="font-semibold leading-snug text-content-primary mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>

            <section className="space-y-3 text-sm leading-relaxed text-content-muted">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-xs uppercase tracking-[0.2em] text-content-subtle font-semibold">Overview</h4>
              </div>
              <p className="text-sm leading-relaxed text-content-secondary" style={clamp3}>
                {overviewText || "No summary available yet."}
              </p>
              <Link
                to={`/review/${featuredReview.id}`}
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-accent-link underline-offset-4 transition hover:text-content-primary hover:underline"
              >
                Read the full review
                <span aria-hidden className="text-content-dim">→</span>
              </Link>
            </section>

            <div className="grid grid-cols-5 gap-3 justify-items-center pt-2">
              {ratings.map(({ label, value }, index) => {
                const arcColor = ratingColors[label] ?? "var(--accent-primary)";
                const angle = (value ?? 0) * 3.6;
                const columnPositions = [2, 4, 1, 3, 5];
                return (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-2 text-[0.6rem] uppercase tracking-wide"
                    style={{ gridColumn: `${columnPositions[index]} / span 1` }}
                  >
                    <span className="text-center text-content-subtle font-medium">{label.replace("Data ", "").toUpperCase()}</span>
                    <div
                      className="relative h-[4.5rem] w-[4.5rem] rounded-full"
                      style={{
                        background:
                          `radial-gradient(circle at center, var(--bg-card) 60%, transparent 61%), ` +
                          `conic-gradient(${arcColor} ${angle}deg, var(--border-default) 0)`
                      }}
                    >
                      <div className="absolute inset-[8px] flex flex-col items-center justify-center rounded-full bg-surface-base text-base font-semibold text-content-primary font-mono">
                        {value !== null ? value : "—"}
                        {value !== null && <span className="text-[0.55rem] font-normal text-content-dim">%</span>}
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
