import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TokenTable from "@/components/TokenTable";
import { useDesciTokens } from "@/hooks/useDesciTokens";
import type { TokenSortField } from "@/types/token";
import { compareTokens, toggleSort, type SortState } from "@/utils/tokenSorting";

const PAGE_SIZE = 20;

const AllTokensPage = () => {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({ field: "fdv", direction: "desc" });
  const [page, setPage] = useState(1);
  const { tokens, loading, refreshing, error, refreshNow, lastMarketUpdate, discoveryReport } = useDesciTokens({
    mode: "all",
    rotationBatchSize: 60
  });

  useEffect(() => {
    setPage(1);
  }, [query, sort]);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return tokens;
    return tokens.filter((token) =>
      [token.symbol, token.name, token.platform, token.platforms.join(" "), token.chain, token.address ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [normalizedQuery, tokens]);

  const sorted = useMemo(() => {
    return [...filtered].sort((left, right) => compareTokens(left, right, sort));
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginated = sorted.slice(start, end);
  
  const marketCoverage = useMemo(() => {
    let any = 0;
    let complete = 0;

    for (const token of tokens) {
      const market = token.market;
      const hasAny =
        market?.price != null ||
        market?.priceChange24h != null ||
        market?.fdv != null ||
        market?.marketCap != null;
      const hasComplete =
        market?.price != null &&
        market?.priceChange24h != null &&
        market?.fdv != null;

      if (hasAny) any += 1;
      if (hasComplete) complete += 1;
    }

    return { any, complete };
  }, [tokens]);

  const handleSort = (field: TokenSortField) => {
    setSort((current) => toggleSort(current, field));
  };

  const lastUpdateLabel = lastMarketUpdate
    ? new Date(lastMarketUpdate).toLocaleString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    : "—";

  const sourceStatusLabel = discoveryReport?.sources
    ?.map((source) =>
      source.status === "fulfilled"
        ? `${source.platform}:${source.normalizedCount}`
        : `${source.platform}:error`
    )
    .join(" · ");

  const sourceErrorLabel = discoveryReport?.sources
    ?.filter((source) => source.status === "rejected")
    .map((source) => `${source.platform} failed`)
    .join(" · ");

  const discoveryTone =
    discoveryReport?.mode === "live"
      ? "border-status-positive/25 bg-status-positive/10 text-status-positive"
      : discoveryReport?.mode === "cache"
        ? "border-status-warning/25 bg-status-warning/10 text-status-warning"
        : "border-status-negative/25 bg-status-negative/10 text-status-negative";

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-base px-4 py-8 text-content-primary">
      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-8">
        <Navbar />

        <section className="panel-border w-full shadow-featured">
          <div className="panel-inner p-5">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="rounded-full border border-border-panel bg-surface-subtle px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-content-primary transition hover:border-accent-primary hover:bg-surface-elevated"
                >
                  Back
                </Link>
                <h1 className="text-lg font-semibold uppercase tracking-[0.15em] text-content-primary md:text-xl">
                  All DeSci Tokens
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refreshNow()}
                  disabled={refreshing}
                  className="rounded-full border border-border-panel bg-surface-subtle px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-content-primary transition hover:border-accent-primary hover:bg-surface-elevated disabled:opacity-60"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </header>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="w-full max-w-lg">
                <span className="sr-only">Search tokens</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by ticker, project, chain, platform, or address..."
                  className="w-full rounded-[10px] border border-border bg-surface-subtle px-4 py-2.5 text-sm text-content-primary placeholder:text-content-dim focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              </label>
              <div className="text-xs text-content-subtle">
                <p>
                  {filtered.length} token{filtered.length === 1 ? "" : "s"} | Any market data on {marketCoverage.any} | Full market fields on{" "}
                  {marketCoverage.complete}
                </p>
                <p>Last market sync: <span className="font-mono">{lastUpdateLabel}</span></p>
                {discoveryReport && (
                  <p>
                    Discovery source: {discoveryReport.mode} ({discoveryReport.tokenCount} tokens)
                    {discoveryReport.reason ? ` · ${discoveryReport.reason}` : ""}
                  </p>
                )}
                {sourceStatusLabel && <p className="text-content-dim">{sourceStatusLabel}</p>}
                {sourceErrorLabel && <p className="text-status-warning">{sourceErrorLabel}</p>}
                <p className="text-content-dim">
                  Discovered tokens stay visible even when DefiLlama has not returned every market field yet.
                </p>
              </div>
            </div>

            {discoveryReport && (
              <div className={`mt-4 rounded-[10px] border px-3 py-2.5 text-sm ${discoveryTone}`}>
                <p className="font-semibold">
                  {discoveryReport.mode === "live"
                    ? `Live discovery active: ${discoveryReport.tokenCount} tokens found across platform APIs.`
                    : discoveryReport.mode === "cache"
                      ? `Cached discovery data in use: ${discoveryReport.tokenCount} tokens.`
                      : discoveryReport.mode === "legacy_cache"
                        ? `Legacy cached discovery data in use: ${discoveryReport.tokenCount} tokens.`
                        : `Fallback discovery data in use: ${discoveryReport.tokenCount} tokens.`}
                </p>
                {discoveryReport.reason && <p className="mt-1 opacity-85">{discoveryReport.reason}</p>}
                {sourceStatusLabel && <p className="mt-1 opacity-85">{sourceStatusLabel}</p>}
                {sourceErrorLabel && <p className="mt-1">{sourceErrorLabel}</p>}
              </div>
            )}

            {loading && <p className="mt-4 text-sm text-content-muted">Discovering tokens and loading market data...</p>}
            {refreshing && <p className="mt-2 text-xs text-accent-highlight">Refreshing live market data...</p>}
            {error && <p className="error-banner mt-4 text-sm">{error}</p>}

            <div className="mt-4">
              <TokenTable
                tokens={paginated}
                sort={sort}
                onSortChange={handleSort}
                showPlatform
                emptyMessage="No matching tokens found."
              />
            </div>

            <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-content-muted">
              <p>
                Showing {sorted.length ? start + 1 : 0}-{Math.min(end, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-full border border-border-panel bg-surface-subtle px-3 py-1 uppercase tracking-[0.12em] transition hover:bg-surface-elevated disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="rounded-full border border-border px-3 py-1 font-mono">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-full border border-border-panel bg-surface-subtle px-3 py-1 uppercase tracking-[0.12em] transition hover:bg-surface-elevated disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </footer>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default AllTokensPage;
