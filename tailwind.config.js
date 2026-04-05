/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        kb: {
          "bg-primary": "#FFFFFF",
          "bg-secondary": "#F8F8F8",
          "bg-input": "#F1F1F1",
          "bg-msg-ai": "#FFF5F5",
          "bg-msg-user": "#E61A2B",
          accent: "#E61A2B",
          "accent-hover": "#C8102E",
          border: "#E5E5E5",
          "border-focus": "#E61A2B",
          "text-primary": "#1A1A1A",
          "text-secondary": "#555555",
          "text-muted": "#999999",
          success: "#22C55E",
          white: "#FFFFFF",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
          },
        },
      },
    },
  },
  plugins: [],
};
