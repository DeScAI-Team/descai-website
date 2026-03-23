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
      ? "border-status-positive/25 bg-status-positive/10 text-status-positive"
      : discoveryReport?.mode === "cache"
        ? "border-status-warning/25 bg-status-warning/10 text-status-warning"
        : "border-status-negative/25 bg-status-negative/10 text-status-negative";

  return (
    <article className="panel-border">
      <div className="panel-inner px-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3 text-content-primary">
          <h4 className="neon-heading neon-heading-left text-left text-base">Project Tokens</h4>
          <div className="flex items-center gap-2 text-sm text-content-muted">
            <button
              type="button"
              className="rounded-full border border-border-panel bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.14em] transition hover:bg-surface-elevated hover:border-accent-primary"
              onClick={() => void refreshNow()}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              to="/tokens"
              className="rounded-full border border-border-panel bg-surface-subtle px-3 py-1 text-xs uppercase tracking-[0.14em] transition hover:bg-surface-elevated hover:border-accent-primary"
            >
              View All
            </Link>
          </div>
        </header>

        <p className="mt-3 text-xs text-content-subtle">
          Last market sync: <span className="font-mono">{formattedUpdate}</span> · auto refresh every minute
        </p>
        <p className="mt-1 text-xs text-content-dim">
          Showing the broadest discovered set. {tokensWithAnyMarketData} of {tokens.length} currently have at least some market data.
        </p>
        
        {discoveryReport && (
          <div className={`mt-3 rounded-[10px] border px-3 py-2 text-xs ${discoveryTone}`}>
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
        
        {refreshing && <p className="mt-1 text-xs text-accent-highlight">Refreshing live market data...</p>}
        {loading && <p className="mt-4 text-sm text-content-muted">Discovering DeSci tokens...</p>}
        {error && <p className="error-banner mt-4 text-sm">{error}</p>}

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
