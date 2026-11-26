import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

function adminRouteRewritePlugin() {
  const rewrite = (
    req: { url?: string },
    _res: unknown,
    next: () => void,
  ) => {
    if (req.url === '/admin' || req.url === '/admin/') {
      req.url = '/admin.html';
    }
    next();
  };

  return {
    name: 'admin-route-rewrite',
    configureServer(server: { middlewares: { use: (fn: typeof rewrite) => void } }) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server: { middlewares: { use: (fn: typeof rewrite) => void } }) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  plugins: [adminRouteRewritePlugin()],
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.ts'],
  },
});
