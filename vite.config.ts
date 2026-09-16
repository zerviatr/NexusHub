import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Point root to src/renderer where index.html resides
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index.html'),
    },
  },
})
