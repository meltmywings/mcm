import { afterEach, describe, expect, it } from 'vitest';
import {
  HERO_CORNER_MAGAZINES,
  initMagazineCollage,
  PERIMETER_MAGAZINES,
} from '../src/scripts/magazines';

describe('Y2K Magazine collage', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts decorative perimeter and hero-corner magazines with aria-hidden="true"', () => {
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

  it('includes masthead, artwork, and barcode details on every cover', () => {
    document.body.innerHTML = '<div id="magazine-collage"></div>';
    initMagazineCollage(document);

    const covers = document.querySelectorAll('#magazine-collage .mag-cover');
    covers.forEach((cover) => {
      expect(cover.querySelector('.mag-masthead')?.textContent?.trim().length).toBeGreaterThan(0);
      expect(cover.querySelector('svg.mag-art')).not.toBeNull();
      expect(cover.querySelector('.mag-barcode')).not.toBeNull();
    });
  });
});

