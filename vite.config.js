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
          name: 'Food Facts App',
          short_name: 'Food Facts',
          description: 'Simple OpenFoodFacts api call application using barcode scanner to identify ean numbers and fetch nutrition data.',
          theme_color: '#8936FF',
          icons: [
              {
                  purpose: 'maskable',
                  src: "/icons/icon512_maskable.png",
                  sizes: '512x512',
                  type: 'image/png'
              },
              {
                  purpose: 'any',
                  src: "/icons/icon512_rounded.png",
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
