import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import path from 'node:path';
import { createManualChunks } from '../../config/vite.manual-chunks';

const requestRunnerPath = path.resolve(__dirname, '../../libs/@sdl/request-runner/src/index.ts');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      zustand: path.resolve(__dirname, './src/vendor/zustand/index.ts'),
      'zustand/middleware': path.resolve(__dirname, './src/vendor/zustand/middleware/index.ts'),
      'zustand/middleware/immer': path.resolve(__dirname, './src/vendor/zustand/middleware/immer.ts'),
      idb: path.resolve(__dirname, './src/vendor/idb.ts'),
      'react-syntax-highlighter': path.resolve(__dirname, './src/vendor/react-syntax-highlighter.tsx'),
      ulidx: path.resolve(__dirname, './src/vendor/ulidx.ts'),
      '@sdl/request-runner': requestRunnerPath,
      '@sdl/ui/command-palette': path.resolve(__dirname, '../../packages/ui/command-palette/index.ts'),
      '@sdl/ui/command-palette/': path.resolve(__dirname, '../../packages/ui/command-palette/'),
    }
  },
  css: {
    devSourcemap: true
  },
  build: {
    target: 'esnext',
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
        // Proxy API requests to the unified Nest backend during development
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
          rewrite: (path) => path.replace(/^\/auth\b/, '/api/v1/auth'),
        },
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
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
    exclude: ['src/__tests__/auth.integration.test.tsx'],
    alias: {
      zustand: path.resolve(__dirname, './src/vendor/zustand/index.ts'),
      'zustand/middleware': path.resolve(__dirname, './src/vendor/zustand/middleware/index.ts'),
      'zustand/middleware/immer': path.resolve(__dirname, './src/vendor/zustand/middleware/immer.ts'),
      idb: path.resolve(__dirname, './src/vendor/idb.ts'),
      'react-syntax-highlighter': path.resolve(__dirname, './src/vendor/react-syntax-highlighter.tsx'),
      ulidx: path.resolve(__dirname, './src/vendor/ulidx.ts'),
      '@sdl/request-runner': requestRunnerPath,
      '@sdl/ui/command-palette': path.resolve(__dirname, '../../packages/ui/command-palette/index.ts'),
      '@sdl/ui/command-palette/': path.resolve(__dirname, '../../packages/ui/command-palette/'),
    },
    coverage: {
      reporter: ['text', 'lcov']
    }
  }
});
