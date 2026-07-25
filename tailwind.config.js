/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F8FC",
        surface: "#FFFFFF",
        ink: "#101828",
        muted: "#667085",
        line: "#E4E7EC",
        broadcast: {
          DEFAULT: "#E11D48",
          bright: "#FB7185",
          fog: "#FFE4E8",
        },
        ok: "#15803D",
        warn: "#B45309",
        danger: "#DC2626",
      },
      fontFamily: {
        display: ["Syne", "Figtree", "sans-serif"],
        sans: ["Figtree", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 10px 30px -18px rgba(16, 24, 40, 0.28)",
      },
    },
  },
  plugins: [],
};
