import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const outDir = resolve(root, '.vercel/output');
const staticDir = resolve(outDir, 'static');
const functionsDir = resolve(outDir, 'functions/api');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(functionsDir, { recursive: true });

cpSync(resolve(root, 'dist'), staticDir, { recursive: true });

const endpoints = ['auth', 'cms', 'clients', 'submissions', 'media'];

for (const name of endpoints) {
  const fnDir = resolve(functionsDir, `${name}.func`);
  mkdirSync(fnDir, { recursive: true });

  await build({
    entryPoints: [resolve(root, `api/${name}.ts`)],
    outfile: resolve(fnDir, 'index.mjs'),
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    sourcemap: false,
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
  });

  writeFileSync(
    resolve(fnDir, '.vc-config.json'),
    JSON.stringify({
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
    }),
  );

  writeFileSync(resolve(fnDir, 'package.json'), JSON.stringify({ type: 'module' }));
}

writeFileSync(
  resolve(outDir, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '^/admin/?$', dest: '/admin.html' },
        { handle: 'filesystem' },
      ],
    },
    null,
    2,
  ),
);

console.log('Prepared Vercel Build Output API v3 in .vercel/output');

