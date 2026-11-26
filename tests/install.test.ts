import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initInstallPrompt } from '../src/scripts/install';

describe('PWA manifests, app logo icons, and installability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    delete (Navigator.prototype as Navigator & { install?: () => Promise<void> }).install;
  });

  it('defines separate installable manifests with distinct IDs/scopes and valid logo PNGs', () => {
    const root = path.resolve(process.cwd());
    const mainManifest = JSON.parse(
      fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'),
    );
    const adminManifest = JSON.parse(
      fs.readFileSync(path.join(root, 'public/admin-manifest.webmanifest'), 'utf8'),
    );

    expect(mainManifest.id).toBe('/');
    expect(mainManifest.start_url).toBe('/');
    expect(mainManifest.scope).toBe('/');
    expect(mainManifest.display).toBe('fullscreen');
    expect(mainManifest.display_override).toEqual(['fullscreen', 'standalone']);

    expect(adminManifest.id).toBe('/admin.html');
    expect(adminManifest.start_url).toBe('/admin.html');
    expect(adminManifest.scope).toBe('/admin');
    expect(adminManifest.display).toBe('fullscreen');
    expect(adminManifest.display_override).toEqual(['fullscreen', 'standalone']);
    expect(adminManifest.id).not.toBe(mainManifest.id);
    expect(adminManifest.start_url).not.toBe(mainManifest.start_url);
    expect(adminManifest.scope).not.toBe(mainManifest.scope);
    expect(adminManifest.start_url.startsWith(adminManifest.scope)).toBe(true);
    expect('/'.startsWith(adminManifest.scope)).toBe(false);

    for (const manifest of [mainManifest, adminManifest]) {
      const iconSizes = new Set<string>(manifest.icons.map((i: { sizes: string }) => i.sizes));
      expect(iconSizes.has('192x192')).toBe(true);
      expect(iconSizes.has('512x512')).toBe(true);
      expect(
        manifest.icons.some(
          (i: { purpose?: string; type: string }) =>
            i.purpose === 'maskable' && i.type === 'image/png',
        ),
      ).toBe(true);

      for (const icon of manifest.icons) {
        const iconPath = path.join(root, 'public', icon.src.replace(/^\//, ''));
        expect(fs.existsSync(iconPath)).toBe(true);
      }
    }

    expect(fs.existsSync(path.join(root, 'public/apple-touch-icon.png'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'public/sw.js'))).toBe(true);

    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');

    expect(indexHtml).toContain('href="/manifest.webmanifest"');
    expect(indexHtml).toContain('href="/apple-touch-icon.png"');
    expect(adminHtml).toContain('href="/admin-manifest.webmanifest"');
    expect(adminHtml).toContain('href="/apple-touch-icon.png"');
    expect(adminHtml).toContain('href="/" target="_blank"');
  });

  it('reveals install button on beforeinstallprompt and invokes prompt() once on click', async () => {
    document.body.innerHTML = `
      <button type="button" id="install-app-btn" hidden>Install App</button>
      <p id="install-status" role="status" hidden></p>
    `;

    const ctrl = initInstallPrompt(document);
    const btn = document.getElementById('install-app-btn') as HTMLButtonElement;
    const status = document.getElementById('install-status') as HTMLElement;

    expect(btn.hidden).toBe(true);

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    });

    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(btn.hidden).toBe(false);

    btn.click();
    await vi.waitFor(() => expect(promptMock).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(status.textContent).toBe('The app was installed.'));
    expect(btn.hidden).toBe(true);
    expect(btn.hasAttribute('aria-disabled')).toBe(false);

    ctrl?.destroy();
  });

  it('uses navigator.install() when Web Install API is supported', async () => {
    const installMock = vi.fn().mockResolvedValue(undefined);
    (Navigator.prototype as Navigator & { install?: () => Promise<void> }).install = installMock;

    document.body.innerHTML = `
      <button type="button" id="install-app-btn" hidden>Install App</button>
      <p id="install-status" role="status" hidden></p>
    `;

    const ctrl = initInstallPrompt(document);
    const btn = document.getElementById('install-app-btn') as HTMLButtonElement;
    const status = document.getElementById('install-status') as HTMLElement;

    expect(btn.hidden).toBe(false);

    btn.click();
    await vi.waitFor(() => expect(installMock).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(status.textContent).toBe('The app was installed or opened.'));
    expect(btn.hidden).toBe(true);

    ctrl?.destroy();
  });

  it('renders photorealistic print magazine spreads, cover overlay, glossary, and minimalist top masthead', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/main.css'), 'utf8');
    expect(css).toContain('/* === PHOTOREALISTIC MAGAZINES START === */');
    expect(css).toContain('/* === PHOTOREALISTIC MAGAZINES END === */');
    expect(css).toContain('.mag-cover-spread');
    expect(css).toContain('.mag-spread');
    expect(css).toContain('.glossary-list');
    expect(css).toContain('.glossary-folio');
    expect(css).toContain('.mag-pager');
    expect(css).toMatch(/\.site-header\s*\{/);
  });
});
