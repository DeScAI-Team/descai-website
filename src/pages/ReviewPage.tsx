import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getCachedStructureUrlForTxid, isPumpScienceReview, resolvePumpScienceStructureImage } from "@/api/pubchem";
import { resolvePairedDocumentTxids, type PairedDocumentTxids } from "@/api/reviewDocumentPairs";
import { fetchReviewFromArweave } from "@/api/reviews";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ReviewVisual from "@/components/ReviewVisual";
import { DEFAULT_REVIEW_AUTHOR, type Review, type ReviewDocType } from "@/types/review";
import { fetchComments, publishComment, WANDER_COMMENT_CONNECT_MESSAGE } from "@/api/comments";
import type { ArweaveComment } from "@/api/comments";
import { useWallet } from "@/context/WalletContext";

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

const normalizeScore = (value?: number | null) =>
  typeof value === "number" && !Number.isNaN(value) ? Math.round(value <= 1 ? value * 100 : value) : null;

const averageScore = (review: Review | null): number | null => {
  if (!review) return null;
  const fromAverage = normalizeScore(review.average_score);
  if (fromAverage !== null) return fromAverage;
  const scores = (review.categories ?? [])
    .map((c) => normalizeScore(c.score))
    .filter((s): s is number => typeof s === "number");
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
};

const SCORE_COLORS = ["#ff4444", "#b546ff", "#ff6b2d", "#3b8cff", "#52ff92", "#f7e16a", "#00e5ff", "#ff79c6"];

const isTokenomicsCategory = (title: string, categoryKey?: string) => {
  const haystack = `${categoryKey ?? ""} ${title}`.toLowerCase();
  return haystack.includes("token");
};

const TokenSymbolIcon = () => (
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8.5v7" />
    <path d="M9.5 10.5h3.75a1.75 1.75 0 0 1 0 3.5H9.5" />
  </>
);

const SectionHeaderIcon = ({
  index,
  title,
  categoryKey
}: {
  index: number;
  title?: string;
  categoryKey?: string;
}) => {
  const useTokenSymbol = isTokenomicsCategory(title ?? "", categoryKey);
  const variant = index % 8;

  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#5fa9ff]/40 bg-[#0d1838]/80 text-[#65a7ff] shadow-[0_0_18px_rgba(87,136,255,0.12)]">
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-none stroke-current stroke-2"
        aria-hidden="true"
      >
        {useTokenSymbol ? (
          <TokenSymbolIcon />
        ) : (
          <>
            {variant === 0 && <path d="m12 3 2.7 5.7 6.3.8-4.6 4.4 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.5l6.3-.8L12 3Z" />}
            {variant === 1 && (
              <>
                <path d="M12 3v18" />
                <path d="M8 21h8" />
                <path d="M7 7h10" />
                <path d="M9 7 7 13h10l-2-6" />
              </>
            )}
            {variant === 2 && (
              <>
                <path d="M10 2h4" />
                <path d="M12 2v5" />
                <path d="M8 7h8l-2 11H10L8 7Z" />
              </>
            )}
            {variant === 3 && (
              <>
                <path d="M4 20V10" />
                <path d="M12 20V4" />
                <path d="M20 20v-6" />
              </>
            )}
            {variant === 4 && <path d="M12 3 4 7v6c0 4 3.5 7 8 8 4.5-1 8-4 8-8V7l-8-4Z" />}
            {variant === 6 && (
              <>
                <path d="M10 13a5 5 0 0 0 7.5 4.3L22 13" />
                <path d="M14 11a5 5 0 0 0-7.5-4.3L2 11" />
              </>
            )}
            {variant === 7 && (
              <>
                <path d="M4 16l4-4 4 3 8-8" />
                <path d="M16 7h4v4" />
              </>
            )}
          </>
        )}
      </svg>
    </span>
  );
};

