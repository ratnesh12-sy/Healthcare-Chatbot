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
        primary: "#00A7A7",      // Teal (Active states, buttons)
        secondary: "#0F172A",    // Navy (Sidebar, text)
        accent: "#10B981",       // Success Green
        dark: "#1E293B",         // Slate 800
        light: "#F8FAFC",        // Light Gray (Workspace Bg)
        surface: "#F0F9FF",      // Light Cyan (Sidebar/highlight backgrounds)
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
};
