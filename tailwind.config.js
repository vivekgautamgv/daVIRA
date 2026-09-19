/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#070a0f",
        darkCard: "#0d131d",
        darkBorder: "#1a2332",
        brandGreen: "#10b981",
        brandRed: "#ef4444",
        brandBlue: "#3b82f6",
        brandCyan: "#06b6d4",
        brandPurple: "#8b5cf6",
      },
    },
  },
  plugins: [],
};
