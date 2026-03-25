/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0a2a30',
          50: '#e6f3f5',
          100: '#cce7eb',
          200: '#99cfd7',
          300: '#66b7c3',
          400: '#339faf',
          500: '#0a2a30',
          600: '#082228',
          700: '#061a1f',
          800: '#041317',
          900: '#020b0e',
        },
        accent: {
          DEFAULT: '#164a54',
          50: '#e6f4f5',
          100: '#cce9eb',
          200: '#99d3d7',
          300: '#66bdc3',
          400: '#33a7af',
          500: '#164a54',
          600: '#123d45',
          700: '#0d2f36',
          800: '#092227',
          900: '#041418',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