const formatCommentTime = (timestamp: number) => {
  const date = new Date(timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

const getCommentInitials = (owner?: string) => {
  const cleaned = owner?.replace(/^0x/i, "") ?? "";
  return cleaned.slice(0, 2).toUpperCase() || "DC";
};

const getCommentAuthorLabel = (owner?: string) => (owner ? formatCompactId(owner) : "Unknown wallet");

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type CommentPublishMessage = {
  type: "success" | "error";
  text: string;
};

const isSingleLineCategoryLabel = (label: string) => label.trim().toLowerCase() === "tokenomics governance";

const getReviewStatement = (review: Review | null): string | null => {
  if (!review) return null;
  if (review.review_statement?.trim()) return review.review_statement.trim();
  const fromInfo = review.info?.find((item) => item.key === "review_statement");
  const text = fromInfo?.content?.text ?? fromInfo?.content?.review_statement;
  return typeof text === "string" && text.trim() ? text.trim() : null;
};

type MetaStatIconType = "published" | "score" | "categories";

const MetaStatIcon = ({ type }: { type: MetaStatIconType }) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2" aria-hidden="true">
    {type === "published" && (
      <>
        <path d="M12 5v8l4 2" />
        <circle cx="12" cy="12" r="8" />
      </>
    )}
    {type === "score" && <path d="m12 3 2.7 5.7 6.3.8-4.6 4.4 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.5l6.3-.8L12 3Z" />}
    {type === "categories" && (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    )}
  </svg>
);

const DocTypeToggle = ({
  activeDocType,
  overviewTxid,
  reviewTxid,
  onSelect
}: {
  activeDocType: ReviewDocType | null;
  overviewTxid: string | null;
  reviewTxid: string | null;
  onSelect: (docType: ReviewDocType) => void;
}) => {
  const options: Array<{ docType: ReviewDocType; label: string; txid: string | null }> = [
    { docType: "overview", label: "Overview", txid: overviewTxid },
    { docType: "review", label: "Review", txid: reviewTxid }
  ];

  return (
    <div
      className="inline-flex rounded-full border border-[#263f72] bg-[#0b1229]/90 p-1 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)]"
      role="tablist"
      aria-label="Document type"
    >
      {options.map(({ docType, label, txid }) => {
        const isActive = activeDocType === docType;
        const isDisabled = !txid;

        return (
          <button
            key={docType}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={isDisabled}
            onClick={() => onSelect(docType)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              isActive
                ? "bg-[#1a2d5d] text-white shadow-[0_0_18px_rgba(87,136,255,0.18)]"
                : "text-white/55 hover:text-white/85"
            } disabled:cursor-not-allowed disabled:opacity-35`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

const RationaleSection = ({
  title,
  iconIndex,
  categoryKey,
  rationale
}: {
  title: string;
  iconIndex: number;
  categoryKey?: string;
  rationale?: string | null;
}) => {
  if (!rationale?.trim()) return null;

  return (
    <section className="rounded-[16px] border border-[#263d70] bg-[#14214a]/55 px-5 py-5 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)]">
      <header className="flex items-center gap-3">
        <SectionHeaderIcon index={iconIndex} title={title} categoryKey={categoryKey} />
        <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      </header>
      <p className="mt-4 text-base leading-relaxed text-white/78">{rationale}</p>
    </section>
  );
};

const ScoreChip = ({ label, score, color }: { label: string; score: number; color: string }) => {
  const angle = score * 3.6;

  return (
    <div className="flex flex-col items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/58">
      <span className={`text-center text-white/70 ${isSingleLineCategoryLabel(label) ? "md:whitespace-nowrap" : ""}`}>
        {label.toUpperCase()}
      </span>
      <div
        className="relative h-28 w-28 rounded-full shadow-[0_0_22px_rgba(87,136,255,0.1)]"
        style={{
          background:
            `radial-gradient(circle at center, #101936 63%, transparent 64%), ` +
            `conic-gradient(${color} ${angle}deg, rgba(80,126,205,0.18) 0)`
        }}
      >
        <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-[#111936] text-[1.15rem] font-semibold text-white">
          {score}
          <span className="text-[0.65rem] font-normal text-white/60">%</span>
        </div>
      </div>
    </div>
  );
};

const PanelShell = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-[24px] border border-[#243c68] bg-[linear-gradient(145deg,rgba(30,44,90,0.88),rgba(6,11,27,0.96)_45%,rgba(18,16,59,0.9))] p-[1px] shadow-[0_20px_70px_rgba(1,4,18,0.78),0_0_36px_rgba(87,115,255,0.14)]">
    <div className="relative overflow-hidden rounded-[23px] border border-[#263f72] bg-[#071025]/92 px-4 pb-6 pt-4 text-white shadow-[inset_0_1px_0_rgba(80,126,205,0.12)] md:px-6 md:pb-8 md:pt-5">
      <div className="absolute inset-0 -z-10 opacity-50">
        <div className="neon-blur left-1/3 top-6 translate-x-1/2 bg-[#2b5176]" />
        <div className="neon-blur left-1/4 top-1/2 bg-[#59b8ff]" />
      </div>
      {children}
    </div>
  </section>
);

const ReviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { address, isConnected, walletType } = useWallet();
  const [review, setReview] = useState<Review | null>(null);
  const [structureUrl, setStructureUrl] = useState<string | null>(() =>
    id ? getCachedStructureUrlForTxid(id) : null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [comments, setComments] = useState<ArweaveComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentPublishMessage, setCommentPublishMessage] = useState<CommentPublishMessage | null>(null);
  const [publishingComment, setPublishingComment] = useState(false);
  const [pairedTxids, setPairedTxids] = useState<PairedDocumentTxids>({
    docType: null,
    overviewTxid: null,
    reviewTxid: null
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setPairedTxids({ docType: null, overviewTxid: null, reviewTxid: null });
      setStructureUrl(id ? getCachedStructureUrlForTxid(id) : null);
      try {
        const pairs = await resolvePairedDocumentTxids(id);
        const allowReview = (location.state as { allowReview?: boolean } | null)?.allowReview === true;

        if (
          !cancelled &&
          !allowReview &&
          pairs.overviewTxid &&
          pairs.reviewTxid &&
          id === pairs.reviewTxid
        ) {
          navigate(`/review/${pairs.overviewTxid}`, { replace: true });
          return;
        }

        const fetched = await fetchReviewFromArweave(id);
        if (!cancelled) {
          setReview(fetched);
          setPairedTxids(pairs);
          const cached = getCachedStructureUrlForTxid(id);
          if (cached) {
            setStructureUrl(cached);
            return;
          }
          const url = await resolvePumpScienceStructureImage(fetched);
          if (!cancelled) {
            setStructureUrl(url);
          }
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load review"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, location.state, navigate]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadComments = async () => {
      setComments([]);
      setCommentsLoading(true);
      setCommentError(null);
      try {
        const fetchedComments = await fetchComments(id);
        if (!cancelled) setComments(fetchedComments);
      } catch (err) {
        if (!cancelled) setCommentError(getErrorMessage(err, "Failed to load comments"));
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    };

    loadComments();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const overallScore = useMemo(() => averageScore(review), [review]);
  const reviewStatement = useMemo(() => getReviewStatement(review), [review]);

  const scoreCards = useMemo(() => {
    const cats = review?.categories ?? [];
    return cats
      .filter((cat) => typeof cat.score === "number" && Number.isFinite(cat.score))
      .map((cat, idx) => ({
        label: cat.label,
        value: normalizeScore(cat.score),
        color: SCORE_COLORS[idx % SCORE_COLORS.length]
      }))
      .filter((card): card is { label: string; value: number; color: string } => card.value !== null);
  }, [review]);

  const hasRatings = scoreCards.length > 0;
  const activeDocType = review?.doctype ?? pairedTxids.docType;

  const handleDocTypeSelect = (docType: ReviewDocType) => {
    const targetTxid = docType === "overview" ? pairedTxids.overviewTxid : pairedTxids.reviewTxid;
    if (!targetTxid || targetTxid === id) return;
    navigate(`/review/${targetTxid}`, docType === "review" ? { state: { allowReview: true } } : undefined);
  };

  const handlePublishComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!review || publishingComment) return;

    const body = commentBody.trim();
    if (!body) return;

    if (!isConnected || walletType !== "wander" || !window.arweaveWallet) {
      setCommentPublishMessage({ type: "error", text: WANDER_COMMENT_CONNECT_MESSAGE });
      return;
    }

    const rootTx = review.txid ?? review.id;

    setPublishingComment(true);
    setCommentError(null);
    setCommentPublishMessage(null);

    try {
      await publishComment(rootTx, body, { wallet: window.arweaveWallet, owner: address });
      setCommentBody("");
      setCommentPublishMessage({ type: "success", text: "Success! Comments may take up to an hour to display." });
    } catch (err) {
      setCommentPublishMessage({ type: "error", text: getErrorMessage(err, "Failed to publish comment") });
    } finally {
      setPublishingComment(false);
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <PanelShell>
          <div className="animate-pulse space-y-6 text-white/70">
            <div className="flex items-center justify-between">
              <div className="h-10 w-24 rounded-full bg-[#14214a]/72" />
              <div className="h-14 w-40 rounded-lg bg-[#14214a]/72" />
            </div>
            <div className="h-8 w-3/4 rounded-lg bg-[#14214a]/72" />
            <div className="h-4 w-1/3 rounded-lg bg-[#14214a]/72" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="h-28 rounded-2xl bg-[#14214a]/72" />
              ))}
            </div>
            <div className="space-y-3">
              <div className="h-5 w-40 rounded bg-[#14214a]/72" />
              <div className="h-24 rounded-2xl bg-[#14214a]/72" />
            </div>
          </div>
        </PanelShell>
      );
    }

    if (error) {
      return (
        <PanelShell>
          <div className="text-center text-white">
            <p className="text-lg font-semibold">Failed to load review</p>
            <p className="mt-2 text-white/80">{error}</p>
            <button
              className="mt-4 rounded-full border border-[#263f72] bg-[#14214a]/72 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#74b6ff]/35 hover:bg-[#1a2d5d]"
              onClick={() => navigate("/")}
            >
              ← Back home
            </button>
          </div>
        </PanelShell>
      );
    }

    if (!review) {
      return (
        <PanelShell>
          <div className="text-center text-white/80">
            <p className="text-lg font-semibold">No review found</p>
            <button
              className="mt-4 rounded-full border border-[#263f72] bg-[#14214a]/72 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#74b6ff]/35 hover:bg-[#1a2d5d]"
              onClick={() => navigate("/")}
            >
              ← Back home
            </button>
          </div>
        </PanelShell>
      );
    }

    const meta: Array<{ label: string; value: string; icon: MetaStatIconType }> = [
      { label: "Published", value: formatDate(review.created_at), icon: "published" },
      { label: "Average Score", value: overallScore !== null ? `${overallScore}%` : "Pending", icon: "score" },
      { label: "Categories", value: String(review.categories?.length ?? 0), icon: "categories" }
    ];

    const showDocTypeToggle = Boolean(pairedTxids.overviewTxid || pairedTxids.reviewTxid);

    return (
      <PanelShell>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full border border-[#263f72] bg-[#14214a]/72 px-4 py-2 text-sm font-semibold text-[#9fc3ff] transition hover:border-[#74b6ff]/35 hover:bg-[#1a2d5d] hover:text-white"
          >
            ← Back
          </button>
          <h2 className="flex-1 text-center">
            <span className="featured-chip inline-flex">
              {activeDocType === "overview" ? "Project Overview" : "Research Review"}
            </span>
          </h2>
        </div>

        <article className="relative overflow-hidden rounded-[20px] border border-[#385083] bg-[linear-gradient(135deg,rgba(28,43,92,0.82),rgba(8,14,38,0.92)_42%,rgba(33,17,88,0.72))] p-5 shadow-[inset_0_0_48px_rgba(121,86,255,0.08),0_16px_46px_rgba(0,0,0,0.45)]">
          {showDocTypeToggle && (
            <div className="absolute right-5 top-5 z-10">
              <DocTypeToggle
                activeDocType={activeDocType}
                overviewTxid={pairedTxids.overviewTxid}
                reviewTxid={pairedTxids.reviewTxid}
                onSelect={handleDocTypeSelect}
              />
            </div>
          )}
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#7e47ff]/16 blur-[90px]" aria-hidden="true" />

          <div className="relative grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <ReviewVisual
              structureUrl={structureUrl}
              badge="on-chain"
              expectStructure={isPumpScienceReview(review)}
            />

            <div className="min-w-0 space-y-4">
              <header className={`space-y-3 ${showDocTypeToggle ? "pr-[11.5rem] sm:pr-56" : ""}`}>
                <h1 className="font-display text-2xl font-semibold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] md:text-[1.65rem]">
                  {review.title || "Untitled Research Paper"}
                </h1>
                <p className="text-xs uppercase tracking-[0.28em] text-white/48">
                  Reviewed by{" "}
                  <span className="font-semibold normal-case tracking-normal text-[#62a7ff]">
                    {review.dao_name ?? DEFAULT_REVIEW_AUTHOR}
                  </span>
                </p>
                <p className="break-all font-mono text-xs uppercase tracking-[0.14em] text-white/48">
                  TXID: {formatCompactId(review.paper_id)}
                </p>
                <p className="break-all font-mono text-[10px] text-white/35">{review.id}</p>
              </header>

              <dl className="grid gap-0 overflow-hidden rounded-[16px] border border-[#263d70] bg-[#14214a]/72 text-sm shadow-[inset_0_1px_0_rgba(80,126,205,0.12)] md:grid-cols-3">
                {meta.map(({ label, value, icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 border-b border-[#2f4271] px-3 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#5fa9ff]/40 text-[#65a7ff]">
                      <MetaStatIcon type={icon} />
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

          <a
            href="#comments"
            className="relative mt-5 inline-flex text-sm font-semibold uppercase tracking-[0.22em] text-[#9fc3ff] transition hover:text-white"
          >
            Jump to comments
          </a>

          {reviewStatement && (
            <section className="relative mt-5 space-y-3 text-sm leading-relaxed text-white/80">
              <h2 className="text-base font-semibold uppercase tracking-[0.3em] text-[#a26bff]">Review Statement</h2>
              <p className="text-base leading-relaxed text-white/72">{reviewStatement}</p>
            </section>
          )}

          {hasRatings ? (
            <div className="relative mt-6 grid grid-cols-2 gap-5 border-t border-[#263d70] pt-6 md:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
              {scoreCards.map(({ label, value, color }) => (
                <ScoreChip key={label} label={label} score={value} color={color} />
              ))}
            </div>
          ) : (
            <div className="relative mt-6 rounded-2xl border border-[#263f72] bg-[#111936] px-4 py-3 text-sm text-white/70">
              This review does not include category score breakdowns yet.
            </div>
          )}
        </article>

        {(review.categories ?? []).some((cat) => typeof cat.section?.rationale === "string" && cat.section.rationale.trim()) && (
          <div className="mt-6 space-y-4">
            {(review.categories ?? []).map((cat, idx) => (
              <RationaleSection
                key={cat.key}
                title={cat.label}
                iconIndex={idx}
                categoryKey={cat.key}
                rationale={typeof cat.section?.rationale === "string" ? cat.section.rationale : null}
              />
            ))}
          </div>
        )}

        <section
          id="comments"
          className="mt-6 scroll-mt-24 rounded-[16px] border border-[#263d70] bg-[#14214a]/55 px-5 py-6 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)]"
        >
          <header>
            <p className="text-xs uppercase tracking-[0.35em] text-white/55">Comments</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white">Discussion</h2>
            <p className="mt-2 text-xs text-white/50">
              Comments are published to Arweave through Turbo. Comments may take up to 10 minutes to display. Wander
              wallet must be connected.
            </p>
          </header>

          <form className="mt-5 space-y-3" onSubmit={handlePublishComment}>
            <label htmlFor="review-comment" className="sr-only">
              Write a comment
            </label>
            {commentPublishMessage ? (
              <div
                className={`min-h-32 rounded-[14px] border px-4 py-3 text-sm leading-relaxed ${
                  commentPublishMessage.type === "success"
                    ? "border-emerald-300/35 bg-emerald-500/10 text-emerald-100"
                    : "border-red-400/30 bg-red-500/10 text-red-100"
                }`}
              >
                <p>{commentPublishMessage.text}</p>
                {commentPublishMessage.type === "error" && (
                  <button
                    type="button"
                    onClick={() => setCommentPublishMessage(null)}
                    className="mt-4 rounded-[10px] border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/85 transition hover:bg-white/10"
                  >
                    Edit comment
                  </button>
                )}
              </div>
            ) : (
              <textarea
                id="review-comment"
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder="Write a comment..."
                className="min-h-32 w-full resize-y rounded-[14px] border border-[#263f72] bg-[#0b1229] px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/35 focus:border-[#74b6ff]/50 focus:outline-none"
              />
            )}
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="submit"
                disabled={!commentBody.trim() || publishingComment || commentPublishMessage?.type === "success"}
                className="rounded-[12px] border border-[#74b6ff]/30 bg-[#162845] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-[#d5ebff] transition hover:bg-[#1d3457] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {publishingComment ? "Publishing..." : "Publish"}
              </button>
            </div>
          </form>

          {commentError && (
            <p className="mt-4 rounded-[12px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {commentError}
            </p>
          )}

          <div className="mt-5 space-y-3">
            {commentsLoading && (
              <p className="rounded-[16px] border border-[#263f72] bg-[#0b1835]/70 px-4 py-4 text-sm text-white/60">
                Loading comments...
              </p>
            )}

            {!commentsLoading && comments.length === 0 && (
              <p className="rounded-[16px] border border-[#263f72] bg-[#0b1835]/70 px-4 py-4 text-sm text-white/60">
                No comments yet.
              </p>
            )}

            {comments.map((comment, index) => (
              <article
                key={comment.txid ?? `${comment.rootTx}-${comment.timestamp}-${index}`}
                className="rounded-[16px] border border-[#263f72] bg-[#0b1835]/70 px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#365589] bg-[#14214a]/80 text-xs font-semibold text-[#b7c9ff]">
                    {getCommentInitials(comment.owner)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-semibold text-white">{getCommentAuthorLabel(comment.owner)}</p>
                      <span className="text-xs text-white/45">{formatCommentTime(comment.timestamp)}</span>
                      {comment.txid && (
                        <span className="text-xs text-white/35">TX {formatCompactId(comment.txid)}</span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/78">{comment.text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </PanelShell>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-midnight text-white">
      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 px-4 pb-10 pt-4 lg:px-6 lg:pb-12 lg:pt-0">
        <div className="sticky top-0 z-50 -mx-4 border-b border-[#263f72]/60 bg-[#050914]/88 px-4 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-xl lg:-mx-6 lg:px-6">
          <div className="mx-auto flex w-full justify-center">
            <Navbar />
          </div>
        </div>

        <main className="mx-auto mt-6 w-full max-w-[1032px]">{renderBody()}</main>

        <div className="mx-auto mt-6 w-full max-w-[1032px]">
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
