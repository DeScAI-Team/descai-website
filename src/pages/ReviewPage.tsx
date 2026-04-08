import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchReviewFromArweave } from "@/api/reviews";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import type { Review, ReviewSection } from "@/types/review";

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatCompactId = (value?: string | null) => {
  if (!value) return "—";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
};

/** Compute average from the dynamic categories array, or from the average_score */
const averageScore = (review: Review | null): number | null => {
  if (!review) return null;
  if (typeof review.average_score === "number") return review.average_score;
  const cats = review.categories ?? [];
  const scores = cats.map((c) => c.score).filter((s): s is number => typeof s === "number");
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
};

const SCORE_COLORS = [
  "#ff4444", "#3b8cff", "#52ff92", "#b546ff",
  "#ff6b2d", "#f7e16a", "#00e5ff", "#ff79c6",
  "#50fa7b", "#ffb86c"
];

const SECTION_ICONS = ["💡", "📝", "🔬", "📊", "⚖️", "🏛️", "🤝", "🔗", "🧬", "📈"];

/**Convert underscores to spaces for readability*/
const humanizeKey = (key: string): string =>
  key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const isSingleLineCategoryLabel = (label: string) => label.trim().toLowerCase() === "tokenomics governance";

const SectionBlock = ({ title, icon, content }: { title: string; icon: string; content?: ReviewSection | null }) => {
  if (!content) return null;

  // Dynamically collect every non-empty property from the section
  const entries = Object.entries(content)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, value]) => ({ label: humanizeKey(key), value }));

  if (!entries.length) return null;

  const renderValue = (value: unknown) => {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  };

  return (
    <section className="rounded-2xl border border-white/15 bg-[#1a2247] px-6 py-5 shadow-inner shadow-white/10">
      <header className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </header>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/80">
        {entries.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs uppercase tracking-[0.35em] text-white/55">{label}</p>
            <p className="mt-1 text-base text-white/90">{renderValue(value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const ScoreChip = ({ label, score, color }: { label: string; score: number | null; color: string }) => {
  const angle = (score ?? 0) * 3.6;
  const display = score !== null ? score : "—";

  return (
    <div className="flex flex-col items-center gap-3 text-xs uppercase tracking-wide">
      <span className={`text-center text-white/70 ${isSingleLineCategoryLabel(label) ? "whitespace-nowrap" : ""}`}>{label}</span>
      <div
        className="relative h-24 w-24 rounded-full"
        style={{
          background:
            `radial-gradient(circle at center, #1a2247 63%, transparent 64%), ` +
            `conic-gradient(${color} ${angle}deg, rgba(255,255,255,0.12) 0)`
        }}
      >
        <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-[#111936] text-lg font-semibold text-white">
          {display}
          {score !== null && <span className="text-[0.65rem] font-normal text-white/60">%</span>}
        </div>
      </div>
    </div>
  );
};

const ReviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await fetchReviewFromArweave(id);
        if (!cancelled) setReview(fetched);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Failed to load review");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const overallScore = useMemo(() => averageScore(review), [review]);

  /** Build score cards dynamically from existing categories */
  const scoreCards = useMemo(() => {
    const cats = review?.categories ?? [];
    return cats.map((cat, idx) => ({
      label: cat.label,
      value: cat.score,
      color: SCORE_COLORS[idx % SCORE_COLORS.length]
    }));
  }, [review]);

  /** Pick the first available review_statement or rationale as top narrative */
  // "Potentially we could target a specfic category for the narrative? I don't know what we should look for however...
  // ...Or if we should try looking from a different section in Review so I'll keep it similar to the orginal" -Andrew
  const narrative = useMemo(() => {
    for (const cat of review?.categories ?? []) {
      const sec = cat.section;
      if (sec?.review_statement) return sec.review_statement as string;
      if (sec?.rationale) return sec.rationale as string;
    }
    return null;
  }, [review]);

  const renderBody = () => {
    const wrap = (content: React.ReactNode) => (
      <section className="rounded-[36px] bg-gradient-to-br from-[#3c537f] via-[#273960] to-[#16213c] p-[5px] shadow-[0_0_30px_rgba(60,83,127,0.24)]">
        <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[#151d3de8] px-8 py-10 text-white shadow-[0_25px_60px_rgba(1,0,22,0.75)]">
          <div className="absolute inset-0 -z-10 opacity-50">
            <div className="neon-blur left-1/3 top-6 translate-x-1/2 bg-[#2b5176]" />
            <div className="neon-blur left-1/4 top-1/2 bg-[#59b8ff]" />
          </div>
          {content}
        </div>
      </section>
    );

    if (loading) {
      return wrap(
        <div className="animate-pulse space-y-6 text-white/70">
          <div className="flex items-center justify-between">
            <div className="h-10 w-24 rounded-full bg-white/10" />
            <div className="h-14 w-40 rounded-lg bg-white/10" />
          </div>
          <div className="h-8 w-3/4 rounded-lg bg-white/10" />
          <div className="h-4 w-1/3 rounded-lg bg-white/10" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="h-28 rounded-2xl bg-white/10" />
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-5 w-40 rounded bg-white/10" />
            <div className="h-24 rounded-2xl bg-white/10" />
          </div>
        </div>
      );
    }

    if (error) {
      return wrap(
        <div className="text-center text-white">
          <p className="text-lg font-semibold">Failed to load review</p>
          <p className="mt-2 text-white/80">{error}</p>
          <button
            className="mt-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/15"
            onClick={() => navigate("/")}
          >
            ← Back home
          </button>
        </div>
      );
    }

    if (!review) {
      return wrap(
        <div className="text-center text-white/80">
          <p className="text-lg font-semibold">No review found</p>
          <button
            className="mt-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/15"
            onClick={() => navigate("/")}
          >
            ← Back home
          </button>
        </div>
      );
    }

    return wrap(
      <>
        <header className="flex flex-wrap items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/15"
          >
            ← Back
          </button>
          <div className="ml-auto max-w-full text-left text-[10px] uppercase tracking-[0.28em] text-white/60 md:max-w-[24rem] md:text-right">
            <p>Arweave TXID</p>
            <p className="mt-2 text-base font-semibold normal-case tracking-[0.08em] text-white md:text-lg">
              {formatCompactId(review.paper_id)}
            </p>
            <p className="mt-1 break-all text-[9px] normal-case tracking-[0.12em] text-white/45">
              {review.id}
            </p>
          </div>
        </header>

        <h1 className="mt-6 text-3xl font-semibold leading-tight">
          {review.title || "Untitled Research Paper"}
        </h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/60">
          Published {formatDate(review.created_at)}
          {overallScore !== null && <span className="ml-3 text-white/80">Average score: {overallScore}%</span>}
        </p>

        {narrative && (
          <div className="mt-6 rounded-2xl border border-white/15 bg-[#1a2247] px-6 py-5 text-base leading-relaxed text-white/85 shadow-inner shadow-white/10">
            {narrative}
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3">
          {scoreCards.map(({ label, value, color }) => (
            <ScoreChip key={label} label={label} score={value} color={color} />
          ))}
        </div>

        {/*General info sections (key_strengths, areas_for_improvement, ...)*/}
        {(review.info ?? []).length > 0 && (
          <div className="mt-8 space-y-4">
            {(review.info ?? []).map((item) => (
              <SectionBlock
                key={item.key}
                title={item.label}
                icon="📌"
                content={item.content}
              />
            ))}
          </div>
        )}

        {/*Dynamic section blocks for all categories*/}
        <div className="mt-10 space-y-5">
          {(review.categories ?? []).map((cat, idx) => (
            <SectionBlock
              key={cat.key}
              title={cat.label}
              icon={SECTION_ICONS[idx % SECTION_ICONS.length]}
              content={cat.section}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-midnight px-4 py-10 text-white">
      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-10">
        <Navbar />
        <main className="w-full max-w-5xl">{renderBody()}</main>
        <Footer />
      </div>
    </div>
  );
};

export default ReviewPage;
