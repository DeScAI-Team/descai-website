import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import clsx from "clsx";
import { platformGroups, newsItems, projectTokens } from "@/data/content";

/**
 * Theme Comparison Stories
 * 
 * This story file demonstrates the two theme variants side by side:
 * - "Current" (original): Purple/magenta gradient aesthetic with neon glows
 * - "Refresh" (new): Professional fintech look with teal accent, near-black background
 * 
 * Use the theme switcher in the Storybook toolbar to compare variants.
 * 
 * Key changes in "Refresh" theme:
 * - Background: Near-black (#0d0d0f) instead of purple gradient
 * - Accent: Teal/cyan (#00e5cc) instead of magenta
 * - Typography: Space Grotesk for headings (no pixel font)
 * - Monospace: JetBrains Mono for financial data
 * - Borders: Thin white borders instead of colored glows
 * - Chain badges: Chain-specific colors (ETH purple, BASE blue, SOL green)
 * - Price changes: Pill badges with background tints
 */

type ThemeVariant = "current" | "refresh";

// Helper to apply theme class
const ThemeWrapper = ({ theme, children, className }: { theme: ThemeVariant; children: React.ReactNode; className?: string }) => {
  useEffect(() => {
    document.documentElement.classList.remove("theme-current", "theme-refresh");
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <div className={clsx("bg-surface-base text-content-primary", className)}>
      {children}
    </div>
  );
};

// Sample token data for table demo
const sampleTokens = [
  { symbol: "$VITA", name: "VitaDAO", chain: "eth", price: 0.6544, change: 4.24, fdv: 65440000 },
  { symbol: "$AUBRAI", name: "AubrAI", chain: "base", price: 7.27, change: -7.96, fdv: 72700000 },
  { symbol: "$RSC", name: "ResearchCoin", chain: "eth", price: 0.2351, change: -5.8, fdv: 23510000 },
  { symbol: "$RAPTOR", name: "SMER28", chain: "sol", price: 0.02245, change: 2.0, fdv: 2245000 },
  { symbol: "$BIO", name: "Bio Protocol", chain: "eth", price: 0.07187, change: -6.25, fdv: 7187000 },
  { symbol: "$HAIR", name: "HairDAO", chain: "arb", price: 0.1842, change: 3.15, fdv: 18420000 }
];

const getChainAttr = (chain: string) => {
  if (chain.includes("eth")) return "eth";
  if (chain.includes("base")) return "base";
  if (chain.includes("sol")) return "sol";
  if (chain.includes("arb")) return "arb";
  return chain;
};

const meta: Meta = {
  title: "Theme/Visual Comparison",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
## DeScAI Visual Refresh

This storybook showcases the visual styling improvements to make the site feel more like a professional financial/research tool.

### Theme Variants

| Aspect | Current | Refresh |
|--------|---------|---------|
| Background | Purple/magenta gradient (#040516) | Near-black solid (#0d0d0f) |
| Primary Accent | Magenta (#ff44ff) | Teal (#00e5cc) |
| Headings | Audiowide (pixel font) + neon glow | Space Grotesk (clean sans-serif) |
| Numeric Data | Default font | JetBrains Mono (tabular-nums) |
| Borders | Gradient glow borders | Thin white borders (15% opacity) |
| Chain Badges | Uniform gray | Chain-specific colors |
| Price Changes | Text only | Pill badges with tinted background |

### Font Dependencies

- **Space Grotesk** - Primary sans-serif for body and headings
- **Inter** - Fallback sans-serif
- **JetBrains Mono** - Monospace for financial data (prices, FDV, tickers)
- **Audiowide** - Legacy neon heading font (current theme only)
        `
      }
    }
  }
};

export default meta;

type Story = StoryObj;

// Panel Component Demo
const PanelDemo = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-content-primary">Panel Styles</h3>
    <div className="grid gap-4 md:grid-cols-2">
      <article className="panel-border">
        <div className="panel-inner p-5">
          <div className="text-center">
            <h4 className="neon-heading">Section Heading</h4>
            <span className="neon-underline" />
          </div>
          <p className="mt-4 text-sm text-content-muted">
            Panel with standard border treatment. Notice the border style changes between themes.
          </p>
        </div>
      </article>
      
      <article className="rounded-[16px] border border-border-panel bg-surface-card p-5 shadow-panel">
        <div className="text-center">
          <h4 className="neon-heading text-[0.85rem]">Card Style</h4>
          <span className="neon-underline" />
        </div>
        <p className="mt-4 text-sm text-content-muted">
          Simple card without gradient border, using surface colors.
        </p>
      </article>
    </div>
  </div>
);

// Token Table Demo
const TokenTableDemo = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-content-primary">Token Table</h3>
    <p className="text-sm text-content-muted">
      Financial data with monospace fonts, right-aligned numbers, alternating rows, and chain-specific badges.
    </p>
    
    <div className="rounded-[14px] border border-border bg-surface-card p-4">
      {/* Header */}
      <div className="grid grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr_0.9fr] gap-2 px-3 text-[0.65rem] uppercase tracking-[0.12em] text-content-muted mb-2">
        <span>Token</span>
        <span>Chain</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h</span>
        <span className="text-right">FDV</span>
      </div>
      
      {/* Rows */}
      <div className="space-y-1">
        {sampleTokens.map((token, idx) => (
          <div
            key={token.symbol}
            className={clsx(
              "data-table-row grid grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr_0.9fr] items-center gap-2 rounded-[10px] px-3 py-2.5",
              idx % 2 === 0 ? "bg-[var(--table-row-bg)]" : "bg-[var(--table-row-bg-alt)]"
            )}
          >
            <div className="min-w-0">
              <p className="token-ticker truncate font-semibold text-accent-highlight">{token.symbol}</p>
              <p className="truncate text-xs text-content-subtle">{token.name}</p>
            </div>
            <span className="chain-badge" data-chain={getChainAttr(token.chain)}>
              {token.chain.toUpperCase()}
            </span>
            <span className="numeric-column text-content-primary">${token.price.toFixed(4)}</span>
            <span className={clsx("price-change text-right", token.change >= 0 ? "positive" : "negative")}>
              {token.change >= 0 ? "+" : ""}{token.change.toFixed(2)}%
            </span>
            <span className="numeric-column text-content-secondary">
              ${(token.fdv / 1_000_000).toFixed(2)}M
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Typography Demo
const TypographyDemo = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-content-primary">Typography</h3>
    
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-content-muted">Headings</h4>
        <div className="space-y-2">
          <p className="neon-heading">Section Heading</p>
          <p className="featured-chip text-lg">Featured Title</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-content-muted">Financial Data</h4>
        <div className="space-y-2">
          <p className="font-mono text-lg tabular-nums text-content-primary">$1,234,567.89</p>
          <p className="token-ticker text-accent-highlight">$VITA-FAST</p>
          <div className="flex gap-4">
            <span className="price-change positive">+12.45%</span>
            <span className="price-change negative">-8.32%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Color Palette Demo
const ColorPaletteDemo = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-content-primary">Color Palette</h3>
    
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-content-muted">Accents</h4>
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-lg bg-accent-primary" title="Primary" />
          <div className="h-10 w-10 rounded-lg bg-accent-secondary" title="Secondary" />
          <div className="h-10 w-10 rounded-lg bg-accent-tertiary" title="Tertiary" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-content-muted">Surfaces</h4>
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-lg border border-border bg-surface-base" title="Base" />
          <div className="h-10 w-10 rounded-lg border border-border bg-surface-card" title="Card" />
          <div className="h-10 w-10 rounded-lg border border-border bg-surface-elevated" title="Elevated" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-content-muted">Status</h4>
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-lg bg-status-positive" title="Positive" />
          <div className="h-10 w-10 rounded-lg bg-status-negative" title="Negative" />
          <div className="h-10 w-10 rounded-lg bg-status-warning" title="Warning" />
          <div className="h-10 w-10 rounded-lg bg-status-info" title="Info" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-content-muted">Chain Colors</h4>
        <div className="flex gap-2">
          <span className="chain-badge" data-chain="eth">ETH</span>
          <span className="chain-badge" data-chain="base">BASE</span>
          <span className="chain-badge" data-chain="sol">SOL</span>
        </div>
      </div>
    </div>
  </div>
);

// Platform List Demo
const PlatformListDemo = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-content-primary">Platform List</h3>
    
    <div className="panel-border max-w-xs">
      <div className="panel-inner p-4">
        <div className="text-center mb-3">
          <h4 className="neon-heading text-[0.75rem]">By Platform</h4>
          <span className="neon-underline" />
        </div>
        
        <div className="space-y-2">
          {platformGroups.slice(0, 2).map((group) => (
            <div key={group.title} className="rounded-[10px] border border-border bg-surface-subtle p-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-highlight">
                {group.title}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-content-muted">
                {group.items.slice(0, 3).map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-accent-primary opacity-60" />
                    <span>{item.replace(/^>\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// News/Insights Demo
const InsightsDemo = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-content-primary">Latest Insights</h3>
    
    <div className="panel-border max-w-md">
      <div className="panel-inner p-4">
        <div className="text-center mb-3">
          <h4 className="neon-heading text-[0.75rem]">Latest</h4>
          <span className="neon-underline" />
        </div>
        
        <div className="divide-y divide-border">
          {newsItems.slice(0, 2).map((news) => (
            <article key={news.title} className="py-3">
              <header className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-accent-highlight">{news.title}</p>
                <span className="font-mono text-[0.6rem] text-content-subtle">{news.score}</span>
              </header>
              <p className="mt-1.5 text-xs text-content-muted line-clamp-2">{news.body}</p>
              <div className="mt-2 flex gap-3 text-[0.6rem] uppercase tracking-[0.2em] text-content-dim">
                <span>{news.platform}</span>
                <span>{news.field}</span>
                <span>{news.date}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Error Banner Demo
const ErrorBannerDemo = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-content-primary">Error States</h3>
    <p className="text-sm text-content-muted">
      Error banners are more subtle in the Refresh theme to avoid dominating the UI.
    </p>
    
    <div className="space-y-3 max-w-md">
      <div className="error-banner">
        Failed to fetch data — showing cached results.
      </div>
      
      <div className="rounded-[10px] border border-status-warning/25 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
        <p className="font-semibold">Cached discovery data in use: 45 tokens.</p>
        <p className="mt-1 opacity-85">Live API temporarily unavailable.</p>
      </div>
    </div>
  </div>
);

// Main comparison story
export const FullComparison: Story = {
  render: () => (
    <div className="min-h-screen space-y-12 p-8">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-content-primary">DeScAI Visual Refresh</h1>
        <p className="text-content-muted">
          Use the theme switcher in the toolbar above to compare "Current" vs "Refresh" themes.
        </p>
      </header>
      
      <div className="mx-auto max-w-5xl space-y-12">
        <ColorPaletteDemo />
        <TypographyDemo />
        <TokenTableDemo />
        <PanelDemo />
        
        <div className="grid gap-8 lg:grid-cols-2">
          <PlatformListDemo />
          <InsightsDemo />
        </div>
        
        <ErrorBannerDemo />
      </div>
    </div>
  )
};

export const TokenTableOnly: Story = {
  render: () => (
    <div className="p-8">
      <TokenTableDemo />
    </div>
  )
};

export const PanelsOnly: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <PanelDemo />
      <div className="grid gap-8 lg:grid-cols-2">
        <PlatformListDemo />
        <InsightsDemo />
      </div>
    </div>
  )
};

export const TypographyOnly: Story = {
  render: () => (
    <div className="p-8">
      <TypographyDemo />
    </div>
  )
};

export const ColorPaletteOnly: Story = {
  render: () => (
    <div className="p-8">
      <ColorPaletteDemo />
    </div>
  )
};
