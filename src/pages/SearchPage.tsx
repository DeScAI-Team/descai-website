import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { searchReviews } from "@/api/reviews";
import type { ReviewListItem } from "@/types/review";

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = useMemo(() => query.trim(), [query]);

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
    <div className="relative min-h-screen overflow-hidden bg-midnight px-4 py-10 text-white">
      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-8">
        <Navbar />

        <div className="w-full max-w-4xl space-y-6">
          <header className="space-y-3 text-center">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/15"
            >
              ← Back
            </Link>
            <h1 className="flex-1 text-center text-2xl font-semibold uppercase tracking-[0.28em] text-white">
              Search Results
            </h1>
            <span className="w-16" aria-hidden />
          </div>
            <form onSubmit={onSubmit} className="flex flex-wrap items-center justify-center gap-3">
              <input
                className="w-full max-w-xl rounded-[14px] border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#9fc3ff]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reviews by title or paper ID..."
              />
              <button
                type="submit"
                className="rounded-[12px] border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/15"
              >
                Search
              </button>
            </form>
            <p className="text-xs text-white/60">Showing results for “{trimmed || "…" }”</p>
          </header>

          <section className="rounded-[20px] bg-gradient-to-br from-[#3c537f] via-[#273960] to-[#16213c] p-[4px] shadow-[0_0_26px_rgba(60,83,127,0.22)]">
            <div className="rounded-[16px] border border-white/15 bg-[#141c3d]/92 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur">
            {loading && <p className="text-white/70">Searching…</p>}
            {error && <p className="text-amber-200">{error}</p>}
            {!loading && !error && results.length === 0 && (
              <p className="text-white/60">No matches yet. Try another term.</p>
            )}
            {!loading && !error && results.length > 0 && (
              <ul className="space-y-3">
                {results.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[12px] border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/review/${item.id}`} className="block flex-1">
                        <p className="font-semibold leading-tight text-white">
                          {item.title || item.paper_id || "Untitled review"}
                        </p>
                        <p className="text-xs text-white/60">Paper: {item.paper_id || "—"}</p>
                        <p className="text-[11px] text-white/50">
                          Created: {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </Link>
                      <Link
                        to={`/review/${item.id}`}
                        className="shrink-0 rounded-[10px] border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/15"
                      >
                        View
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
          </section>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default SearchPage;
