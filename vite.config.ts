import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
      jsxDev: false,
      sourcemap: false,
    },
    css: {
      devSourcemap: false,
    },
    plugins: [
      tailwindcss(),
      {
        name: 'mep-strip-dev-inline-sourcemaps',
        enforce: 'post',
        transform(code, id) {
          if (id.includes('/src/')) {
            return {
              code: code.replace(/\/\/# sourceMappingURL=data:application\/json;[^\n]+/g, ''),
              map: { mappings: '' } as any,
            };
          }
          return null;
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'My Easy Project',
          short_name: 'EasyProject',
          description: 'Application professionnelle de gestion de devis, factures proforma, factures et suivi de projets rigoureux en temps réel.',
          theme_color: '#0A2558',
          background_color: '#FFFFFF',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png?v=3',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png?v=3',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png?v=3',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/apple-touch-icon.png?v=3',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon.svg?v=3',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,json}'],
          runtimeCaching: [
            {
              urlPattern: /\/offline-cache\/.*\.json$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'mep-essential-projects-documents-cache-v1',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/assets\/.*\.(?:png|jpg|jpeg|svg|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'mep-brand-assets-cache-v1',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 90,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      sourcemapIgnoreList: () => true,
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('xlsx')) return 'vendor-xlsx';
              if (id.includes('jspdf')) return 'vendor-jspdf';
              if (id.includes('lucide-react')) return 'vendor-icons';
            }
            return undefined;
          },
        },
      },
    },
  };
});
