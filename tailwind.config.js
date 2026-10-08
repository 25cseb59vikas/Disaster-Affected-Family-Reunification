/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F3EC',
        surface: '#FFFDF8',
        borderSlate: '#D9DEE4',
        navy: {
          DEFAULT: '#0F1B2D',
          muted: '#44505F',
        },
        terracotta: {
          DEFAULT: '#C2540F',
          hover: '#A9470B',
          active: '#8E3A07',
        },
        civilBlue: {
          DEFAULT: '#1F6497',
          hover: '#184F77',
        },
        verified: {
          DEFAULT: '#2E7D5B',
          bg: '#E8F5E9',
          border: '#A3D9C0',
        },
        pending: {
          DEFAULT: '#B7791F',
          bg: '#FEF3C7',
          border: '#FCD34D',
        },
        urgent: {
          DEFAULT: '#B3261E',
          bg: '#FEE2E2',
          border: '#FCA5A5',
        },
      },
      fontFamily: {
        sans: ['"Public Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'badge': '4px',
        'input': '8px',
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
