import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev (npm run dev directly) proxies to the API on localhost:8000.
// Override with VITE_API_PROXY_TARGET (e.g. 'http://api:8000' inside Docker Compose).
const ENV =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const API_TARGET = ENV.VITE_API_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
