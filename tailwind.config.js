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
      // Desktop workspace (console first): labels, table text, page titles and key numbers.
      label: ['11px', { lineHeight: '1.3', letterSpacing: '0.06em' }],  // uppercase data and navigation labels
      table: ['13px', { lineHeight: '1.35' }],                          // table cells and dense secondary text
      title: ['26px', { lineHeight: '1.15', letterSpacing: '-0.015em' }], // page titles (display font)
      metric: ['36px', { lineHeight: '1.05', letterSpacing: '-0.02em' }], // key numbers (display font)
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
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'], // page titles and large numbers only
      },
      borderRadius: {
        card: '12px',
        button: '10px',
        badge: '6px',
        panel: '6px', // desktop panels and inputs
        cell: '4px',  // table elements, small controls inside panels
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(15, 27, 45, 0.06)',
        // Three surface levels: page (none), panel (hairline ring + soft lift), raised card / overlay.
        panel: '0 0 0 1px rgba(15, 27, 45, 0.07), 0 1px 2px -1px rgba(15, 27, 45, 0.06), 0 2px 4px 0 rgba(15, 27, 45, 0.04)',
        raised: '0 0 0 1px rgba(15, 27, 45, 0.08), 0 2px 4px -1px rgba(15, 27, 45, 0.08), 0 8px 16px -4px rgba(15, 27, 45, 0.08)',
        overlay: '0 0 0 1px rgba(15, 27, 45, 0.08), 0 16px 40px -8px rgba(15, 27, 45, 0.28)',
        'edge-accent': 'inset 3px 0 0 #C2540F', // active navigation item and selected row
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateX(-16px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        slideInRight: { from: { transform: 'translateX(16px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        rise: { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
      },
      // Sidebar widths on the spacing scale, so both w-sidebar and pl-sidebar exist.
      spacing: {
        sidebar: '248px',
        'sidebar-rail': '72px',
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
