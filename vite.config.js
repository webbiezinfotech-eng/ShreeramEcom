import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: '0.0.0.0', // Allow access from network
    port: 5174,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
