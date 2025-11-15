import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-locales',
      closeBundle() {
        // Copy locales to dist
        const locales = ['nl', 'en'];
        locales.forEach((locale) => {
          try {
            const targetDir = resolve(__dirname, `dist/locales/${locale}`);
            mkdirSync(targetDir, { recursive: true });
            copyFileSync(
              resolve(__dirname, `public/locales/${locale}/common.json`),
              resolve(__dirname, `dist/locales/${locale}/common.json`)
            );
          } catch (error) {
            console.warn(`Failed to copy locale ${locale}:`, error);
          }
        });
      }
    }
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  },
  publicDir: 'public'
});
