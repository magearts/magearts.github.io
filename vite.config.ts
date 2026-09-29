import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),

    /*
     * The portal is the installable part; the landing page is not. `scope`
     * is what says so - a browser offers to install only from inside it, and
     * the icon on somebody's home screen opens the portal rather than the
     * page that sells it to them.
     *
     * autoUpdate, because the alternative is worse than it sounds. A service
     * worker that waits to be told to update leaves people on whatever
     * version they first loaded, sometimes for months, and they have no way
     * to get off it and no idea they are on it.
     */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.svg'],
      manifest: {
        name: 'MageArts',
        short_name: 'MageArts',
        description: 'Set up and control your MageArts devices.',
        lang: 'en',
        start_url: '/portal',
        scope: '/portal',
        display: 'standalone',
        background_color: '#f1f5f7',
        theme_color: '#f1f5f7',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            // Android crops icons to whatever shape the launcher uses. This
            // one has the margin that survives it.
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // One page, many routes: anything not cached resolves to the shell,
        // which is what lets /portal open with no network.
        navigateFallback: '/index.html',
      },
    }),
  ],
  // Listen on all interfaces so other devices on the LAN can reach dev/preview (local only; no effect on GitHub Pages).
  server: { host: true },
  preview: { host: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
