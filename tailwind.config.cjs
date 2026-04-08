/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Space Grotesk", "Sora", "system-ui", "sans-serif"],
        display: ["Sora", "Space Grotesk", "system-ui", "sans-serif"]
      },
      colors: {
        midnight: "#12182b",
        "plasma-pink": "#8fb4ff",
        "plasma-cyan": "#6ed7ff"
      },
      dropShadow: {
        neon: ["0 0 4px rgba(255,255,255,0.3)", "0 0 12px rgba(110,215,255,0.24)"]
      }
    }
  },
  plugins: []
};
