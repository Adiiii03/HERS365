/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          50:  '#F5EEFF',
          100: '#E6D6FF',
          200: '#D5BCFF',
          300: '#C4A3FF',
          400: '#A66BFF',
          500: '#8B3BFF',
          600: '#7526E8',
          700: '#5E1BC2',
          800: '#471399',
          900: '#320D70',
        },
        // LEGACY ALIAS — remove after P migration (still referenced by coral-* classes across ~9 files)
        coral: {
          50:  '#F5EEFF',
          100: '#E6D6FF',
          200: '#D5BCFF',
          300: '#C4A3FF',
          400: '#A66BFF',
          500: '#8B3BFF',
          600: '#7526E8',
          700: '#5E1BC2',
          800: '#471399',
          900: '#320D70',
        },
        pink: {
          300: '#FF6FB3',
          500: '#FF2E93',
        },
        neon: {
          500: '#39FF14',
        },
        surface: {
          DEFAULT: '#0A0A0C',
          card:    '#121216',
          hover:   '#1A1A20',
          border:  '#2A2A32',
        },
        ink: {
          DEFAULT: '#F5F5F7',
          muted:   '#A0A0AB',
          faint:   '#6B6B76',
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Barlow Condensed', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
        'slide-down':'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { '0%': { transform: 'translateY(-12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
