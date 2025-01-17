import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
          name: 'My Progressive Web App',
          short_name: 'MyPWA',
          description: 'My awesome PWA',
          theme_color: '#ffffff',
          icons: [
              {
                  src: '/icons/icon-192x192.png',
                  sizes: '192x192',
                  type: 'image/png'
              },
              {
                  src: '/icons/icon-512x512.png',
                  sizes: '512x512',
                  type: 'image/png'
              }
          ]
      },
      workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
  })
  ],
  server: {
    port: 3000,
    headers: {
      // 'Content-Type': 'application/javascript',
    }
  },
  build: {
    target: 'esnext',
  },
});
