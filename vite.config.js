import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'החניה שלנו', short_name: 'החניה', description: 'ניהול החניה המשותפת',
        lang: 'he', dir: 'rtl', id: '/', start_url: '/', scope: '/', display: 'standalone',
        theme_color: '#0e1728', background_color: '#f5f7fb',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg}'] },
      devOptions: { enabled: false }
    })
  ]
});
