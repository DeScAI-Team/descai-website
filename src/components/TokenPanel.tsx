import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TokenTable from "@/components/TokenTable";
import { useDesciTokens } from "@/hooks/useDesciTokens";
import type { TokenSortField } from "@/types/token";
import { compareTokens, toggleSort, type SortState } from "@/utils/tokenSorting";

const TokenPanel = () => {
  const [sort, setSort] = useState<SortState>({ field: "fdv", direction: "desc" });
  const { tokens, loading, refreshing, error, lastMarketUpdate, refreshNow } = useDesciTokens({ mode: "home" });
  const realDataTokens = useMemo(
    () =>
      tokens.filter(
        (token) =>
          token.chain !== "unknown" &&
          (token.market?.price ?? 0) > 0 &&
          token.market?.price !== null &&
          token.market?.price !== undefined
      ),
    [tokens]
  );

  const topTokens = useMemo(
    () => [...realDataTokens].sort((left, right) => compareTokens(left, right, sort)).slice(0, 8),
    [realDataTokens, sort]
  );

  const onSortChange = (field: TokenSortField) => {
    setSort((current) => toggleSort(current, field));
  };

  const formattedUpdate = lastMarketUpdate
    ? new Date(lastMarketUpdate).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <article className="rounded-[20px] bg-gradient-to-br from-[#3c537f] via-[#273960] to-[#16213c] p-[4px] shadow-[0_0_26px_rgba(60,83,127,0.22)]">
      <div className="rounded-[16px] border border-white/15 bg-[#141c3d]/95 px-6 py-7">
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
        <p className="mt-1 text-xs text-white/45">Showing tokens with verified chain and live pricing. Cap fields appear when available.</p>
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
            emptyMessage="No token data found yet. Check API keys and endpoint availability."
          />
        </div>
      </div>
    </article>
  );
};

export default TokenPanel;
