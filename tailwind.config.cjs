/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        display: ["Press Start 2P", "Space Grotesk", "ui-serif"]
      },
      colors: {
        midnight: "#040516",
        "plasma-pink": "#ff58e4",
        "plasma-cyan": "#78d4ff"
      },
      dropShadow: {
        neon: ["0 0 5px rgba(255,255,255,0.65)", "0 0 15px rgba(255,88,228,0.85)"]
      }
    }
  },
  plugins: []
};
