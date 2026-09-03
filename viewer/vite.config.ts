import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In Docker, the API service is reachable as 'http://api:8000'.
// In local dev (npm run dev directly), it's 'http://localhost:8000'.
const API_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://api:8000'

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
})
