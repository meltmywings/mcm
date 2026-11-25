import { afterEach, describe, expect, it } from 'vitest';
import { initMagazineCollage, PERIMETER_MAGAZINES } from '../src/scripts/magazines';

describe('Sitewide Y2K Photorealistic Magazine Collage', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts crowded sitewide decorative magazines with aria-hidden="true"', () => {
    document.body.innerHTML = '<div id="magazine-collage"></div>';

    initMagazineCollage(document);

    const perimeter = document.getElementById('magazine-collage')!;
    expect(perimeter.getAttribute('aria-hidden')).toBe('true');
    expect(perimeter.querySelectorAll('.mag-cover')).toHaveLength(PERIMETER_MAGAZINES.length);
  });

  it('uses photorealistic img tags with empty alt text and valid local /magazines/ paths', () => {
    document.body.innerHTML = '<div id="magazine-collage"></div>';
    initMagazineCollage(document);

    const imgs = document.querySelectorAll<HTMLImageElement>('.mag-cover img.mag-photo');
    expect(imgs.length).toBeGreaterThanOrEqual(PERIMETER_MAGAZINES.length);

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
