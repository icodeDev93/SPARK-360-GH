import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  envDir: '..',
  plugins: [react()],
  build: {
    outDir: 'out',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      '@': resolve(rootDir, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3010,
  },
});
