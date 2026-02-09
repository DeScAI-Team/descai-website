import clsx from "clsx";
import type { TokenSortField, TokenWithMarketData } from "@/types/token";
import type { SortState } from "@/utils/tokenSorting";

type TokenTableProps = {
  tokens: TokenWithMarketData[];
  sort: SortState;
  onSortChange: (field: TokenSortField) => void;
  compact?: boolean;
  showPlatform?: boolean;
  emptyMessage?: string;
};

const currency = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (Math.abs(value) < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
};

const price3Formatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3
});

const price3 = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `$${price3Formatter.format(value)}`;
};

const percent = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const sortArrow = (field: TokenSortField, sort: SortState) => {
  if (sort.field !== field) return "↕";
  return sort.direction === "asc" ? "↑" : "↓";
};

const SortButton = ({
  field,
  label,
  sort,
  onSortChange
}: {
  field: TokenSortField;
  label: string;
  sort: SortState;
  onSortChange: (field: TokenSortField) => void;
}) => (
  <button
    type="button"
    className="flex items-center gap-1 uppercase tracking-[0.16em] text-white/70 transition hover:text-white"
    onClick={() => onSortChange(field)}
  >
    <span>{label}</span>
    <span aria-hidden className="text-[0.7rem] text-white/45">
      {sortArrow(field, sort)}
    </span>
  </button>
);

const TokenTable = ({ tokens, sort, onSortChange, compact = false, showPlatform = true, emptyMessage }: TokenTableProps) => {
  if (!tokens.length) {
    return <p className="rounded-[12px] border border-white/10 bg-white/5 p-4 text-sm text-white/70">{emptyMessage ?? "No tokens available."}</p>;
  }

  return (
    <div className="space-y-3">
      <div
        className={clsx(
          "grid gap-2 px-2 text-left text-[0.62rem]",
          compact ? "grid-cols-[1.45fr_0.85fr_0.9fr_0.8fr_0.95fr]" : "grid-cols-[1.3fr_0.9fr_0.8fr_0.9fr_0.9fr_0.9fr]",
          showPlatform && !compact && "grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr]"
        )}
      >
        <SortButton field="symbol" label="Token" sort={sort} onSortChange={onSortChange} />
        {showPlatform && !compact && <SortButton field="platform" label="Platform" sort={sort} onSortChange={onSortChange} />}
        <SortButton field="chain" label="Chain" sort={sort} onSortChange={onSortChange} />
        <SortButton field="price" label="Price" sort={sort} onSortChange={onSortChange} />
        <SortButton field="priceChange24h" label="24h" sort={sort} onSortChange={onSortChange} />
        <SortButton field="fdv" label="FDV" sort={sort} onSortChange={onSortChange} />
        {!compact && <SortButton field="marketCap" label="MCap" sort={sort} onSortChange={onSortChange} />}
      </div>

      <div className="space-y-2 text-sm">
        {tokens.map((token) => {
          const isPositive = (token.market?.priceChange24h ?? 0) >= 0;
          return (
            <article
              key={token.id}
              className={clsx(
                "grid items-center gap-2 rounded-[12px] bg-gradient-to-r from-[#1a063a]/90 to-[#09001f]/80 px-4 py-3 text-left shadow-[inset_0_0_10px_rgba(255,255,255,0.04)]",
                compact ? "grid-cols-[1.45fr_0.85fr_0.9fr_0.8fr_0.95fr]" : "grid-cols-[1.3fr_0.9fr_0.8fr_0.9fr_0.9fr_0.9fr]",
                showPlatform && !compact && "grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr]"
              )}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#ffb9ff]">{token.symbol}</p>
                <p className="truncate text-xs text-white/60">{token.name}</p>
              </div>

              {showPlatform && !compact && (
                <span className="rounded-full bg-white/10 px-2 py-1 text-center text-[0.62rem] uppercase tracking-[0.12em] text-white/75">
                  {token.platform}
                </span>
              )}

              <span className="rounded-full bg-white/10 px-2 py-1 text-center text-[0.62rem] uppercase tracking-[0.12em] text-white/75">
                {token.chain.toUpperCase()}
              </span>
              <span className="whitespace-nowrap text-white">{price3(token.market?.price)}</span>
              <span className={clsx("whitespace-nowrap font-semibold", isPositive ? "text-[#7affb2]" : "text-[#ff7a93]")}>
                {percent(token.market?.priceChange24h)}
              </span>
              <span className="whitespace-nowrap text-white">{currency(token.market?.fdv)}</span>
              {!compact && <span className="whitespace-nowrap text-white/85">{currency(token.market?.marketCap)}</span>}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default TokenTable;
