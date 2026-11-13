import type { Config } from "tailwindcss";
import containerQueries from "@tailwindcss/container-queries";

/** HOOD TERMINAL palette. */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        asphalt: "#050806", // page background (near-black)
        concrete: "#08100B", // panels
        forest: "#14251B", // secondary surface / grid
        curb: "#1C3325", // borders
        chalk: "#D9FBE4", // primary text
        smoke: "#6E8F7A", // secondary text
        spray: "#39FF75", // neon green accent
        tag: "#39FF75",
        caution: "#FFC23D", // warnings / demo labels
        alert: "#FF4D5E", // sells / errors
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "var(--font-plex)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        block: "0 0 0 1px #39FF75, 0 0 18px -4px rgba(57,255,117,.55)",
        blockTag: "0 0 0 1px #39FF75, 0 0 18px -4px rgba(57,255,117,.55)",
        glow: "0 0 24px -6px rgba(57,255,117,.6)",
      },
    },
  },
  plugins: [containerQueries],
};
export default config;
