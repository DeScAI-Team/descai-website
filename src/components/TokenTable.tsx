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

const formatPrice = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";

  if (Math.abs(value) >= 1_000) return currency(value);
  if (Math.abs(value) >= 1) return `$${value.toFixed(2)}`;
  if (Math.abs(value) >= 0.1) return `$${value.toFixed(3)}`;
  if (Math.abs(value) >= 0.01) return `$${value.toFixed(4)}`;
  if (Math.abs(value) >= 0.001) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(6)}`;
};

const percent = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const formatChainLabel = (value: TokenWithMarketData["chain"]) => {
  switch (value) {
    case "ethereum":
      return "ETH";
    case "solana":
      return "SOL";
    case "base":
      return "BASE";
    default:
      return "—";
  }
};

const sortArrow = (field: TokenSortField, sort: SortState) => {
  if (sort.field !== field) return "↕";
  return sort.direction === "asc" ? "↑" : "↓";
};

const shortenLabel = (value: string, maxLength = 18) => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
};

const COMPACT_GRID_CLASS = "grid-cols-[minmax(0,1.45fr)_repeat(4,minmax(0,1fr))]";
const FULL_GRID_CLASS = "grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))]";
const FULL_WITH_PLATFORM_GRID_CLASS = "grid-cols-[minmax(0,1.5fr)_repeat(6,minmax(0,1fr))]";

const SortButton = ({
  field,
  label,
  sort,
  onSortChange,
  align = "left"
}: {
  field: TokenSortField;
  label: string;
  sort: SortState;
  onSortChange: (field: TokenSortField) => void;
  align?: "left" | "center" | "right";
}) => (
  <button
    type="button"
    className={clsx(
      "flex w-full items-center gap-1 uppercase tracking-[0.16em] text-white/70 transition hover:text-white",
      align === "left" && "justify-start text-left",
      align === "center" && "justify-center text-center",
      align === "right" && "justify-end text-right"
    )}
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
    return <p className="rounded-[12px] border border-white/15 bg-white/10 p-4 text-sm text-white/75">{emptyMessage ?? "No tokens available."}</p>;
  }

  return (
    <div className="space-y-3">
      <div
        className={clsx(
          "grid gap-x-4 px-4 text-left text-[0.62rem]",
          compact ? COMPACT_GRID_CLASS : FULL_GRID_CLASS,
          showPlatform && !compact && FULL_WITH_PLATFORM_GRID_CLASS
        )}
      >
        <SortButton field="symbol" label="Token" sort={sort} onSortChange={onSortChange} />
        {showPlatform && !compact && <SortButton field="platform" label="Platform" sort={sort} onSortChange={onSortChange} align="center" />}
        <SortButton field="chain" label="Chain" sort={sort} onSortChange={onSortChange} align="center" />
        <SortButton field="price" label="Price" sort={sort} onSortChange={onSortChange} align="right" />
        <SortButton field="priceChange24h" label="24h" sort={sort} onSortChange={onSortChange} align="right" />
        <SortButton field="fdv" label="FDV" sort={sort} onSortChange={onSortChange} align="right" />
        {!compact && <SortButton field="marketCap" label="MCAP" sort={sort} onSortChange={onSortChange} align="right" />}
      </div>

      <div className="space-y-2 text-sm">
        {tokens.map((token) => {
          const hasPriceChange = typeof token.market?.priceChange24h === "number" && !Number.isNaN(token.market.priceChange24h);
          const isPositive = hasPriceChange ? (token.market?.priceChange24h ?? 0) >= 0 : false;
          return (
            <article
              key={token.id}
              className={clsx(
                "grid items-center gap-x-4 rounded-[12px] bg-gradient-to-r from-[#232b56]/92 to-[#171d3e]/88 px-4 py-3 text-left shadow-[inset_0_0_12px_rgba(255,255,255,0.06)]",
                compact ? COMPACT_GRID_CLASS : FULL_GRID_CLASS,
                showPlatform && !compact && FULL_WITH_PLATFORM_GRID_CLASS
              )}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#9fc3ff]">{token.symbol}</p>
                <p className="truncate text-xs text-white/60">{shortenLabel(token.name)}</p>
              </div>

              {showPlatform && !compact && (
                <span className="rounded-full bg-white/10 px-2 py-1 text-center text-[0.62rem] uppercase tracking-[0.12em] text-white/75">
                  {token.platform}
                </span>
              )}

              <span className="rounded-full bg-white/10 px-2 py-1 text-center text-[0.62rem] uppercase tracking-[0.12em] text-white/75">
                {formatChainLabel(token.chain)}
              </span>
              <span className="whitespace-nowrap text-right font-mono tabular-nums text-white">{formatPrice(token.market?.price)}</span>
              <span
                className={clsx(
                  "whitespace-nowrap text-right font-mono font-semibold tabular-nums",
                  !hasPriceChange && "text-white/55",
                  hasPriceChange && isPositive && "text-[#7affb2]",
                  hasPriceChange && !isPositive && "text-[#ff7a93]"
                )}
              >
                {percent(token.market?.priceChange24h)}
              </span>
              <span className="whitespace-nowrap text-right font-mono tabular-nums text-white">{currency(token.market?.fdv)}</span>
              {!compact && <span className="whitespace-nowrap text-right font-mono tabular-nums text-white/85">{currency(token.market?.marketCap)}</span>}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default TokenTable;
