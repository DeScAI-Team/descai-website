import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchReviewById } from "@/api/reviews";
import Navbar from "@/components/Navbar";
import type { Review, ReviewSection } from "@/types/review";

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const toPercent = (value?: number | null) =>
  typeof value === "number" && !Number.isNaN(value) ? Math.round(value * 100) : null;

const averageScore = (review: Review | null) => {
  if (!review) return null;
  const scores = [
    review.originality_score,
    review.clarity_score,
    review.rigor_score,
    review.reproducibility_score,
    review.data_transparency_score,
    review.interpretation_congruence_score,
    review.field_familiarity_score
  ].filter((s): s is number => typeof s === "number");

  if (!scores.length) return null;
  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return Math.round(avg * 100);
};

const SectionBlock = ({ title, icon, content }: { title: string; icon: string; content?: ReviewSection | null }) => {
  if (!content) return null;

  const entries: Array<{ label: string; value?: string | boolean }> = [
    { label: "Rationale", value: content.rationale as string },
    { label: "Review Statement", value: content.review_statement as string },
    { label: "Replication Caveats", value: content.replication_caveats as string },
    { label: "Discipline Caveats", value: content.discipline_caveats as string },
    { label: "Conflict of Interest", value: content.conflict_of_interest as boolean | undefined }
  ];

  const hasContent = entries.some(({ value }) => value !== undefined && value !== null && value !== "");
  if (!hasContent) return null;

  const renderValue = (value: string | boolean | undefined) => {
    if (typeof value === "boolean") {
      return value ? "Conflicts noted" : "No conflicts noted";
    }
    return value;
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d0f26] px-6 py-5 shadow-inner shadow-white/5">
      <header className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </header>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/80">
        {entries.map(({ label, value }) => {
          if (value === undefined || value === null || value === "") return null;
          return (
            <div key={label}>
              <p className="text-xs uppercase tracking-[0.35em] text-white/55">{label}</p>
              <p className="mt-1 text-base text-white/90">{renderValue(value)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const ScoreChip = ({ label, score, color }: { label: string; score: number | null; color: string }) => {
  const angle = (score ?? 0) * 3.6;
  const display = score !== null ? score : "—";

  return (
    <div className="flex flex-col items-center gap-3 text-xs uppercase tracking-wide">
      <span className="text-center text-white/70">{label}</span>
      <div
        className="relative h-24 w-24 rounded-full"
        style={{
          background:
            `radial-gradient(circle at center, #0c0d23 63%, transparent 64%), ` +
            `conic-gradient(${color} ${angle}deg, rgba(255,255,255,0.12) 0)`
        }}
      >
        <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-[#050410] text-lg font-semibold text-white">
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
        const fetched = await fetchReviewById(id);
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

  const scoreCards = useMemo(
    () => [
      { label: "Originality", value: toPercent(review?.originality_score), color: "#ff4444" },
      { label: "Clarity", value: toPercent(review?.clarity_score), color: "#3b8cff" },
      { label: "Rigor", value: toPercent(review?.rigor_score ?? review?.reproducibility_score), color: "#52ff92" },
      { label: "Data Transparency", value: toPercent(review?.data_transparency_score), color: "#b546ff" },
      { label: "Accuracy", value: toPercent(review?.interpretation_congruence_score), color: "#ff6b2d" },
      { label: "Field Familiarity", value: toPercent(review?.field_familiarity_score), color: "#f7e16a" }
    ],
    [review]
  );

  const narrative =
    review?.originality_review?.review_statement ||
    review?.originality_review?.rationale ||
    review?.clarity_review?.review_statement ||
    review?.clarity_review?.rationale ||
    review?.rigor_reproducibility_review?.review_statement ||
    review?.data_transparency_review?.review_statement ||
    review?.interpretation_ethics_review?.review_statement;

  const renderBody = () => {
    const wrap = (content: React.ReactNode) => (
      <section className="rounded-[36px] bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[5px] shadow-[0_0_45px_rgba(255,68,255,0.35)]">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#06051eea] px-8 py-10 text-white shadow-[0_25px_60px_rgba(1,0,22,0.75)]">
          <div className="absolute inset-0 -z-10 opacity-50">
            <div className="neon-blur left-1/3 top-6 translate-x-1/2 bg-[#ff6bd5]" />
            <div className="neon-blur left-1/4 top-1/2 bg-[#7b9dff]" />
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
          <div className="ml-auto text-right text-xs uppercase tracking-[0.35em] text-white/60">
            <p>Paper ID</p>
            <p className="text-lg font-semibold text-white">{review.paper_id || "—"}</p>
            <p className="mt-1 text-white/70">Review #{review.id}</p>
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
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0c0d23] px-6 py-5 text-base leading-relaxed text-white/85 shadow-inner shadow-white/5">
            {narrative}
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3">
          {scoreCards.map(({ label, value, color }) => (
            <ScoreChip key={label} label={label} score={value} color={color} />
          ))}
        </div>

        <div className="mt-10 space-y-5">
          <SectionBlock title="Originality Review" icon="💡" content={review.originality_review} />
          <SectionBlock title="Clarity Review" icon="📝" content={review.clarity_review} />
          <SectionBlock
            title="Rigor & Reproducibility Review"
            icon="🔬"
            content={review.rigor_reproducibility_review}
          />
          <SectionBlock title="Data Transparency Review" icon="📊" content={review.data_transparency_review} />
          <SectionBlock title="Interpretation & Ethics Review" icon="⚖️" content={review.interpretation_ethics_review} />
        </div>
      </>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-midnight px-4 py-10 text-white">
      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center gap-10">
        <Navbar />
        <main className="w-full max-w-5xl">{renderBody()}</main>
      </div>
    </div>
  );
};

export default ReviewPage;
