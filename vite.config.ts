import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,        // Distinct from petalapp (5173)
    strictPort: false,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
