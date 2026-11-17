import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
  ],
  server: {
    allowedHosts: true,
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/transcribe': 'http://127.0.0.1:8000',
      '/models': 'http://127.0.0.1:8000',
    },
  },
  preview: {
    allowedHosts: true,
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/transcribe': 'http://127.0.0.1:8000',
      '/models': 'http://127.0.0.1:8000',
    },
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
  },
})
