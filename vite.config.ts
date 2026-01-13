import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    copyPublicDir: false,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      overlay: false,
      timeout: 5000,
    },
    watch: {
      usePolling: false,
      interval: 1000,
      ignored: ['**/public/AppLogo-FlatFund Pro.jpg'],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
