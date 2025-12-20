/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ...colors, // Add all Tailwind default colors
        primary: '#7F5AF0', // Vibrant purple
        accent: '#FF5470',  // Trendy pink
        background: '#F5F7FA', // Soft light background
        foreground: '#22223B', // Deep navy for text
        gold: '#FFD700', // Luxury accent
      },
      fontFamily: {
        sans: ['Geist', 'Arial', 'Helvetica', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
