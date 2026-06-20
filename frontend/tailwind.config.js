/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6D5AE6",        // Lilac — brand accent (was teal)
        "primary-soft": "#ECE8FB", // Lilac tint (active states, chips)
        secondary: "#3B3650",      // Calm ink (text, headings, sidebar)
        accent: "#22A97B",         // Mint (success)
        dark: "#2E2A3F",
        light: "#F5F3FB",          // Soft workspace background
        surface: "#F7F5FC",        // Soft hover / highlight surface
        muted: "#8B8597",          // Muted text
        line: "#EFEBF8",           // Soft borders / dividers
        // Pastel category tints (nested so Tailwind's default rose/sky/amber scales stay intact)
        pastel: {
          rose: "#FFE9EE", roseInk: "#F4708A",
          sky: "#E6F1FF", skyInk: "#4C9AFF",
          sun: "#FFF3DC", sunInk: "#E0A22E",
          mint: "#E3F7EE", mintInk: "#22A97B",
          lilac: "#ECE8FB", lilacInk: "#6D5AE6",
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 12px 30px rgba(109, 90, 230, 0.08)',
        'soft-sm': '0 6px 18px rgba(109, 90, 230, 0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
