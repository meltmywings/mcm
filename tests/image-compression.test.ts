import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  compressImageUpload,
  fitImageDimensions,
  formatByteSize,
} from '../src/scripts/imageCompression';

describe('Client-side image upload compression', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('downscales oversized dimensions proportionally without upscaling tiny images', () => {
    expect(fitImageDimensions(3000, 1500, 480)).toEqual({ width: 480, height: 240 });
    expect(fitImageDimensions(1200, 2400, 480)).toEqual({ width: 240, height: 480 });
    expect(fitImageDimensions(320, 240, 480)).toEqual({ width: 320, height: 240 });
    expect(formatByteSize(32_400)).toBe('32 KB');
    expect(formatByteSize(2_097_152)).toBe('2.00 MB');
  });

  it('downscales and compresses oversized opaque uploads to lightweight WebP under the byte budget', async () => {
    const mockCtx = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([255, 100, 150, 255]) })),
    };

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => mockCtx,
          toBlob: (cb: (blob: Blob | null) => void, mimeType?: string, quality?: number) => {
            // Simulate smaller byte output at WebP quality < 0.8
            const size = quality && quality < 0.65 ? 18_000 : 28_000;
            cb(new Blob([new Uint8Array(size)], { type: mimeType || 'image/png' }));
          },
        } as unknown as HTMLCanvasElement;
      }
      return origCreateElement(tag);
    });

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({
        width: 3200,
        height: 2400,
        close: vi.fn(),
      }),
    );

    const bigRaw = new File([new Uint8Array(2_400_000)], 'huge-cutout.png', { type: 'image/png' });
    const result = await compressImageUpload(bigRaw, {
      maxDimension: 480,
      maxBytes: 45 * 1024,
      quality: 0.72,
    });

    expect(result.wasCompressed).toBe(true);
    expect(result.contentType).toBe('image/webp');
    expect(result.width).toBe(480);
    expect(result.height).toBe(360);
    expect(result.compressedBytes).toBeLessThanOrEqual(45 * 1024);
    expect(result.dataBase64.startsWith('data:image/webp;base64,')).toBe(true);
  });

  it('keeps tiny GIFs and unsupported environments intact via graceful fallback', async () => {
    const tinyGif = new File([new Uint8Array(12_000)], 'sparkle.gif', { type: 'image/gif' });
    const gifRes = await compressImageUpload(tinyGif);
    expect(gifRes.wasCompressed).toBe(false);
    expect(gifRes.contentType).toBe('image/gif');
    expect(gifRes.compressedBytes).toBe(12_000);

    const smallPng = new File([new Uint8Array(4_096)], 'mini.png', { type: 'image/png' });
    const fallbackRes = await compressImageUpload(smallPng);
    expect(fallbackRes.wasCompressed).toBe(false);
    expect(fallbackRes.contentType).toBe('image/png');
    expect(fallbackRes.dataBase64.startsWith('data:image/png;base64,')).toBe(true);
  });
});
