import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createManualChunks } from '../../config/vite.manual-chunks';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      zustand: path.resolve(__dirname, './src/vendor/zustand/index.ts'),
      'zustand/middleware': path.resolve(__dirname, './src/vendor/zustand/middleware/index.ts'),
      'zustand/middleware/immer': path.resolve(__dirname, './src/vendor/zustand/middleware/immer.ts'),
      idb: path.resolve(__dirname, './src/vendor/idb.ts'),
      'react-syntax-highlighter': path.resolve(__dirname, './src/vendor/react-syntax-highlighter.tsx'),
      ulidx: path.resolve(__dirname, './src/vendor/ulidx.ts')
    }
  },
  css: {
    devSourcemap: true
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: createManualChunks()
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the consolidated backend during development
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/v1\b/, '/api/v1'),
      },
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth\b/, '/api/auth'),
      },
      // Health endpoints for dev convenience
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: () => '/api/health',
      },
      '/healthz': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: () => '/api/health',
      },
      // Proxy Socket.IO engine (used by collab and other realtime features)
      '/socket.io': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      zustand: path.resolve(__dirname, './src/vendor/zustand/index.ts'),
      'zustand/middleware': path.resolve(__dirname, './src/vendor/zustand/middleware/index.ts'),
      'zustand/middleware/immer': path.resolve(__dirname, './src/vendor/zustand/middleware/immer.ts'),
      idb: path.resolve(__dirname, './src/vendor/idb.ts'),
      'react-syntax-highlighter': path.resolve(__dirname, './src/vendor/react-syntax-highlighter.tsx'),
      ulidx: path.resolve(__dirname, './src/vendor/ulidx.ts')
    },
    coverage: {
      reporter: ['text', 'lcov']
    }
  }
});
