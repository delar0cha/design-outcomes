/*
 * generate-ascii.mjs — convert every raster under public/images/ into
 * three ASCII text renderings (large / medium / small) sized for
 * different terminal-mode render contexts.
 *
 * lg = 400 cols  → article hero, homepage NOW READING block
 * md = 240 cols  → MDX inline images, card thumbnails
 * sm = 140 cols  → book covers, byline avatars
 *
 * Each output sits as a sibling text file next to the source:
 *   public/images/foo.png
 *   public/images/foo.ascii-lg.txt
 *   public/images/foo.ascii-md.txt
 *   public/images/foo.ascii-sm.txt
 *
 * Commit the .txt outputs so request-time rendering is a plain
 * fs.readFileSync, no conversion at runtime.
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';

// 70-char ramp from " " (full dark) up to "$" (full bright). Reversed
// at runtime so dense glyphs render the bright pixels — this is the
// right polarity for a green-on-black terminal where bright == phosphor.
const RAMP = ` .'\`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$`;

async function imageToAscii(imagePath, { cols }) {
  const chars = RAMP.split('').reverse().join('');

  const meta = await sharp(imagePath).metadata();
  if (!meta.width || !meta.height) throw new Error(`no dims for ${imagePath}`);
  const aspect = meta.height / meta.width;
  // Plex Mono character cells are ~2x taller than wide. Scale the row
  // count by 0.5 to keep the ASCII output's apparent aspect ratio
  // close to the source.
  const rows = Math.max(1, Math.round(cols * aspect * 0.5));

  const { data, info } = await sharp(imagePath)
    .resize(cols, rows, { fit: 'fill' })
    .grayscale()
    .normalize()
    .modulate({ brightness: 1.05 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let out = '';
  for (let y = 0; y < info.height; y++) {
    let line = '';
    for (let x = 0; x < info.width; x++) {
      const luma = data[y * info.width + x];
      const idx = Math.floor((luma / 255) * (chars.length - 1));
      line += chars[idx];
    }
    out += line + '\n';
  }
  return out;
}

async function main() {
  const targets = await glob('public/images/**/*.{png,jpg,jpeg,webp}', {
    ignore: ['**/og/**', '**/*.ascii-*'],
  });
  if (!targets.length) {
    console.warn('no images found under public/images/');
    return;
  }
  console.log(`converting ${targets.length} image(s)…`);
  for (const file of targets) {
    try {
      const lg = await imageToAscii(file, { cols: 400 });
      const md = await imageToAscii(file, { cols: 240 });
      const sm = await imageToAscii(file, { cols: 140 });
      const base = file.replace(/\.(png|jpg|jpeg|webp)$/i, '');
      await fs.writeFile(`${base}.ascii-lg.txt`, lg, 'utf-8');
      await fs.writeFile(`${base}.ascii-md.txt`, md, 'utf-8');
      await fs.writeFile(`${base}.ascii-sm.txt`, sm, 'utf-8');
      console.log('  ascii:', path.relative(process.cwd(), file));
    } catch (err) {
      console.error('  FAIL :', file, err.message);
    }
  }
  console.log('done.');
}

main().catch(e => { console.error(e); process.exit(1); });
