import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { searchReviews } from "@/api/reviews";
import type { ReviewListItem } from "@/types/review";

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

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const run = async () => {
      if (trimmed.length < 2) {
        setResults([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await searchReviews(trimmed, 50);
        setResults(res);
      } catch (err) {
        setError((err as Error).message || "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [trimmed]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = query.trim();
    setSearchParams(next ? { q: next } : {});
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-midnight text-white">
      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 px-4 pb-10 pt-4 lg:px-6 lg:pb-12 lg:pt-0">
        <div className="sticky-nav-shell sticky top-0 z-50 -mx-4 px-4 pb-3 pt-1.5 lg:-mx-6 lg:px-6">
          <div className="mx-auto flex w-full justify-center">
            <Navbar />
          </div>
        </div>

        <form onSubmit={onSubmit} className="relative mt-10 space-y-3">
          <div className="relative min-h-[44px]">
            <Link
              to="/"
              className="absolute left-[calc(50px-1rem)] top-1/2 z-10 -translate-y-1/2 rounded-full border border-[#263f72] bg-[#14214a]/72 px-4 py-2 text-sm font-semibold text-[#9fc3ff] transition hover:border-[#74b6ff]/35 hover:bg-[#1a2d5d] hover:text-white lg:left-[calc(50px-1.5rem)]"
            >
              ← Back
            </Link>
            <label className="mx-auto flex min-h-[44px] w-full max-w-2xl items-center gap-3 rounded-[14px] border border-[#263b68] bg-[rgba(8,14,34,0.78)] px-4 py-2 text-sm text-white/70 shadow-[inset_0_1px_0_rgba(80,126,205,0.12),0_0_24px_rgba(70,113,190,0.1)]">
              <input
                className="w-full bg-transparent text-white placeholder:text-white/38 focus:outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reviews, platforms, research..."
              />
              <button
                type="submit"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-[#9fc3ff] transition hover:bg-[#0b1835]/70"
                aria-label="Search"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M10.5 3a7.5 7.5 0 015.96 12.02l4.26 4.27-1.42 1.41-4.27-4.26A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
                </svg>
              </button>
            </label>
          </div>
          <p className="text-center text-xs uppercase tracking-[0.28em] text-white/48">
            {trimmed.length >= 2 ? (
              <>
                Showing results for{" "}
                <span className="font-semibold normal-case tracking-normal text-[#62a7ff]">“{trimmed}”</span>
              </>
            ) : (
              "Enter at least 2 characters to search"
            )}
          </p>
        </form>

        <main className="mx-auto mt-5 w-full max-w-[1032px]">
            <section className="relative overflow-hidden rounded-[20px] border border-[#385083] bg-[linear-gradient(135deg,rgba(28,43,92,0.82),rgba(8,14,38,0.92)_42%,rgba(33,17,88,0.72))] p-5 shadow-[inset_0_1px_0_rgba(80,126,205,0.16),inset_0_0_48px_rgba(121,86,255,0.08),0_16px_46px_rgba(0,0,0,0.45)] md:p-6">
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#7e47ff]/16 blur-[90px]" />
                <div className="absolute -left-12 top-1/3 h-40 w-40 rounded-full bg-[#59b8ff]/10 blur-[70px]" />
              </div>

              <header className="relative mb-4 flex items-baseline justify-between gap-3 border-b border-[#263d70]/80 pb-4">
                <h2 className="text-base font-semibold uppercase tracking-[0.3em] text-[#a26bff]">Matches</h2>
                {!loading && trimmed.length >= 2 && (
                  <span className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {results.length} result{results.length === 1 ? "" : "s"}
                  </span>
                )}
              </header>

              {loading && (
                <div className="relative animate-pulse space-y-3">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="h-24 rounded-[16px] border border-[#263d70] bg-[#14214a]/55" />
                  ))}
                </div>
              )}

              {error && (
                <p className="relative rounded-[16px] border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {error}
                </p>
              )}

              {!loading && !error && trimmed.length >= 2 && results.length === 0 && (
                <p className="relative text-sm text-white/60">No matches yet. Try another term.</p>
              )}

              {!loading && !error && results.length > 0 && (
                <ul className="relative space-y-3">
                  {results.map((item) => {
                    const score = normalizeScore(item.average_score);

                    return (
                      <li
                        key={item.id}
                        className="flex flex-col rounded-[16px] border border-[#263d70] bg-[#14214a]/55 px-4 pb-4 pt-5 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)] transition hover:border-[#365589] hover:bg-[#0f1f45]/88"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-2.5">
                            <Link to={`/review/${item.id}`} className="group block pt-0.5">
                              <p className="font-display text-lg font-semibold leading-tight text-white transition group-hover:text-[#c6d9ff]">
                                {item.title || item.paper_id || "Untitled review"}
                              </p>
                            </Link>

                            <p className="font-mono text-xs uppercase tracking-[0.14em] text-white/48">
                              TXID: {formatCompactId(item.paper_id ?? item.id)}
                            </p>
                          </div>

                          <Link
                            to={`/review/${item.id}`}
                            className="shrink-0 rounded-[12px] border border-[#74b6ff]/30 bg-[#162845] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d5ebff] transition hover:bg-[#1d3457]"
                          >
                            View
                          </Link>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-white/55">Published {formatDate(item.created_at)}</p>

                          {(item.platform || item.category || score !== null) && (
                            <div className="flex flex-wrap justify-end gap-2">
                              {item.platform ? (
                                <span className="inline-flex items-center rounded-[4px] border border-[#3d5694]/55 bg-[#0a1428]/90 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#9eb6ef]">
                                  {item.platform}
                                </span>
                              ) : null}
                              {item.category ? (
                                <span className="inline-flex items-center rounded-[4px] border border-[#3d5694]/55 bg-[#0a1428]/90 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#9eb6ef]">
                                  {item.category}
                                </span>
                              ) : null}
                              {score !== null ? (
                                <span className="inline-flex items-center rounded-[4px] border border-[#5fa9ff]/35 bg-[#162845]/90 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#9fc3ff]">
                                  Score: {score}%
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
        </main>

        <div className="mx-auto mt-6 w-full max-w-[1032px]">
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
