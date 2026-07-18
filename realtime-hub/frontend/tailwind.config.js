/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f1115',
        panel: '#171a21',
        accent: '#22d3ee',
      },
    },
  },
  plugins: [],
};
