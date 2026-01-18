import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['electron/**/*.ts', 'src/shared/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/dist-electron/**'],
    },
    // Setup files for test initialization
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron'),
    },
  },
});
