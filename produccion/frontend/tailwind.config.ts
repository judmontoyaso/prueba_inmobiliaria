import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "rgba(255,255,255,0.04)",
        "surface-2": "rgba(255,255,255,0.07)",
      },
      backdropBlur: {
        xs: "4px",
      },
      boxShadow: {
        glow: "0 0 24px rgba(129,140,248,0.35)",
        "glow-cyan": "0 0 24px rgba(34,211,238,0.3)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
};

export default config;
