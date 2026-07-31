import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        // AI calls can run for minutes (floor plan analysis) — the proxy's default timeouts
        // would abandon the request long before the backend answers.
        timeout: 10 * 60 * 1000,
        proxyTimeout: 10 * 60 * 1000,
      },
    },
  },
})
