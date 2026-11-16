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

  if (file === 'logo.png') {
    // Keep transparent PNG for logo
    await sharp(srcPath)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(outDir, `${baseName}.png`));
    await sharp(srcPath)
      .webp({ quality: 90 })
      .toFile(path.join(outDir, `${baseName}.webp`));
    console.log(` -> Saved ${baseName}.png & webp`);
  } else if (file.toLowerCase().startsWith('profile-pic')) {
    await sharp(srcPath)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(path.join(outDir, `profile-pic.jpg`));
    await sharp(srcPath)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(outDir, `profile-pic.webp`));
    console.log(` -> Saved profile-pic.jpg & webp`);
  } else {
    // All background images (JPG or PNG like bg-tech-mobile.png)
    const img = sharp(srcPath).resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true });
    
    await img.clone().webp({ quality: 82 }).toFile(path.join(outDir, `${baseName}.webp`));
    await img.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(outDir, `${baseName}.jpg`));
    if (ext === '.png') {
      await img.clone().png({ quality: 85, compressionLevel: 8 }).toFile(path.join(outDir, `${baseName}.png`));
    }
    console.log(` -> Saved ${baseName}.webp, jpg${ext === '.png' ? ', png' : ''}`);
  }
}

console.log('Asset optimization completed!');
