import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: { alias: { '@': resolve(import.meta.dirname, 'frontend/src') } },
  publicDir: false,
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8787' },
    fs: { deny: ['.git/**', '.local/**', '.venv/**', '**/.env*', '**/*.sqlite*'] },
  },
  build: {
    outDir: 'frontend/dist',
    emptyOutDir: true,
    rolldownOptions: { input: resolve(import.meta.dirname, 'phone-animation.html') },
  },
});
