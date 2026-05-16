/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#070C14',
        'bg-surface': '#0D1421',
        'bg-elevated': '#131B2E',
        'bg-border': '#1C2640',
        'brand-cyan': '#00D4FF',
        'brand-violet': '#7C5CFC',
        'brand-gold': '#F2C94C',
        'bull-green': '#00C48C',
        'bear-red': '#FF4D4F',
        'neutral-yellow': '#F5A623',
        'text-primary': '#E8EDF5',
        'text-secondary': '#7B8DB0',
        'text-muted': '#3D4F6E',
        'text-inverse': '#070C14',
      },
      fontFamily: {
        'syne': ['Syne', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
        'outfit': ['Outfit', 'sans-serif'],
        'noto-devanagari': ['Noto Sans Devanagari', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px rgba(0,212,255,0.18)',
        'glow-green': '0 0 16px rgba(0,196,140,0.2)',
        'glow-red': '0 0 16px rgba(255,77,79,0.2)',
        'glow-violet': '0 0 24px rgba(124,92,252,0.18)',
        'card': '0 4px 24px rgba(0,0,0,0.3)',
      },
      borderRadius: {
        'card': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'ticker-scroll': 'ticker-scroll 60s linear infinite',
        'flash-green': 'flash-green 0.3s ease-out',
        'flash-red': 'flash-red 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-right': 'slide-right 0.3s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'ticker-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'flash-green': {
          '0%': { backgroundColor: 'rgba(0,196,140,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-red': {
          '0%': { backgroundColor: 'rgba(255,77,79,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,212,255,0.1)' },
          '50%': { boxShadow: '0 0 24px rgba(0,212,255,0.3)' },
        },
      },
    },
  },
  plugins: [],
}
