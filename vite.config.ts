import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/vessel-data-api': {
        target: 'https://colrip-portal.azurewebsites.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vessel-data-api/, '/api')
      }
    }
  }
})
