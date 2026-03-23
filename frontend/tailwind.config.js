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
                primary: "#00A99D",      // Teal
                secondary: "#6366f1",    // Indigo
                accent: "#27C485",       // Success Green
                dark: "#1A1A1A",         // Charcoal
                light: "#F5F7FA",        // Light Grey
            },
        },
    },
    plugins: [],
};
