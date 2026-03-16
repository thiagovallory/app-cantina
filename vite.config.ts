import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const certDir = path.resolve(currentDir, 'certs')
const https =
  fs.existsSync(path.join(certDir, 'dev.key')) &&
  fs.existsSync(path.join(certDir, 'dev.crt'))
    ? {
        key: fs.readFileSync(path.join(certDir, 'dev.key')),
        cert: fs.readFileSync(path.join(certDir, 'dev.crt')),
      }
    : undefined

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Importante para Electron funcionar com paths relativos
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('jszip')) {
            return 'reports'
          }

          if (id.includes('@zxing') || id.includes('qrcode')) {
            return 'scanner'
          }

          return 'vendor'
        },
      },
    },
  },
  server: {
    https,
    host: '0.0.0.0', // Expõe o servidor na rede
    port: 5173, // Porta fixa
    strictPort: true, // Falha se a porta estiver ocupada
    proxy: {
      // Encaminha chamadas /api para o backend Node/Express
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
