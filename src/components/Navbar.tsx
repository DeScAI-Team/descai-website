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
    <header className="relative z-50 w-full max-w-6xl rounded-full border border-border-panel bg-surface-sidebar/95 px-5 py-3 shadow-panel backdrop-blur-sm">
      <div className="relative z-50 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/DeScAI%20logo.jpg"
            alt="DeScAI logo"
            className="h-12 w-12 rounded-full border border-border bg-surface-subtle object-cover"
          />
        </Link>
        
        <div className="relative flex-1 min-w-[200px]">
          <label className="flex w-full items-center gap-3 rounded-full border border-border bg-surface-card px-4 py-2 text-sm text-content-muted">
            <input
              className="w-full bg-transparent text-content-primary placeholder:text-content-dim focus:outline-none"
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
              className="grid h-8 w-8 place-items-center rounded-full bg-accent-primary text-surface-base transition hover:opacity-90"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M10.5 3a7.5 7.5 0 015.96 12.02l4.26 4.27-1.42 1.41-4.27-4.26A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
              </svg>
            </button>
          </label>
          
          {(results.length > 0 || loading || error) && (
            <div className="absolute left-0 right-0 z-50 mt-2 rounded-[12px] border border-border-panel bg-surface-sidebar/98 p-3 text-sm shadow-panel backdrop-blur-sm">
              {loading && <p className="text-content-muted">Searching...</p>}
              {error && <p className="text-status-warning">{error}</p>}
              {!loading && !error && results.length === 0 && (
                <p className="text-content-subtle">No matches found.</p>
              )}
              {!loading && !error && results.length > 0 && (
                <ul className="space-y-1.5">
                  {results.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/review/${item.id}`}
                        className="block rounded-[8px] px-3 py-2 transition hover:bg-surface-elevated text-content-primary"
                        onClick={() => setResults([])}
                      >
                        <p className="font-semibold leading-tight">
                          {item.title || item.paper_id || "Untitled review"}
                        </p>
                        <p className="text-xs text-content-subtle font-mono">Paper: {item.paper_id || "—"}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {!loading && !error && query.trim().length >= 2 && (
                <div className="mt-2.5 border-t border-border pt-2 text-right">
                  <Link
                    to={`/search?q=${encodeURIComponent(query.trim())}`}
                    className="text-xs font-semibold text-accent-link transition hover:text-content-primary"
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-subtle text-content-muted transition hover:bg-surface-elevated lg:hidden"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="sr-only">Toggle navigation</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
            </svg>
          </button>
          
          <nav className="hidden text-sm uppercase tracking-wide text-content-muted lg:flex lg:items-center lg:gap-5">
            <Link className="transition hover:text-accent-highlight" to="/">
              Home
            </Link>
            <Link className="transition hover:text-accent-highlight" to="/tokens">
              All DeSci Tokens
            </Link>
            <Link className="transition hover:text-accent-highlight" to="/">
              About
            </Link>
          </nav>

          <button className="hidden rounded-full border border-accent-primary/50 bg-accent-primary-dim px-4 py-2 text-sm font-semibold tracking-wider text-accent-primary shadow-panel transition hover:bg-accent-primary/20 lg:block">
            Connect Wallet
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="absolute right-5 top-[100%] mt-2 w-48 rounded-[12px] border border-border-panel bg-surface-sidebar/98 p-3 text-sm uppercase tracking-wide text-content-muted shadow-panel backdrop-blur-sm lg:hidden">
          <nav className="flex flex-col gap-2">
            <Link className="transition hover:text-accent-highlight" to="/" onClick={() => setMobileOpen(false)}>
              Home
            </Link>
            <Link className="transition hover:text-accent-highlight" to="/tokens" onClick={() => setMobileOpen(false)}>
              All DeSci Tokens
            </Link>
            <Link className="transition hover:text-accent-highlight" to="/" onClick={() => setMobileOpen(false)}>
              About
            </Link>
            <button className="mt-2 w-full rounded-full border border-accent-primary/50 bg-accent-primary-dim px-4 py-2 text-sm font-semibold tracking-wider text-accent-primary">
              Connect Wallet
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
