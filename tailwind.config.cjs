/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "Space Grotesk", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-heading)", "Space Grotesk", "ui-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "SF Mono", "monospace"]
      },
      colors: {
        // Base backgrounds
        midnight: "var(--bg-base, #040516)",
        "panel-1": "var(--bg-panel-1, #060017)",
        "panel-2": "var(--bg-panel-2, #0c0d23)",
        "panel-3": "var(--bg-panel-3, #050018)",
        
        // Accent colors
        "plasma-pink": "var(--accent-primary, #ff58e4)",
        "plasma-cyan": "var(--accent-tertiary, #78d4ff)",
        accent: {
          primary: "var(--accent-primary, #ff58e4)",
          secondary: "var(--accent-secondary, #a14bff)",
          tertiary: "var(--accent-tertiary, #78d4ff)",
          heading: "var(--accent-heading, #ff9cf5)",
          link: "var(--accent-link, #78d4ff)"
        },
        
        // Status colors
        status: {
          positive: "var(--status-positive, #7affb2)",
          negative: "var(--status-negative, #ff7a93)",
          warning: "var(--status-warning, #fcd587)"
        },
        
        // Chain badge colors
        chain: {
          eth: "var(--chain-eth)",
          base: "var(--chain-base)",
          sol: "var(--chain-sol)"
        },
        
        // Border colors
        border: {
          subtle: "var(--border-subtle, rgba(255,255,255,0.1))",
          panel: "var(--border-panel, rgba(255,255,255,0.08))"
        }
      },
      borderRadius: {
        panel: "var(--radius-panel, 20px)",
        card: "var(--radius-card, 16px)"
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        glow: "var(--shadow-glow)"
      },
      dropShadow: {
        neon: ["0 0 5px rgba(255,255,255,0.65)", "0 0 15px rgba(255,88,228,0.85)"]
      }
    }
  },
  plugins: []
};
