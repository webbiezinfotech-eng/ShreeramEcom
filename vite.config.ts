import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    react(), 
    svgr({
      svgrOptions: {
        exportType: 'named',
        ref: true,
        svgo: false,
        titleProp: true,
      },
      include: '**/*.svg?react',
    })
  ],
  resolve: {
    alias: {
      '@': '/src',
      '@website': '/src',
      '@admin': '/src/admin',
      '@api': '/src/api',
      '@shared': '/src/shared'
    }
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    open: true,
    host: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  }
})
