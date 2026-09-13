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

        // Dashboard tokens. The dashboard components have always referenced
        // these (text-muted alone appears 286 times), but they were never
        // defined here — so Tailwind emitted nothing for them and every
        // secondary label, status colour and card border fell back to
        // inheriting the body's purple.
        ink: '#1E1B4B',
        muted: '#64748B',
        surface: '#F8FAFC',
        line: '#E2E8F0',
        success: { 50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC', 400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D', 800: '#166534' },
        danger: { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#F87171', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C', 800: '#991B1B' },
        warning: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706', 700: '#B45309', 800: '#92400E' },
        info: { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF' },
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
