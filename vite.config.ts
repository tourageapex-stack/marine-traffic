import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { adminApiPlugin } from './plugins/admin-api.ts'
import { appVersionPlugin, resolveAppBuildId } from './plugins/app-version.ts'

const apiProxy = {
  '/vessel-data-api': {
    target: 'https://colrip-portal.azurewebsites.net',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/vessel-data-api/, '/api'),
  },
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const buildId = resolveAppBuildId(command)
  return {
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
    },
    plugins: [react(), adminApiPlugin(), appVersionPlugin(buildId)],
    server: {
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
  }
})
