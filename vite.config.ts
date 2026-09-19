import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { renderHandoffPage, resolveTarget } from './api/marinetraffic.js'

// Mirrors the /api/marinetraffic serverless function so `npm run dev` behaves
// like production.
const marineTrafficRedirect = (): Plugin => ({
  name: 'marinetraffic-redirect',
  configureServer(server) {
    server.middlewares.use('/api/marinetraffic', (req, res) => {
      const query = new URL(req.url ?? '/', 'http://localhost').searchParams
      const target = resolveTarget(query.get('url'))

      if (!target) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Expected a marinetraffic.com url parameter' }))
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(renderHandoffPage(target))
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), marineTrafficRedirect()],
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
