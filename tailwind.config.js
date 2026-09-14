/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EFECDF',
        ink: '#1F2A33',
        rule: '#C9C1A6',
        alert: '#B8452E',
        stable: '#3F6B4F',
      },
      fontFamily: {
        display: ['"Spectral"', 'serif'],
        sans: ['"IBM Plex Sans"', '"Noto Sans TC"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backgroundImage: {
        'flowsheet-grid':
          'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(31,42,51,0.05) 28px)',
      },
    },
  },
  plugins: [],
};
