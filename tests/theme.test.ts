import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ALLOWED_HEX_CODES = new Set([
  '#F4A6C1',
  '#F8DCE8',
  '#E9D6C4',
  '#B9D7ED',
  '#D9C5E9',
  '#F8D98B',
]);

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(css|html|svg|ts)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function stripPhotorealisticMagazineCss(css: string): string {
  return css.replace(
    /\/\* === PHOTOREALISTIC MAGAZINES START === \*\/[\s\S]*?\/\* === PHOTOREALISTIC MAGAZINES END === \*\//g,
    '',
  );
}

describe('Strict 6-color palette enforcement (excluding photorealistic magazines)', () => {
  it('uses only the approved 6 hex codes across core HTML, SVG, data, and site CSS', () => {
    const root = path.resolve(process.cwd());
    const files = [
      path.join(root, 'index.html'),
      ...collectFiles(path.join(root, 'public')),
      ...collectFiles(path.join(root, 'src')).filter(
        (file) => !file.endsWith(path.join('scripts', 'magazines.ts')),
      ),
    ];

    const violations: string[] = [];
    const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
    const fnColorRegex = /\b(?:rgb|rgba|hsl|hsla)\s*\(/gi;

    for (const file of files) {
      let content = fs.readFileSync(file, 'utf8');
      if (file.endsWith('main.css')) {
        content = stripPhotorealisticMagazineCss(content);
      }

      const matches = content.match(hexRegex) ?? [];
      for (const hex of matches) {
        if (!ALLOWED_HEX_CODES.has(hex.toUpperCase())) {
          violations.push(`${path.relative(root, file)}: ${hex}`);
        }
      }
      if (fnColorRegex.test(content)) {
        violations.push(`${path.relative(root, file)}: functional color rgb/hsl found`);
      }
    }

    expect(violations).toEqual([]);
  });
});
