import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Paleta Leak Sniper — panel de inteligencia (oscuro + dorado)
        ink: {
          950: "#080807",
          900: "#0c0c0b",
          800: "#141413",
          700: "#1c1c1a",
          600: "#262624",
          500: "#34332f",
        },
        // Color de acento configurable (white-label) vía variables CSS.
        // Canales RGB para preservar los modificadores de opacidad (gold/40, etc.)
        gold: {
          DEFAULT: "rgb(var(--gold-500) / <alpha-value>)",
          300: "rgb(var(--gold-300) / <alpha-value>)",
          400: "rgb(var(--gold-400) / <alpha-value>)",
          500: "rgb(var(--gold-500) / <alpha-value>)",
          600: "rgb(var(--gold-600) / <alpha-value>)",
          glow: "rgb(var(--gold-500) / 0.16)",
        },
        risk: {
          alto: "#ff5d5d",
          medio: "#F5B500",
          bajo: "#5dd6a0",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgb(var(--gold-500) / 0.25), 0 0 24px rgb(var(--gold-500) / 0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
