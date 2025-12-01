import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="vscode-dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "rgba(255,255,255,0.8)",
          dark: "rgba(20,20,20,0.75)",
        },
        foreground: {
          DEFAULT: "#0f172a",
          dark: "#f8fafc",
        },
        accent: "#2dd4bf",
        indigo: {
          500: "#6366f1",
        },
        glass: "rgba(15, 23, 42, 0.1)",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 10px 30px rgba(15, 23, 42, 0.15)",
      },
      borderRadius: {
        glass: "22px",
      },
      fontFamily: {
        sans: ["'SF Pro Display'", "'Inter'", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};

export default config;
