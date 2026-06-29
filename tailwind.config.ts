import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        berry: "#a83267",
        coral: "#ff6b6b",
        mint: "#4ecdc4",
        ink: "#25313f",
        sunshine: "#ffd166",
        lilac: "#7b61ff"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(37, 49, 63, 0.13)"
      }
    }
  },
  plugins: []
};

export default config;
