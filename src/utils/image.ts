/**
 * Prepares a picked image file for upload: validates it, downscales it to a
 * sane menu-photo size and re-encodes it as JPEG. Keeps Cloudinary payloads
 * small (typically 150–400 KB) without a visible quality loss on the site.
 */

const MAX_INPUT_BYTES = 12 * 1024 * 1024; // what the browser accepts from the user
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, WebP or GIF).');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`That image is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please choose one under 12 MB.`);
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    throw new Error('This image could not be read. Please try another file.');
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    throw new Error('Your browser could not prepare the image for upload.');
  }

  // White backdrop so transparent PNGs do not turn black when encoded as JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64Payload = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bytes = Math.round((base64Payload.length * 3) / 4);

  return { dataUrl, width, height, bytes };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
