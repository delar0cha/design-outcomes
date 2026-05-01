/* Build-time pixel-art generator for opt-in image folders.
 *
 * Targets public/images/covers/** and public/images/avatars/** by
 * convention — anything dropped in those folders gets a sibling
 * `.pixel.png` written next to it: 64px wide, grayscale, posterized
 * to 8 colours (3-bit), nearest-neighbour resampled. The browser
 * upscales it with image-rendering: pixelated.
 *
 * Run with: npm run generate-pixelart
 *
 * Note: ReadingShelf book covers come from Open Library by ISBN at
 * runtime, so they cannot be pre-baked here. Those use the CSS
 * bitcrush filter instead (see terminal.css). This script handles
 * locally-hosted covers / avatars only. */

import sharp from 'sharp';
import { glob } from 'glob';

async function imageToPixelArt(imagePath, { targetWidth = 64 } = {}) {
  const meta = await sharp(imagePath).metadata();
  if (!meta.width || !meta.height) throw new Error(`No dimensions: ${imagePath}`);
  const aspect = meta.height / meta.width;
  const targetHeight = Math.max(1, Math.round(targetWidth * aspect));

  await sharp(imagePath)
    .resize(targetWidth, targetHeight, { kernel: 'nearest' })
    .modulate({ saturation: 0 })
    .png({ palette: true, colors: 8 })
    .toFile(imagePath.replace(/\.(png|jpg|jpeg|webp)$/i, '.pixel.png'));
}

async function main() {
  const targets = await glob('public/images/{covers,avatars}/**/*.{png,jpg,jpeg,webp}', {
    ignore: '**/*.pixel.*',
  });
  if (!targets.length) {
    console.log('  no targets — drop images under public/images/covers/ or public/images/avatars/');
    return;
  }
  for (const file of targets) {
    try {
      await imageToPixelArt(file);
      console.log('  pixel:', file);
    } catch (err) {
      console.warn('  skip:', file, '—', err.message);
    }
  }
}

main();
