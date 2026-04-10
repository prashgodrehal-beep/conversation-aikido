import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0b1f3a",
          deep: "#061429",
        },
        teal: {
          DEFAULT: "#14b8a6",
          soft: "#5eead4",
        },
        amber: {
          DEFAULT: "#f59e0b",
          soft: "#fcd34d",
        },
        cream: "#fdfaf3",
        paper: "#f5efe1",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter Tight", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
