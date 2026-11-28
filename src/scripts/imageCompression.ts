export interface ImageCompressionOptions {
  maxDimension?: number;
  maxBytes?: number;
  quality?: number;
}

export interface CompressedUploadPayload {
  contentType: string;
  dataBase64: string;
  originalBytes: number;
  compressedBytes: number;
  width?: number;
  height?: number;
  wasCompressed: boolean;
}

/**
 * Compute proportional target dimensions bounded by maxDimension without upscaling.
 */
export function fitImageDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const safeW = Math.max(1, Math.round(width));
  const safeH = Math.max(1, Math.round(height));
  if (safeW <= maxDimension && safeH <= maxDimension) {
    return { width: safeW, height: safeH };
  }
  const scale = maxDimension / Math.max(safeW, safeH);
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
  };
}

export function formatByteSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(blob);
  });
}

function canvasHasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 252) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

interface DecodedRaster {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

async function decodeRasterFile(file: File): Promise<DecodedRaster | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // Fall back to HTMLImageElement decoding
    }
  }

  if (typeof Image === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image decode failed.'));
      img.src = objectUrl;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    return null;
  }
}

async function encodeCandidateBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  const blob = await canvasToBlob(canvas, mimeType, quality);
  if (!blob || blob.size === 0) return null;
  // Some browsers ignore unsupported MIME arguments (e.g., WebP) and fall back to PNG
  if (blob.type && blob.type !== mimeType) return null;
  return blob;
}

/**
 * Downscale and aggressively compress an uploaded image/sticker in the browser before POSTing.
 * Preserves alpha transparency via WebP (or PNG fallback) and compresses opaque assets via WebP/JPEG.
 */
export async function compressImageUpload(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<CompressedUploadPayload> {
  const maxDimension = options.maxDimension ?? 480;
  const maxBytes = options.maxBytes ?? 45 * 1024;
  const startQuality = options.quality ?? 0.72;
  const normalizedType = (file.type || 'image/jpeg').toLowerCase().trim();

  // Keep small animated GIFs intact so animation frames survive
  if (normalizedType === 'image/gif' && file.size <= 150 * 1024) {
    return {
      contentType: 'image/gif',
      dataBase64: await blobToDataUrl(file),
      originalBytes: file.size,
      compressedBytes: file.size,
      wasCompressed: false,
    };
  }

  const decoded = typeof document !== 'undefined' ? await decodeRasterFile(file) : null;
  if (!decoded || decoded.width <= 0 || decoded.height <= 0) {
    return {
      contentType: normalizedType,
      dataBase64: await blobToDataUrl(file),
      originalBytes: file.size,
      compressedBytes: file.size,
      wasCompressed: false,
    };
  }

  try {
    const { width, height } = fitImageDimensions(decoded.width, decoded.height, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        contentType: normalizedType,
        dataBase64: await blobToDataUrl(file),
        originalBytes: file.size,
        compressedBytes: file.size,
        wasCompressed: false,
      };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const hasAlpha =
      (normalizedType === 'image/png' || normalizedType === 'image/webp' || normalizedType === 'image/gif') &&
      canvasHasTransparency(ctx, width, height);

    const qualities = [
      startQuality,
      Math.max(0.42, Number((startQuality - 0.16).toFixed(2))),
      Math.max(0.32, Number((startQuality - 0.28).toFixed(2))),
    ];
    const mimeCandidates = hasAlpha
      ? ['image/webp', 'image/png']
      : ['image/webp', 'image/jpeg'];

    let bestBlob: Blob | null = null;
    for (const mime of mimeCandidates) {
      for (const q of qualities) {
        const candidate = await encodeCandidateBlob(canvas, mime, q);
        if (!candidate) break;
        if (!bestBlob || candidate.size < bestBlob.size) {
          bestBlob = candidate;
        }
        if (candidate.size <= maxBytes) break;
      }
      if (bestBlob && bestBlob.size <= maxBytes) break;
    }

    const resized = width < decoded.width || height < decoded.height;
    if (!bestBlob || (!resized && bestBlob.size >= file.size && normalizedType !== 'image/gif')) {
      return {
        contentType: normalizedType,
        dataBase64: await blobToDataUrl(file),
        originalBytes: file.size,
        compressedBytes: file.size,
        width: decoded.width,
        height: decoded.height,
        wasCompressed: false,
      };
    }

    return {
      contentType: bestBlob.type || mimeCandidates[0],
      dataBase64: await blobToDataUrl(bestBlob),
      originalBytes: file.size,
      compressedBytes: bestBlob.size,
      width,
      height,
      wasCompressed: true,
    };
  } finally {
    decoded.cleanup();
  }
}
