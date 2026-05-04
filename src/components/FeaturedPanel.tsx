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

const formatCompactId = (value?: string | null) => {
  if (!value) return "—";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
};

const isSingleLineCategoryLabel = (label: string) => label.trim().toLowerCase() === "tokenomics governance";

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
        let featuredReview: Review | null = null;

        for (const txid of featuredTxids) {
          try {
            featuredReview = await fetchReviewFromArweave(txid);
            break;
          } catch (error) {
            console.error(`Failed to load featured review ${txid}`, error);
          }
        }

        if (!featuredReview) {
          throw new Error("Featured research could not be loaded from Arweave");
        }

        if (!cancelled) {
          setDetailedReviews([featuredReview]);
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

    return topCategories;
  }, [featuredReview]);

  const hasRatings = ratings.some(({ value }) => value !== null);

  const overviewText = getNarrative(featuredReview);
  const average = averageScore(featuredReview);

  const meta = [
    { label: "Published", value: formatDate(featuredReview?.created_at) },
    { label: "Average Score", value: average !== null ? `${average}%` : "Pending" },
    { label: "Sections", value: countSections(featuredReview) ?? "—" }
  ];

  const SkeletonCard = () => (
    <article className="space-y-6 rounded-[16px] border border-[#263f72] bg-[#1a2247] p-5 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)] animate-pulse">
      <div className="h-8 w-3/4 rounded-lg bg-[#14214a]/72" />
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="h-3 w-16 rounded bg-[#14214a]/72" />
            <div className="h-4 w-20 rounded bg-[#20315e]" />
          </div>
        ))}
      </div>
      <div className="h-4 w-24 rounded bg-[#14214a]/72" />
      <div className="h-16 rounded-2xl bg-[#14214a]/72" />
      <div className="grid grid-cols-5 gap-4 justify-items-center">
        {[...Array(5)].map((_, idx) => (
          <div key={idx} className="h-28 w-28 rounded-full bg-[#14214a]/72" />
        ))}
      </div>
    </article>
  );

  return (
    <section className="rounded-[24px] border border-[#243c68] bg-[linear-gradient(145deg,rgba(30,44,90,0.88),rgba(6,11,27,0.96)_45%,rgba(18,16,59,0.9))] p-[1px] shadow-[0_20px_70px_rgba(1,4,18,0.78),0_0_36px_rgba(87,115,255,0.14)]">
      <div className="relative overflow-hidden rounded-[23px] border border-[#263f72] bg-[#071025]/92 px-4 pb-4 pt-4 text-white shadow-[inset_0_1px_0_rgba(80,126,205,0.12)]">
        <div className="absolute inset-0 -z-10 opacity-50">
          <div className="neon-blur left-1/3 top-6 translate-x-1/2 bg-[#2b5176]" />
          <div className="neon-blur left-1/4 top-1/2 bg-[#59b8ff]" />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <h2 className="flex-1 text-center">
            <span className="featured-chip inline-flex">Featured Research</span>
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
          <article className="space-y-4 rounded-[16px] border border-[#263f72] bg-[#1a2247] p-5 text-white/80 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)]">
            <h3 className="text-2xl font-semibold">No featured review yet</h3>
            <p className="text-white/70">No ranked Arweave research was available from the current index.</p>
          </article>
        )}

        {!loading && featuredReview && (
          <article className="relative overflow-hidden rounded-[20px] border border-[#385083] bg-[linear-gradient(135deg,rgba(28,43,92,0.82),rgba(8,14,38,0.92)_42%,rgba(33,17,88,0.72))] p-5 shadow-[inset_0_0_48px_rgba(121,86,255,0.08),0_16px_46px_rgba(0,0,0,0.45)]">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#7e47ff]/16 blur-[90px]" aria-hidden="true" />

            <div className="relative grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="featured-visual min-h-[190px] overflow-hidden rounded-[18px] border border-[#4867af]/45 shadow-[0_20px_44px_rgba(0,0,0,0.34)]">
                <span className="relative z-10 inline-flex items-center gap-2 rounded-r-full bg-[#6938e8] px-4 py-2 text-xs font-semibold text-[#eef4ff] shadow-[0_8px_24px_rgba(79,52,225,0.36)]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                    <path d="m12 3 2.7 5.7 6.3.8-4.6 4.4 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.5l6.3-.8L12 3Z" />
                  </svg>
                  Featured
                </span>
              </div>

              <div className="min-w-0 space-y-4">
                <header className="space-y-3">
                  <h3
                    className="font-display text-2xl font-semibold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] md:text-[1.65rem]"
                    style={clamp3}
                  >
                    {featuredReview.title || "Untitled Review"}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/48">
                    Reviewed by{" "}
                    <span className="font-semibold normal-case tracking-normal text-[#62a7ff]">
                      {featuredReview.dao_name ?? "Unknown DAO"}
                    </span>
                  </p>
                  {featuredReview.paper_id && (
                    <p className="break-all font-mono text-xs uppercase tracking-[0.14em] text-white/48">
                      TXID: {formatCompactId(featuredReview.paper_id)}
                    </p>
                  )}
                </header>

                <dl className="grid gap-0 overflow-hidden rounded-[16px] border border-[#263d70] bg-[#14214a]/72 text-sm shadow-[inset_0_1px_0_rgba(80,126,205,0.12)] md:grid-cols-3">
                  {meta.map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3 border-b border-[#2f4271] px-3 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#5fa9ff]/40 text-[#65a7ff]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                          <path d="M12 5v8l4 2" />
                          <circle cx="12" cy="12" r="8" />
                        </svg>
                      </span>
                      <div>
                        <dt className="whitespace-nowrap text-sm text-white/56">{label}</dt>
                        <dd className="font-semibold leading-snug">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <section className="relative mt-5 space-y-3 text-sm leading-relaxed text-white/80">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-base font-semibold uppercase tracking-[0.3em] text-[#a26bff]">Overview</h4>
              </div>
              <p className="text-base leading-relaxed text-white/72" style={clamp3}>
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

            {hasRatings ? (
              <div className="relative mt-6 grid grid-cols-2 gap-5 border-t border-[#263d70] pt-6 md:grid-cols-5">
                {ratings.map(({ label, value }, index) => {
                  const arcColor = ratingColors[index % ratingColors.length] ?? "#59b8ff";
                  const angle = (value ?? 0) * 3.6;
                  return (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/58"
                    >
                      <span className={`text-center text-white/70 ${isSingleLineCategoryLabel(label) ? "md:whitespace-nowrap" : ""}`}>
                        {label.toUpperCase()}
                      </span>
                      <div
                        className="relative h-28 w-28 rounded-full shadow-[0_0_22px_rgba(87,136,255,0.1)]"
                        style={{
                          background:
                            `radial-gradient(circle at center, #101936 63%, transparent 64%), ` +
                            `conic-gradient(${arcColor} ${angle}deg, rgba(80,126,205,0.18) 0)`
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
            ) : (
              <div className="rounded-2xl border border-[#263f72] bg-[#111936] px-4 py-3 text-sm text-white/70">
                This review does not include category score breakdowns yet.
              </div>
            )}
          </article>
        )}
      </div>
    </section>
  );
};

export default FeaturedPanel;
