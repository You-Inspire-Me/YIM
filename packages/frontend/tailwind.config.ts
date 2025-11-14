import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#000000',     // Zwart
        secondary: '#FFFFFF',   // Wit
        accent: '#F5F5F5',      // Lichtgrijs (cards, hover)
        muted: '#666666',       // Subtiele tekst
        border: '#E5E5E5',      // Subtiele lijnen
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"GT America"', 'Inter', 'sans-serif'],
      },
      backgroundColor: {
        DEFAULT: '#FFFFFF',
        dark: '#000000',
      },
      textColor: {
        DEFAULT: '#000000',
        light: '#666666',
        dark: '#FFFFFF',
      },
      borderColor: {
        DEFAULT: '#E5E5E5',
      }
    }
  },
  plugins: []
};

export default config;
