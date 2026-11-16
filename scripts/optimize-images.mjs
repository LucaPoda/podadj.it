import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const srcDir = './assets';
const outDir = './public/assets';

await fs.mkdir(outDir, { recursive: true });

const files = await fs.readdir(srcDir);

for (const file of files) {
  if (file.startsWith('.')) continue;
  if (file.includes('-.') || file.includes(' - copia')) {
    console.log(`Skipping duplicate raw backup: ${file}`);
    continue;
  }

  const srcPath = path.join(srcDir, file);
  const ext = path.extname(file).toLowerCase();
  const baseName = path.basename(file, path.extname(file));

  const stats = await fs.stat(srcPath);
  console.log(`Processing ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);

  if (ext === '.png') {
    // Keep PNG for logo with transparency
    await sharp(srcPath)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(outDir, `${baseName}.png`));
    console.log(` -> Saved ${baseName}.png`);
  } else if (file === 'profile-pic.JPEG' || file === 'profile-pic.jpeg' || file === 'profile-pic.jpg') {
    await sharp(srcPath)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(path.join(outDir, `profile-pic.jpg`));
    // Also generate webp
    await sharp(srcPath)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(outDir, `profile-pic.webp`));
    console.log(` -> Saved profile-pic.jpg & webp`);
  } else {
    // Background images
    const img = sharp(srcPath).resize({ width: 1920, withoutEnlargement: true });
    
    // Output both modern WebP and optimized JPG for complete backwards compatibility
    await img.clone().webp({ quality: 82 }).toFile(path.join(outDir, `${baseName}.webp`));
    await img.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(outDir, `${baseName}.jpg`));
    
    console.log(` -> Saved ${baseName}.webp & ${baseName}.jpg`);
  }
}

console.log('Asset optimization completed!');
