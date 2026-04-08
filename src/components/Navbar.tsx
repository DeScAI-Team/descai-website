import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { searchReviews } from "@/api/reviews";
import type { ReviewListItem } from "@/types/review";

const Navbar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSearch = async (value: string) => {
    const term = value.trim();
    if (term.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchReviews(term, 8);
      setResults(res);
    } catch (err) {
      setError((err as Error).message || "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      void handleSearch(query);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="relative z-50 w-full rounded-[20px] bg-gradient-to-br from-[#3c537f] via-[#273960] to-[#16213c] p-[4px] shadow-[0_0_26px_rgba(60,83,127,0.22)]">
      <header className="rounded-[16px] border border-white/15 bg-[#141c3d]/95 px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:px-6">
        <div className="relative z-50 flex items-center gap-3 lg:grid lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:items-center lg:gap-5">
          <Link to="/" className="flex items-center gap-2 lg:justify-self-start">
            <img
              src="/DeScAI%20logo.jpg"
              alt="DeScAI logo"
              className="h-14 w-14 rounded-[14px] border border-white/10 bg-white/5 object-cover shadow-[0_8px_20px_rgba(0,0,0,0.22)] lg:h-16 lg:w-16"
            />
          </Link>

        <div className="relative min-w-0 flex-1 lg:col-start-2 lg:w-full">
          <div className="mx-auto w-full max-w-[860px]">
          <label className="flex min-h-[48px] w-full items-center gap-3 rounded-[14px] border border-white/15 bg-[rgba(9,16,35,0.72)] px-4 py-2.5 text-sm text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <input
              className="w-full bg-transparent text-white placeholder:text-white/40 focus:outline-none"
              placeholder="Search reviews..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const next = query.trim();
                  if (next.length >= 2) {
                    setResults([]);
                    navigate(`/search?q=${encodeURIComponent(next)}`);
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const next = query.trim();
                if (next.length >= 2) {
                  setResults([]);
                  navigate(`/search?q=${encodeURIComponent(next)}`);
                }
              }}
              className="grid h-9 w-9 place-items-center rounded-[11px] border border-[#74b6ff]/25 bg-gradient-to-br from-[#20375a] to-[#162845] text-[#d5ebff] shadow-[0_6px_18px_rgba(0,0,0,0.22)] transition hover:from-[#28446c] hover:to-[#1a3152]"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M10.5 3a7.5 7.5 0 015.96 12.02l4.26 4.27-1.42 1.41-4.27-4.26A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
              </svg>
            </button>
          </label>
          </div>
          {(results.length > 0 || loading || error) && (
            <div className="absolute left-0 right-0 z-50 mx-auto mt-2 w-full max-w-[860px] rounded-[16px] border border-white/15 bg-[#10192c]/95 p-3 text-sm shadow-[0_20px_44px_rgba(0,0,0,0.48)] backdrop-blur-xl">
              {loading && <p className="text-white/70">Searching…</p>}
              {error && <p className="text-amber-200">{error}</p>}
              {!loading && !error && results.length === 0 && (
                <p className="text-white/60">No matches found.</p>
              )}
              {!loading && !error && results.length > 0 && (
                <ul className="space-y-2">
                  {results.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/review/${item.id}`}
                        className="block rounded-[10px] px-3 py-2 hover:bg-white/5 text-white"
                        onClick={() => setResults([])}
                      >
                        <p className="font-semibold leading-tight">
                          {item.title || item.paper_id || "Untitled review"}
                        </p>
                        <p className="text-xs text-white/60">Paper: {item.paper_id || "—"}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {!loading && !error && query.trim().length >= 2 && (
                <div className="mt-3 border-t border-white/10 pt-2 text-right">
                  <Link
                    to={`/search?q=${encodeURIComponent(query.trim())}`}
                    className="text-xs font-semibold text-[#9fc3ff] hover:text-white"
                    onClick={() => setResults([])}
                  >
                    See all results →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 lg:col-start-3 lg:ml-0 lg:justify-self-end">
          <button className="hidden rounded-[14px] border border-white/15 bg-white/6 px-5 py-2.5 text-sm font-semibold tracking-[0.12em] text-[#d5ebff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-white/10 lg:block">
            Connect Wallet
          </button>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/15 bg-white/6 text-white/80 transition hover:bg-white/10 lg:hidden"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="sr-only">Toggle navigation</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
            </svg>
          </button>
        </div>
        </div>

        {mobileOpen && (
          <div className="absolute right-4 top-[100%] mt-2 w-52 rounded-[16px] border border-white/15 bg-[#10192c]/95 p-3 text-sm uppercase tracking-wide text-white/80 shadow-[0_15px_35px_rgba(0,0,0,0.45)] lg:hidden">
            <nav className="flex flex-col gap-2">
              <button className="mt-2 w-full rounded-[12px] border border-white/15 bg-white/6 px-5 py-3 text-base font-semibold tracking-[0.14em] text-[#d5ebff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                Connect Wallet
              </button>
            </nav>
          </div>
        )}
      </header>
    </div>
  );
};

export default Navbar;
