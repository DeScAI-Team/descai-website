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
    <header className="relative z-50 w-full max-w-6xl rounded-full border border-white/10 bg-gradient-to-r from-[#030514]/95 to-[#070c2a]/80 px-6 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="relative z-50 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/DeScAI%20logo.jpg"
            alt="DeScAI logo"
            className="h-14 w-14 rounded-full border border-white/10 bg-white/5 object-cover"
          />
        </Link>
        <div className="relative flex-1 min-w-[220px]">
          <label className="flex w-full items-center gap-3 rounded-full border border-white/10 bg-[#0c132f] px-4 py-2 text-sm text-white/70">
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
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-white to-white/60 text-[#12163d]"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M10.5 3a7.5 7.5 0 015.96 12.02l4.26 4.27-1.42 1.41-4.27-4.26A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
              </svg>
            </button>
          </label>
          {(results.length > 0 || loading || error) && (
            <div className="absolute left-0 right-0 z-50 mt-2 rounded-[14px] border border-white/10 bg-[#0b0f2a]/95 p-3 text-sm shadow-[0_25px_60px_rgba(0,0,0,0.55)] backdrop-blur">
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
                    className="text-xs font-semibold text-[#ff9cf5] hover:text-white"
                    onClick={() => setResults([])}
                  >
                    See all results →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 lg:hidden"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="sr-only">Toggle navigation</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
            </svg>
          </button>
          <nav className="hidden text-sm uppercase tracking-wide text-white/80 lg:flex lg:items-center lg:gap-6">
            <Link className="transition hover:text-plasma-pink" to="/">
              Home
            </Link>
            <Link className="transition hover:text-plasma-pink" to="/">
              All Reviews
            </Link>
            <Link className="transition hover:text-plasma-pink" to="/">
              About
            </Link>
          </nav>

          <button className="hidden rounded-full border border-amber-200/50 bg-gradient-to-br from-[#221402] to-[#5b3600] px-5 py-2 text-sm font-semibold tracking-wider text-amber-100 shadow-[0_10px_25px_rgba(0,0,0,0.45)] lg:block">
            Connect Wallet
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="absolute right-6 top-[100%] mt-2 w-52 rounded-[14px] border border-white/10 bg-[#0c132f]/95 p-3 text-sm uppercase tracking-wide text-white/80 shadow-[0_15px_35px_rgba(0,0,0,0.45)] lg:hidden">
          <nav className="flex flex-col gap-2">
            <Link className="transition hover:text-plasma-pink" to="/" onClick={() => setMobileOpen(false)}>
              Home
            </Link>
            <Link className="transition hover:text-plasma-pink" to="/" onClick={() => setMobileOpen(false)}>
              All Reviews
            </Link>
            <Link className="transition hover:text-plasma-pink" to="/" onClick={() => setMobileOpen(false)}>
              About
            </Link>
            <button className="mt-2 w-full rounded-full border border-amber-200/50 bg-gradient-to-br from-[#221402] to-[#5b3600] px-4 py-2 text-sm font-semibold tracking-wider text-amber-100 shadow-[0_10px_25px_rgba(0,0,0,0.45)]">
              Connect Wallet
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
