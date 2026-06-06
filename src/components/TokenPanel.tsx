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
    <article className="rounded-[20px] border border-[#2a4580]/85 bg-[linear-gradient(148deg,rgba(32,52,102,0.88),rgba(7,12,28,0.98))] p-px shadow-[0_16px_44px_rgba(1,4,18,0.55),0_0_20px_rgba(68,121,214,0.1)]">
      <div className="rounded-[19px] border border-[#2f4a82]/90 bg-[#060f22]/95 px-6 py-7 shadow-[inset_0_1px_0_rgba(88,132,210,0.1)]">
        <header className="flex flex-wrap items-center justify-between gap-3 text-white">
          <h4 className="neon-heading neon-heading-left text-left text-lg">Project Tokens</h4>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <button
              type="button"
              className="rounded-full border border-[#263f72] bg-[#14214a]/72 px-3 py-1 text-xs uppercase tracking-[0.16em] hover:bg-[#1a2d5d]"
              onClick={() => void refreshNow()}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              to="/tokens"
              className="rounded-full border border-[#263f72] bg-[#14214a]/72 px-3 py-1 text-xs uppercase tracking-[0.16em] hover:bg-[#1a2d5d]"
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
