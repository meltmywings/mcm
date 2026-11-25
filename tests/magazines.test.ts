import { afterEach, describe, expect, it } from 'vitest';
import {
  HERO_CORNER_MAGAZINES,
  initMagazineCollage,
  PERIMETER_MAGAZINES,
} from '../src/scripts/magazines';

describe('Y2K Photorealistic Magazine Collage', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts decorative perimeter and hero collage magazines with aria-hidden="true"', () => {
    document.body.innerHTML = `
      <div id="magazine-collage"></div>
      <div id="hero-magazines"></div>
    `;

    initMagazineCollage(document);

    const perimeter = document.getElementById('magazine-collage')!;
    const heroMags = document.getElementById('hero-magazines')!;

    expect(perimeter.getAttribute('aria-hidden')).toBe('true');
    expect(heroMags.getAttribute('aria-hidden')).toBe('true');
    expect(perimeter.querySelectorAll('.mag-cover')).toHaveLength(PERIMETER_MAGAZINES.length);
    expect(heroMags.querySelectorAll('.mag-cover')).toHaveLength(HERO_CORNER_MAGAZINES.length);
  });

  it('uses photorealistic img tags with empty alt text and valid local /magazines/ paths', () => {
    document.body.innerHTML = `
      <div id="magazine-collage"></div>
      <div id="hero-magazines"></div>
    `;
    initMagazineCollage(document);

    const imgs = document.querySelectorAll<HTMLImageElement>('.mag-cover img.mag-photo');
    expect(imgs.length).toBeGreaterThanOrEqual(PERIMETER_MAGAZINES.length + HERO_CORNER_MAGAZINES.length);

    imgs.forEach((img) => {
      expect(img.getAttribute('alt')).toBe('');
      expect(img.getAttribute('src')).toMatch(/^\/magazines\/mag-\d{2}\.jpg$/);
    });

    expect(document.querySelector('.mag-variant-spread')).not.toBeNull();
    expect(document.querySelector('.mag-variant-grid .mag-mini-grid')).not.toBeNull();
    expect(document.querySelector('.mag-variant-strip .mag-strip-collage')).not.toBeNull();
    expect(document.querySelector('.mag-variant-lookbook')).not.toBeNull();
  });
});
