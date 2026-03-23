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

const platformLabel = (token: TokenWithMarketData) => {
  if (token.platforms.length) return token.platforms.join(" / ");
  return token.platform;
};

const currency = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (Math.abs(value) < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
};

const adaptivePrice = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1) return `$${value.toFixed(3)}`;
  if (Math.abs(value) >= 0.01) return `$${value.toFixed(4)}`;
  if (Math.abs(value) >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(8)}`;
};

const percent = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const sortArrow = (field: TokenSortField, sort: SortState) => {
  if (sort.field !== field) return "↕";
  return sort.direction === "asc" ? "↑" : "↓";
};

/** Get chain-specific data attribute for CSS styling */
const getChainDataAttr = (chain: string): string => {
  const normalized = chain.toLowerCase();
  if (normalized.includes("eth")) return "eth";
  if (normalized.includes("base")) return "base";
  if (normalized.includes("sol")) return "sol";
  if (normalized.includes("arb")) return "arb";
  return normalized;
};

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
  align?: "left" | "right";
}) => (
  <button
    type="button"
    className={clsx(
      "flex items-center gap-1 uppercase tracking-[0.12em] text-content-muted transition hover:text-content-primary text-[0.65rem]",
      align === "right" && "justify-end"
    )}
    onClick={() => onSortChange(field)}
  >
    <span>{label}</span>
    <span aria-hidden className="text-[0.6rem] text-content-dim">
      {sortArrow(field, sort)}
    </span>
  </button>
);

const TokenTable = ({ tokens, sort, onSortChange, compact = false, showPlatform = true, emptyMessage }: TokenTableProps) => {
  if (!tokens.length) {
    return (
      <p className="rounded-[12px] border border-border bg-surface-subtle p-4 text-sm text-content-muted">
        {emptyMessage ?? "No tokens available."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Table Header */}
      <div
        className={clsx(
          "grid gap-2 px-3 text-left",
          compact ? "grid-cols-[1.45fr_0.85fr_0.9fr_0.8fr_0.95fr]" : "grid-cols-[1.3fr_0.9fr_0.8fr_0.9fr_0.9fr_0.9fr]",
          showPlatform && !compact && "grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr]"
        )}
      >
        <SortButton field="symbol" label="Token" sort={sort} onSortChange={onSortChange} />
        {showPlatform && !compact && <SortButton field="platform" label="Platform" sort={sort} onSortChange={onSortChange} />}
        <SortButton field="chain" label="Chain" sort={sort} onSortChange={onSortChange} />
        <SortButton field="price" label="Price" sort={sort} onSortChange={onSortChange} align="right" />
        <SortButton field="priceChange24h" label="24h" sort={sort} onSortChange={onSortChange} align="right" />
        <SortButton field="fdv" label="FDV" sort={sort} onSortChange={onSortChange} align="right" />
        {!compact && <SortButton field="marketCap" label="MCap" sort={sort} onSortChange={onSortChange} align="right" />}
      </div>

      {/* Table Body */}
      <div className="space-y-1 text-sm">
        {tokens.map((token, index) => {
          const isPositive = (token.market?.priceChange24h ?? 0) >= 0;
          const chainAttr = getChainDataAttr(token.chain);
          
          return (
            <article
              key={token.id}
              className={clsx(
                "data-table-row grid items-center gap-2 rounded-[10px] px-3 py-2.5 text-left transition-colors",
                compact ? "grid-cols-[1.45fr_0.85fr_0.9fr_0.8fr_0.95fr]" : "grid-cols-[1.3fr_0.9fr_0.8fr_0.9fr_0.9fr_0.9fr]",
                showPlatform && !compact && "grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr]",
                /* Alternating row shading via CSS variable or class */
                index % 2 === 0 
                  ? "bg-[var(--table-row-bg)]" 
                  : "bg-[var(--table-row-bg-alt)]"
              )}
            >
              {/* Token name/symbol */}
              <div className="min-w-0">
                <p className="token-ticker truncate font-semibold text-accent-highlight">
                  {token.symbol}
                </p>
                <p className="truncate text-xs text-content-subtle">{token.name}</p>
              </div>

              {/* Platform badge */}
              {showPlatform && !compact && (
                <span className="rounded-full bg-surface-elevated px-2 py-1 text-center text-[0.6rem] uppercase tracking-[0.1em] text-content-muted">
                  {platformLabel(token)}
                </span>
              )}

              {/* Chain badge with chain-specific colors */}
              <span 
                className="chain-badge"
                data-chain={chainAttr}
              >
                {token.chain.toUpperCase()}
              </span>

              {/* Price - right aligned, monospace */}
              <span className="numeric-column whitespace-nowrap text-content-primary">
                {adaptivePrice(token.market?.price)}
              </span>

              {/* 24h change - pill badge style */}
              <span 
                className={clsx(
                  "price-change whitespace-nowrap text-right",
                  isPositive ? "positive" : "negative"
                )}
              >
                {percent(token.market?.priceChange24h)}
              </span>

              {/* FDV - right aligned, monospace */}
              <span className="numeric-column whitespace-nowrap text-content-primary">
                {currency(token.market?.fdv)}
              </span>

              {/* Market Cap - right aligned, monospace */}
              {!compact && (
                <span className="numeric-column whitespace-nowrap text-content-secondary">
                  {currency(token.market?.marketCap)}
                </span>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default TokenTable;
