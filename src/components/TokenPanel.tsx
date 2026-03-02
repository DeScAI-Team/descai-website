import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TokenTable from "@/components/TokenTable";
import { useDesciTokens } from "@/hooks/useDesciTokens";
import type { TokenSortField } from "@/types/token";
import { compareTokens, toggleSort, type SortState } from "@/utils/tokenSorting";

  const TokenPanel = () => {
  const [sort, setSort] = useState<SortState>({ field: "fdv", direction: "desc" });
  const { tokens, loading, refreshing, error, lastMarketUpdate, refreshNow, discoveryReport } = useDesciTokens({ mode: "home" });

  const topTokens = useMemo(
    () => [...tokens].sort((left, right) => compareTokens(left, right, sort)).slice(0, 8),
    [tokens, sort]
  );

  const tokensWithAnyMarketData = useMemo(
    () =>
      tokens.filter(
        (token) =>
          token.market?.price != null ||
          token.market?.priceChange24h != null ||
          token.market?.fdv != null ||
          token.market?.marketCap != null
      ).length,
    [tokens]
  );

  const onSortChange = (field: TokenSortField) => {
    setSort((current) => toggleSort(current, field));
  };

  const formattedUpdate = lastMarketUpdate
    ? new Date(lastMarketUpdate).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";
  const discoveryTone =
    discoveryReport?.mode === "live"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
      : discoveryReport?.mode === "cache"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : "border-rose-300/25 bg-rose-300/10 text-rose-100";

  return (
    <article className="rounded-[20px] bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[4px] shadow-[0_0_35px_rgba(255,68,255,0.35)]">
      <div className="rounded-[16px] bg-[#050018]/95 px-6 py-7">
        <header className="flex flex-wrap items-center justify-between gap-3 text-white">
          <h4 className="neon-heading neon-heading-left text-left text-lg">Project Tokens</h4>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <button
              type="button"
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] hover:bg-white/15"
              onClick={() => void refreshNow()}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              to="/tokens"
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] hover:bg-white/15"
            >
              View All
            </Link>
          </div>
        </header>

        <p className="mt-4 text-xs text-white/55">
          Last market sync: {formattedUpdate} · auto refresh every minute
        </p>
        <p className="mt-1 text-xs text-white/45">
          Showing the broadest discovered set. {tokensWithAnyMarketData} of {tokens.length} currently have at least some market data.
        </p>
        {discoveryReport && (
          <div className={`mt-3 rounded-[12px] border px-3 py-2 text-xs ${discoveryTone}`}>
            <p className="font-semibold">
              {discoveryReport.mode === "live"
                ? `Live discovery active: ${discoveryReport.tokenCount} tokens.`
                : discoveryReport.mode === "cache"
                  ? `Cached discovery data in use: ${discoveryReport.tokenCount} tokens.`
                  : discoveryReport.mode === "legacy_cache"
                    ? `Legacy cached discovery data in use: ${discoveryReport.tokenCount} tokens.`
                    : `Fallback discovery data in use: ${discoveryReport.tokenCount} tokens.`}
            </p>
            {discoveryReport.reason && <p className="mt-1 opacity-85">{discoveryReport.reason}</p>}
          </div>
        )}
        {refreshing && <p className="mt-1 text-xs text-[#ffcfef]">Refreshing live market data…</p>}
        {loading && <p className="mt-4 text-sm text-white/65">Discovering DeSci tokens…</p>}
        {error && <p className="mt-4 text-sm text-amber-200">{error}</p>}

        <div className="mt-4">
          <TokenTable
            tokens={topTokens}
            sort={sort}
            onSortChange={onSortChange}
            compact
            showPlatform={false}
            emptyMessage="No tokens discovered yet. Check API keys and endpoint availability."
          />
        </div>
      </div>
    </article>
  );
};

export default TokenPanel;
