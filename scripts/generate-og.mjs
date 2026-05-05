/*
 * generate-og.mjs — generate 1200×630 WebP social-card variants from
 * each hero PNG in src/assets/heroes/, written to public/og/<slug>.webp.
 *
 * Social platforms (FB, X, LinkedIn) ignore srcset and pull a single
 * image URL, so the post template emits /og/<slug>.webp directly. We
 * use q80 here (vs q60 for in-page hero variants) because OG cards are
 * a one-shot first impression and the file delta between q60 and q80
 * at this resolution is small in absolute bytes.
 *
 * Run: `npm run generate-og`. Idempotent — safe to re-run after adding
 * a new hero.
 */
import sharp from 'sharp';
import fs    from 'node:fs/promises';
import path  from 'node:path';
import { glob } from 'glob';

const SRC_DIR = 'src/assets/heroes';
const OUT_DIR = 'public/og';
const W = 1200, H = 630, Q = 80;

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const sources = await glob(`${SRC_DIR}/*.png`);
  if (sources.length === 0) {
    console.warn(`no PNGs found under ${SRC_DIR}/`);
    return;
  }
  for (const src of sources) {
    const slug = path.basename(src, '.png');
    const out  = path.join(OUT_DIR, `${slug}.webp`);
    await sharp(src)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .webp({ quality: Q })
      .toFile(out);
    const { size } = await fs.stat(out);
    console.log(`${slug}.webp  ${(size / 1024).toFixed(1)} KB`);
  }
  console.log(`\nWrote ${sources.length} OG images to ${OUT_DIR}/`);
}

main().catch(err => { console.error(err); process.exit(1); });
