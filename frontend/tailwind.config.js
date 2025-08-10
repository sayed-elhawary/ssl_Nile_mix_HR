/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        'noto-sans-arabic': ['"Noto Sans Arabic"', 'sans-serif'],
      },
      colors: {
        primary: '#6D28D9',
        secondary: '#C084FC',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        background: '#F5F3FF',
        tableHeader: '#6D28D9',
      },
    },
  },
  plugins: [],
}

