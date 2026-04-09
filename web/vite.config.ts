import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@web': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, '..'),
    },
  },
});
