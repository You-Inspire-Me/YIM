import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        yim: {
          primary: '#0EA5E9',
          'primary-hover': '#0284C7',
          background: '#FFFFFF',
          'subtle-tint': '#F8FAFC',
          border: '#E2E8F0',
          'text-primary': '#1E293B',
          'text-secondary': '#64748B',
          success: '#10B981'
        },
        brand: {
          DEFAULT: '#0EA5E9'
        },
        primary: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E'
        },
        accent: {
          DEFAULT: '#0EA5E9',
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1'
        },
        background: {
          DEFAULT: '#FFFFFF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Playfair Display', 'serif']
      }
    }
  },
  plugins: []
};

export default config;
