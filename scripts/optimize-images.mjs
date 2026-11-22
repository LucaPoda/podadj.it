import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const srcDir = './assets';
const outDir = './public/assets';
const validExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);

await fs.mkdir(outDir, { recursive: true });

async function processDirectory(relativeDir = '') {
  const currentSrc = relativeDir ? path.join(srcDir, relativeDir) : srcDir;
  const entries = await fs.readdir(currentSrc, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith('.')) continue;
    if (name.includes('-.') || name.includes(' - copia')) {
      console.log(`Skipping duplicate raw backup: ${path.join(relativeDir, name)}`);
      continue;
    }

    const nextRel = relativeDir ? path.join(relativeDir, name) : name;
    const srcPath = path.join(srcDir, nextRel);

    if (entry.isDirectory()) {
      await processDirectory(nextRel);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(name).toLowerCase();
    if (!validExts.has(ext)) {
      console.log(`Skipping non-image file: ${nextRel}`);
      continue;
    }

    const stats = await fs.stat(srcPath);
    const baseName = path.basename(name, path.extname(name));
    const targetOutDir = relativeDir ? path.join(outDir, relativeDir) : outDir;
    await fs.mkdir(targetOutDir, { recursive: true });

    console.log(`Processing ${nextRel} (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);

    if (!relativeDir && name === 'logo.png') {
      await sharp(srcPath)
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(path.join(targetOutDir, `${baseName}.png`));
      await sharp(srcPath)
        .webp({ quality: 90 })
        .toFile(path.join(targetOutDir, `${baseName}.webp`));
      console.log(` -> Saved ${nextRel} (.png & .webp)`);
    } else if (!relativeDir && name.toLowerCase().startsWith('profile-pic')) {
      await sharp(srcPath)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(path.join(targetOutDir, 'profile-pic.jpg'));
      await sharp(srcPath)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(path.join(targetOutDir, 'profile-pic.webp'));
      console.log(` -> Saved profile-pic.jpg & webp`);
    } else {
      const img = sharp(srcPath).resize({
        width: 1920,
        height: 1920,
        fit: 'inside',
        withoutEnlargement: true,
      });

      await img.clone().webp({ quality: 82 }).toFile(path.join(targetOutDir, `${baseName}.webp`));
      await img
        .clone()
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(path.join(targetOutDir, `${baseName}.jpg`));
      if (ext === '.png') {
        await img
          .clone()
          .png({ quality: 85, compressionLevel: 8 })
          .toFile(path.join(targetOutDir, `${baseName}.png`));
      }
      console.log(
        ` -> Saved ${path.join(relativeDir, baseName)}.webp, .jpg${ext === '.png' ? ', .png' : ''}`
      );
    }
  }
}

await processDirectory('');
console.log('Asset optimization completed!');
