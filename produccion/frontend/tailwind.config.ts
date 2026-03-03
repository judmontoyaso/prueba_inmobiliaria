import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:  "#0d2b4a",
        accent:   "#bf8030",
        surface:  "#ffffff",
        border:   "#dce1ea",
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(13,43,74,0.07), 0 4px 18px rgba(13,43,74,0.05)",
        "card-hover": "0 2px 8px rgba(13,43,74,0.10), 0 8px 28px rgba(13,43,74,0.08)",
      },
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
      },
    },
  },
};

export default config;
