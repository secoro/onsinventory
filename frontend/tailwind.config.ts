import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a"
        }
      },
      boxShadow: {
        glow: "0 10px 30px -10px rgba(59, 130, 246, 0.45)"
      }
    }
  },
  plugins: []
} satisfies Config;
