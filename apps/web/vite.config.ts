import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8000'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/auth': {
          target: apiTarget,
          changeOrigin: true,
        },
        '^/inventory/items': {
          target: apiTarget,
          changeOrigin: true,
        },
        '^/inventory/types': {
          target: apiTarget,
          changeOrigin: true,
        },
        '^/cabinets/rooms': {
          target: apiTarget,
          changeOrigin: true,
        },
        '^/cabinets/room-types': {
          target: apiTarget,
          changeOrigin: true,
        },
        '^/departments': {
          target: apiTarget,
          changeOrigin: true,
        },
        '^/audit': {
          target: apiTarget,
          changeOrigin: true,
        },
        '^/operations': {
          target: apiTarget,
          changeOrigin: true,
        },
        '^/notifications': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
      host: true,
    },
  }
})
