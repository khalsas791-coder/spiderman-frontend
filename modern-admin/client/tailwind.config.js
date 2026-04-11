/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'spider-red': '#ff3347',
        'spider-blue': '#00aaff',
        'spider-dark': '#05060b',
        'spider-light': '#161a2b',
      }
    },
  },
  plugins: [],
}
