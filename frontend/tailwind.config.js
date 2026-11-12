/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sarura: {
          green: {
            DEFAULT: "#247A45",
            dark: "#185C35",
            light: "#E8F5E9",
          },
          page: "#F4F6F4",
          border: "#DCE3DD",
          gray: "#5F6B63",
          ink: "#24332B",
          red: "#DC2626",
          amber: "#B45309",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(36, 51, 43, 0.06)",
      },
    },
  },
  plugins: [],
};
