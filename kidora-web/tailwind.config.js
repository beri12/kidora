/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#F6F2FF', 100: '#F3E8FF', 200: '#EDE9FE', 300: '#DDD6FE', 400: '#C4B5FD', 500: '#A78BFA', 600: '#8B5CF6', 700: '#7C3AED', 800: '#6D28D9', 900: '#3B0764' },
        // Kidora auth / landing primary (the purple of the sign-up designs).
        iris: { 50: '#F3F0FF', 100: '#E9E3FF', 200: '#D5CBFF', 300: '#B7A6FF', 400: '#8F77FB', 500: '#6E52F5', 600: '#5B3CF0', 700: '#4B2ED6', 800: '#3D25AE', 900: '#2A1A78' },
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

        // --- auth flow motion -------------------------------------------
        // Cards, rows and steps entering.
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-down': { from: { opacity: '0', transform: 'translateY(-10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        // Steps sliding sideways as the wizard advances / goes back.
        'slide-in-right': { from: { opacity: '0', transform: 'translateX(32px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'slide-in-left': { from: { opacity: '0', transform: 'translateX(-32px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        // A filled OTP box, a selected country, a picked role.
        pop: { '0%': { transform: 'scale(.85)' }, '60%': { transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)' } },
        // Wrong code.
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
        // Decorative background blobs.
        float: { '0%,100%': { transform: 'translateY(0) rotate(0deg)' }, '50%': { transform: 'translateY(-18px) rotate(6deg)' } },
        // Loading skeleton / button sheen.
        shimmer: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(200%)' } },
        // Pulsing halo around the active input.
        halo: { '0%,100%': { boxShadow: '0 0 0 0 rgba(139,92,246,.45)' }, '50%': { boxShadow: '0 0 0 12px rgba(139,92,246,0)' } },
        // Success check drawing itself.
        'draw-check': { from: { strokeDashoffset: '48' }, to: { strokeDashoffset: '0' } },
        // Slow drift on the gradient panel.
        'gradient-pan': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
      },
      animation: {
        bob: 'bob 2.4s ease-in-out infinite',
        'fade-in': 'fade-in .35s ease-out both',
        'slide-up': 'slide-up .45s cubic-bezier(.22,1,.36,1) both',
        'slide-down': 'slide-down .3s cubic-bezier(.22,1,.36,1) both',
        'slide-in-right': 'slide-in-right .4s cubic-bezier(.22,1,.36,1) both',
        'slide-in-left': 'slide-in-left .4s cubic-bezier(.22,1,.36,1) both',
        pop: 'pop .25s cubic-bezier(.34,1.56,.64,1) both',
        shake: 'shake .45s ease-in-out',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        halo: 'halo 1.8s ease-out infinite',
        'draw-check': 'draw-check .5s ease-out .1s both',
        'gradient-pan': 'gradient-pan 12s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
