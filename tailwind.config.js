/** @type {import('tailwindcss').Config} */
// The only theme file: colours, type scale, weights, radii and shadows used by every screen.
// fontSize and fontWeight replace Tailwind's defaults, so nothing outside the scale is available.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontSize: {
      xs: ['12px', { lineHeight: '1.4' }],                               // captions, nav labels
      sm: ['14px', { lineHeight: '1.4' }],                               // secondary text, badges, labels
      base: ['15px', { lineHeight: '1.4' }],                             // body, inputs, buttons
      lg: ['17px', { lineHeight: '1.25', letterSpacing: '-0.01em' }],   // card titles
      xl: ['20px', { lineHeight: '1.25', letterSpacing: '-0.01em' }],   // screen titles
      score: ['28px', { lineHeight: '1.25', letterSpacing: '-0.01em' }] // match score number only
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600'
    },
    extend: {
      colors: {
        canvas: '#F6F3EC',
        pressed: '#EFEBE2',
        surface: '#FFFFFF',
        borderSlate: '#E4E7EB',
        header: '#0F1B2D',
        navy: {
          DEFAULT: '#0F1B2D',
          muted: '#5B6675',
        },
        terracotta: {
          DEFAULT: '#C2540F',
          hover: '#A9470B',
          active: '#8E3A07',
          soft: '#F8E8DC',
        },
        civilBlue: {
          DEFAULT: '#1F6497',
          soft: '#E3EEF6',
        },
        verified: {
          DEFAULT: '#2E7D5B',
          bg: '#E6F2EC',
          border: '#A3D9C0',
        },
        pending: {
          DEFAULT: '#B7791F',
          bg: '#FBF1DF',
          border: '#E9C77F',
        },
        urgent: {
          DEFAULT: '#B3261E',
          bg: '#FBE7E5',
          border: '#F0A9A4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        button: '10px',
        badge: '6px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(15, 27, 45, 0.06)',
      },
      maxWidth: {
        app: '430px',
      },
      height: {
        header: '52px',
        status: '28px',
        nav: '56px',
      },
    },
  },
  plugins: [],
}
