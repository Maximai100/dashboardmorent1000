import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'https://1.cycloscope.online',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            secure: false,
          }
        }
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
          manifest: {
            name: 'Панель управления собственниками',
            short_name: 'Собственники',
            description: 'Система управления документами и данными собственников',
            theme_color: '#2563eb',
            background_color: '#0f172a',
            display: 'standalone',
            orientation: 'portrait-primary',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: '/icons/icon-72x72.png',
                sizes: '72x72',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: '/icons/icon-96x96.png',
                sizes: '96x96',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: '/icons/icon-128x128.png',
                sizes: '128x128',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: '/icons/icon-144x144.png',
                sizes: '144x144',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: '/icons/icon-152x152.png',
                sizes: '152x152',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: '/icons/icon-384x384.png',
                sizes: '384x384',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/1\.cycloscope\.online\/api\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'images-cache',
                  expiration: {
                    maxEntries: 60,
                    maxAgeSeconds: 60 * 60 * 24 * 30
                  }
                }
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
