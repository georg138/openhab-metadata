import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const OPENHAB_URL = process.env.OPENHAB_URL ?? 'https://openhab5-coreos.georgsiebke.de'
const OPENHAB_TOKEN = process.env.OPENHAB_TOKEN ?? 'oh.copilot.rlgOZFdUbFIHsjpBNvPL3j2LmGL0HRgD4D93xwS8gSz304rjpIxMpLrAs2IZljxZfP6jnQQqRX3Rh8Z4Jg'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectAuth(proxy: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proxy.on('proxyReq', (proxyReq: any) => {
    proxyReq.setHeader('Authorization', `Bearer ${OPENHAB_TOKEN}`)
  })
}

const proxyConfig = {
  '/rest': {
    target: OPENHAB_URL,
    changeOrigin: true,
    secure: false,
    configure: injectAuth,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5180,
    proxy: proxyConfig,
  },
  preview: {
    host: true,
    port: 5180,
    proxy: proxyConfig,
    allowedHosts: ['openhab-metadata.georgsiebke.de'],
  },
})
