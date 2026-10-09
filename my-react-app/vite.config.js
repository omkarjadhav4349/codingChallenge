import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const trafficProxy = () => ({
  '/api/traffic': {
    target: 'https://api.adsb.lol',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/traffic/, '/v2'),
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: trafficProxy() },
  preview: { proxy: trafficProxy() },
})
