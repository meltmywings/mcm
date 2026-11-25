import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'esnext',
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.ts'],
  },
});

