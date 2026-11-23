import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  root: path.resolve(__dirname, './client'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '~': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 300,
  },
});
