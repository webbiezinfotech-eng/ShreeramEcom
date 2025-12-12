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
    port: process.env.PORT ? parseInt(process.env.PORT) : 5174,
    open: true,
    host: '0.0.0.0', // Allow access from network (phone on same WiFi)
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // Use esbuild (faster, built-in)
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - split large dependencies
          if (id.includes('node_modules')) {
            // React core libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // React Icons (can be very large - split separately)
            if (id.includes('react-icons')) {
              return 'vendor-icons';
            }
            // Lucide icons (if used)
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            // Other vendor libraries
            return 'vendor';
          }
          // Split admin and website code for better code splitting
          if (id.includes('/admin/')) {
            return 'admin';
          }
          if (id.includes('/Components/')) {
            return 'website-components';
          }
        },
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Handle case where name might be undefined
          if (!assetInfo.name) {
            return `assets/[name]-[hash].[ext]`;
          }
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash].[ext]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash].[ext]`;
          }
          return `assets/[ext]/[name]-[hash].[ext]`;
        },
      },
    },
  }
})
