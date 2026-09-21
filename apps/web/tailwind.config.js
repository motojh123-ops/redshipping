/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        slate: {
          800: '#1E2638',
          850: '#181D2A',
          900: '#121620',
          950: '#0B0E14',
        },
        fleet: {
          orange: '#FF5E1E',
          'orange-hover': '#FF7034',
          'orange-glow': 'rgba(255, 94, 30, 0.25)',
          dark: '#0B0E14',
          surface: '#121620',
          card: '#181D2A',
          card2: '#1F2536',
          border: '#262E40',
          light: '#F8F9FC',
          lightCard: '#FFFFFF',
          lightBorder: '#E5E7EB',
        },
        navy: {
          800: '#1E2638',
          900: '#121620',
          950: '#0B0E14',
        }
      },
      boxShadow: {
        'glow-orange': '0 0 25px -3px rgba(255, 94, 30, 0.35)',
        'glow-subtle': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      fontFamily: {
        sans: ['"Thmanya Sans"', 'Thmanya', 'Outfit', 'Inter', 'Cairo', 'sans-serif'],
        primary: ['"Thmanya Sans"', 'Thmanya', 'sans-serif'],
        secondary: ['"Ghaith Sans"', 'Ghaith', 'Outfit', 'sans-serif'],
        ghaith: ['"Ghaith Sans"', 'Ghaith', 'sans-serif'],
        display: ['"Thmanya Serif"', '"Thmanya Sans"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [
    require('tailwindcss-rtl'),
  ],
}
