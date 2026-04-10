import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
            manifest: {
                name:             'EcuEntrega Panel',
                short_name:       'EcuPanel',
                description:      'Panel de gestión de pedidos EcuEntrega',
                theme_color:      '#6366f1',
                background_color: '#0f172a',
                display:          'standalone',
                orientation:      'portrait',
                scope:            '/',
                start_url:        '/',
                icons: [
                    {
                        src:   'icons/icon-192.png',
                        sizes: '192x192',
                        type:  'image/png',
                    },
                    {
                        src:   'icons/icon-512.png',
                        sizes: '512x512',
                        type:  'image/png',
                    },
                    {
                        src:     'icons/icon-512.png',
                        sizes:   '512x512',
                        type:    'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns:      ['**/*.{js,css,html,ico,png,svg}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/botecu\.ecuentrega\.com\/api\/.*/i,
                        handler:    'NetworkFirst',
                        options: {
                            cacheName:          'api-cache',
                            expiration: {
                                maxEntries:       50,
                                maxAgeSeconds:    300,
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: { '@': resolve(__dirname, './src') },
    },
});