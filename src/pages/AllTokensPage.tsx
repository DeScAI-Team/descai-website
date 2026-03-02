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
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
      : discoveryReport?.mode === "cache"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : "border-rose-300/25 bg-rose-300/10 text-rose-100";

  return (
    <div className="relative min-h-screen overflow-hidden bg-midnight px-4 py-10 text-white">
      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-8">
        <Navbar />

        <section className="w-full space-y-4 rounded-[20px] bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[4px] shadow-[0_0_35px_rgba(255,68,255,0.35)]">
          <div className="rounded-[16px] border border-white/10 bg-[#060017]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:border-white/40 hover:bg-white/15"
                >
                  Back
                </Link>
                <h1 className="text-xl font-semibold uppercase tracking-[0.2em] text-white md:text-2xl">All DeSci Tokens</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refreshNow()}
                  disabled={refreshing}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-white/15 disabled:opacity-60"
                >
                  {refreshing ? "Refreshing…" : "Refresh"}
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
                  className="w-full rounded-[12px] border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ff9cf5]"
                />
              </label>
              <div className="text-xs text-white/60">
                <p>
                  {filtered.length} token{filtered.length === 1 ? "" : "s"} | Any market data on {marketCoverage.any} | Full market fields on{" "}
                  {marketCoverage.complete}
                </p>
                <p>Last market sync: {lastUpdateLabel}</p>
                {discoveryReport && (
                  <p>
                    Discovery source: {discoveryReport.mode} ({discoveryReport.tokenCount} tokens)
                    {discoveryReport.reason ? ` · ${discoveryReport.reason}` : ""}
                  </p>
                )}
                {sourceStatusLabel && <p className="text-white/45">{sourceStatusLabel}</p>}
                {sourceErrorLabel && <p className="text-amber-200/80">{sourceErrorLabel}</p>}
                <p className="text-white/45">Discovered tokens stay visible even when DefiLlama has not returned every market field yet.</p>
              </div>
            </div>

            {discoveryReport && (
              <div className={`mt-4 rounded-[12px] border px-4 py-3 text-sm ${discoveryTone}`}>
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

            {loading && <p className="mt-4 text-sm text-white/70">Discovering tokens and loading market data…</p>}
            {refreshing && <p className="mt-2 text-xs text-[#ffcfef]">Refreshing live market data…</p>}
            {error && <p className="mt-4 text-sm text-amber-200">{error}</p>}

            <div className="mt-4">
              <TokenTable
                tokens={paginated}
                sort={sort}
                onSortChange={handleSort}
                showPlatform
                emptyMessage="No matching tokens found."
              />
            </div>

            <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/70">
              <p>
                Showing {sorted.length ? start + 1 : 0}-{Math.min(end, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 uppercase tracking-[0.14em] hover:bg-white/15 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 uppercase tracking-[0.14em] hover:bg-white/15 disabled:opacity-40"
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
