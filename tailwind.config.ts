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
        petala: {
          50:  '#e8f9ec',
          100: '#c6f0d0',
          200: '#9ce5b0',
          300: '#6dd98e',
          400: '#43cc6e',
          500: '#1eb740',
          600: '#189834',
          700: '#127829',
          800: '#0d5a1f',
          900: '#073c14',
          950: '#031f0a',
        },
        surface: {
          DEFAULT: '#0f1117',
          50:  '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e2',
          300: '#b0b8c9',
          400: '#8590ab',
          500: '#667291',
          600: '#515b78',
          700: '#434a62',
          800: '#3a4053',
          900: '#333847',
          950: '#1a1d28',
        },
        accent: {
          blue:   '#3b82f6',
          purple: '#8b5cf6',
          amber:  '#f59e0b',
          rose:   '#f43f5e',
          cyan:   '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(30, 183, 64, 0.15)',
        'glow':    '0 0 25px -5px rgba(30, 183, 64, 0.2)',
        'glow-lg': '0 0 40px -8px rgba(30, 183, 64, 0.3)',
        'card':    '0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        skeleton: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
