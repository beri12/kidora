// Tailwind tokens mirror theme/*.ts so className and StyleSheet code agree.
const { palette } = require('./theme/palette.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: palette.brand,
        terracotta: palette.terracotta,
        kente: palette.kente,
        savanna: palette.savanna,
        river: palette.river,
        coral: palette.coral,
        ink: palette.ink,
      },
      borderRadius: { xl: '22px', '2xl': '28px' },
    },
  },
  plugins: [],
};
