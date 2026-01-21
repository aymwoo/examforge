import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#E2E8F0",
        background: "#F8FAFC",
        foreground: "#0F172A",
        primary: {
          DEFAULT: "#0F172A",
          foreground: "#F8FAFC",
        },
        secondary: {
          DEFAULT: "#F1F5F9",
          foreground: "#0F172A",
        },
        accent: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FEF08A",
          400: "#FDE047",
          500: "#FCD34D",
          600: "#F97316",
          700: "#EA580C",
        },
        ink: {
          950: "#020617",
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
        },
        slatebg: "#F8FAFC",
        link: {
          700: "#0369A1",
          800: "#075985",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.875rem",
        sm: "0.75rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(2,6,23,.10)",
        lift: "0 16px 40px rgba(2,6,23,.14)",
      },
    },
  },
  plugins: [],
} satisfies Config;
