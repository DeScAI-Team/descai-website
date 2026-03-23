/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "Space Grotesk", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-heading)", "Space Grotesk", "ui-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "IBM Plex Mono", "ui-monospace", "monospace"]
      },
      colors: {
        /* Legacy colors for backwards compatibility */
        midnight: "var(--bg-base)",
        "plasma-pink": "#ff58e4",
        "plasma-cyan": "#78d4ff",
        
        /* Theme-aware semantic colors */
        surface: {
          base: "var(--bg-base)",
          sidebar: "var(--bg-sidebar)",
          main: "var(--bg-main)",
          rail: "var(--bg-rail)",
          card: "var(--bg-card)",
          "card-hover": "var(--bg-card-hover)",
          subtle: "var(--bg-subtle)",
          elevated: "var(--bg-elevated)"
        },
        accent: {
          primary: "var(--accent-primary)",
          "primary-dim": "var(--accent-primary-dim)",
          secondary: "var(--accent-secondary)",
          tertiary: "var(--accent-tertiary)",
          highlight: "var(--accent-highlight)",
          link: "var(--accent-link)"
        },
        border: {
          DEFAULT: "var(--border-default)",
          subtle: "var(--border-subtle)",
          accent: "var(--border-accent)",
          panel: "var(--border-panel)"
        },
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          subtle: "var(--text-subtle)",
          dim: "var(--text-dim)",
          accent: "var(--text-accent)",
          link: "var(--text-link)"
        },
        status: {
          positive: "var(--status-positive)",
          negative: "var(--status-negative)",
          warning: "var(--status-warning)",
          info: "var(--status-info)"
        },
        chain: {
          eth: "var(--chain-eth)",
          base: "var(--chain-base)",
          sol: "var(--chain-sol)",
          arb: "var(--chain-arb)",
          DEFAULT: "var(--chain-default)"
        }
      },
      boxShadow: {
        panel: "var(--glow-panel)",
        featured: "var(--glow-featured)",
        "card-inset": "inset 0 0 20px rgba(255, 255, 255, 0.03)"
      },
      dropShadow: {
        neon: ["0 0 5px rgba(255,255,255,0.65)", "0 0 15px rgba(255,88,228,0.85)"]
      },
      /* Font feature settings for tabular numbers */
      fontVariantNumeric: {
        tabular: "tabular-nums"
      }
    }
  },
  plugins: []
};
