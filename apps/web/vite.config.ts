import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import path from 'node:path';
import { createManualChunks } from '../../config/vite.manual-chunks';

const requestRunnerPath = path.resolve(__dirname, '../../libs/@sdl/request-runner/src/index.ts');
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? process.env.VITE_API_URL ?? 'http://localhost:8081';

// Allow turning manual chunking back on if we want to profile bundle splits again.
const manualChunks =
  process.env.VITE_ENABLE_MANUAL_CHUNKS === 'true' ? createManualChunks() : undefined;

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
        // Disabled by default because the vendor-react/vendor chunks formed a cycle
        // that left React undefined at runtime (createContext blew up). Re-enable
        // via VITE_ENABLE_MANUAL_CHUNKS=true if we need the old splits.
        ...(manualChunks ? { manualChunks } : {})
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the backend during development (defaults to 8081)
      '/v1': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: apiProxyTarget,
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
