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
        brand: {
          50:  "#f0f4ff",
          100: "#dce6ff",
          500: "#3b5bdb",
          600: "#2f4ac3",
          700: "#2340b0",
          900: "#1a2e80",
        },
        ink: {
          DEFAULT: "#1a1611",
          2: "#43403a",
          3: "#807a70",
        },
        brass: {
          DEFAULT: "#b89042",
          light: "#d4aa6a",
          dark: "#8a6a2a",
        },
        burgundy: {
          DEFAULT: "#8b1a1a",
          light: "#b03030",
          dark: "#5c1010",
        },
        "bs-green": {
          DEFAULT: "#1f4d3a",
          light: "#2d6b52",
        },
        parchment: "#f4f3ef",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        lora: ["var(--font-lora)", "Lora", "Georgia", "serif"],
        mono: ["var(--font-dm-mono)", "DM Mono", "ui-monospace", "monospace"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
