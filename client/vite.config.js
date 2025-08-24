import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 5173,  // Puerto estándar de Vite
    host: '0.0.0.0',
    cors: true
  },
  preview: {
    port: 5173,
    host: '0.0.0.0'
  }
});
