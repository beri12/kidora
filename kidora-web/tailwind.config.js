/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#F6F2FF', 100: '#F3E8FF', 200: '#EDE9FE', 300: '#DDD6FE', 400: '#C4B5FD', 500: '#A78BFA', 600: '#8B5CF6', 700: '#7C3AED', 800: '#6D28D9', 900: '#3B0764' },
        grass: { 100: '#DCFCE7', 200: '#BBF7D0', 400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D' },
        sun: { 300: '#FDE68A', 400: '#FACC15', 500: '#F59E0B', 700: '#B45309' },
        coral: { 400: '#FB7185', 500: '#F43F5E', 600: '#E11D48' },
      },
      fontFamily: {
        display: ['var(--font-baloo)', 'cursive'],
        body: ['var(--font-nunito)', 'sans-serif'],
        'body-x': ['var(--font-nunito)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 26px -12px rgba(80,40,140,.25)',
        btn: '0 10px 22px -8px rgba(109,40,217,.5)',
        'btn-g': '0 10px 22px -8px rgba(21,128,61,.45)',
      },
    keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        fadeup: { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { bob: 'bob 2.4s ease-in-out infinite' },
    },
  },
  plugins: [],
};
