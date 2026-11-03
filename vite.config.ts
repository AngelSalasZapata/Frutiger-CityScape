import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@data': fileURLToPath(new URL('./data', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/release/**', '**/dist/**', '**/dist-electron/**'],
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    // Three.js pesa ~600 kB minificado; es el núcleo del renderer y se cargará siempre.
    chunkSizeWarningLimit: 800,
  },
})
