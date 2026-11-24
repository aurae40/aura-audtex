import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const isSingleFile = process.env.VITE_SINGLE_FILE === 'true';

const backendProxy = {
  '/health': 'http://127.0.0.1:8000',
  '/transcribe': 'http://127.0.0.1:8000',
  '/transcribe-chunk': 'http://127.0.0.1:8000',
  '/transcribe-url': 'http://127.0.0.1:8000',
  '/audio': 'http://127.0.0.1:8000',
  '/models': 'http://127.0.0.1:8000',
  '/llm-status': 'http://127.0.0.1:8000',
  '/analyze': 'http://127.0.0.1:8000',
  '/ask': 'http://127.0.0.1:8000',
  '/ws': { target: 'ws://127.0.0.1:8000', ws: true },
};

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    ...(isSingleFile ? [viteSingleFile()] : []),
  ],
  worker: {
    format: 'es',
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: backendProxy,
  },
  preview: {
    host: true,
    allowedHosts: true,
    proxy: backendProxy,
  },
  build: {
    target: ['es2020', 'safari15', 'chrome90', 'firefox90'],
    ...(isSingleFile
      ? {
          assetsInlineLimit: 100000000,
          chunkSizeWarningLimit: 100000000,
          cssCodeSplit: false,
        }
      : {
          sourcemap: false,
          cssCodeSplit: true,
        }),
  },
});
