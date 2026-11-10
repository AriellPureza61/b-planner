import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', 'favicon.svg'],
      manifest: {
        id: '/admin',
        name: 'B. Planner - Painel Admin',
        short_name: 'B. Planner',
        description: 'Painel administrativo em tempo real para gestão de agendamentos',
        theme_color: '#f43f5e',
        background_color: '#FFFBFB',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/admin',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
