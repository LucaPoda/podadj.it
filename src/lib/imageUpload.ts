export interface CompressedUploadAsset {
  repoPath: string;
  base64: string;
  previewDataUrl: string;
  mimeType: string;
  imageWebp: string;
  imageJpg: string;
  width: number;
  height: number;
  byteSize: number;
}

export function slugifyAssetName(input: string): string {
  const base = input
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || `setup-${Date.now()}`;
}

/**
 * Compresses and resizes an image client-side via <canvas> (max 1920px, JPEG q=0.88)
 * so payloads stay well under Vercel's 4.5 MB serverless request limit.
 */
export async function compressImageForRepoUpload(
  file: File,
  options: { folder?: 'tech-gallery' | 'uploads'; slugHint?: string; maxDim?: number } = {}
): Promise<CompressedUploadAsset> {
  const folder = options.folder ?? 'tech-gallery';
  const maxDim = options.maxDim ?? 1920;
  const slug = slugifyAssetName(options.slugHint || file.name);

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Impossibile leggere il file immagine selezionato.'));
      el.src = objectUrl;
    });

    let targetW = img.naturalWidth || img.width;
    let targetH = img.naturalHeight || img.height;
    if (targetW > maxDim || targetH > maxDim) {
      const ratio = Math.min(maxDim / targetW, maxDim / targetH);
      targetW = Math.max(1, Math.round(targetW * ratio));
      targetH = Math.max(1, Math.round(targetH * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D non disponibile nel browser.');
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const mimeType = 'image/jpeg';
    const previewDataUrl = canvas.toDataURL(mimeType, 0.88);
    const commaIdx = previewDataUrl.indexOf(',');
    const base64 = commaIdx !== -1 ? previewDataUrl.slice(commaIdx + 1) : '';

    if (!base64) {
      throw new Error('Compressione immagine fallita.');
    }

    const approxBytes = Math.floor((base64.length * 3) / 4);
    if (approxBytes > 3_000_000) {
      throw new Error(
        `Immagine ancora troppo pesante (${(approxBytes / 1024 / 1024).toFixed(
          2
        )} MB) dopo il ridimensionamento.`
      );
    }

    return {
      repoPath: `assets/${folder}/${slug}.jpg`,
      base64,
      previewDataUrl,
      mimeType,
      imageWebp: `/assets/${folder}/${slug}.webp`,
      imageJpg: `/assets/${folder}/${slug}.jpg`,
      width: targetW,
      height: targetH,
      byteSize: approxBytes,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
