/*
 * prune-build-orphans.mjs — remove unreferenced raster originals from
 * dist/_astro/ after the build.
 *
 * Astro's image pipeline emits both the optimized variants AND the source
 * file into dist/_astro/ whenever an image is referenced via the content-
 * collection image() helper, even if no rendered HTML actually links to
 * the original. For the hero pipeline this means ~30 MB per source PNG
 * sitting in the build output as dead weight (~500 MB total).
 *
 * This script scans all rendered HTML/CSS/JS in dist/ for /_astro/
 * references, lists the actual files in dist/_astro/, and deletes any
 * file that isn't referenced anywhere. Safe by construction — only
 * touches dist/_astro/ files with no inbound references.
 *
 * Run automatically as `postbuild`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';

const DIST = 'dist';
const ASTRO_DIR = `${DIST}/_astro`;
const REF_RE = /\/_astro\/[A-Za-z0-9._-]+/g;

async function main() {
  // Guard: nothing to do if dist/_astro doesn't exist (e.g., a clean repo).
  try { await fs.access(ASTRO_DIR); } catch { return; }

  // Collect every /_astro/... reference in rendered text outputs.
  const textFiles = await glob(`${DIST}/**/*.{html,css,js,xml,json,svg}`);
  const referenced = new Set();
  for (const f of textFiles) {
    const text = await fs.readFile(f, 'utf-8');
    const matches = text.match(REF_RE);
    if (!matches) continue;
    for (const m of matches) referenced.add(m.slice('/_astro/'.length));
  }

  // List every file in dist/_astro/ and remove the ones nobody links to.
  const all = await fs.readdir(ASTRO_DIR);
  let removed = 0, bytesFreed = 0;
  for (const name of all) {
    if (referenced.has(name)) continue;
    const full = path.join(ASTRO_DIR, name);
    const { size } = await fs.stat(full);
    await fs.unlink(full);
    removed++;
    bytesFreed += size;
  }
  if (removed === 0) {
    console.log('prune: no orphan assets in dist/_astro/');
    return;
  }
  console.log(
    `prune: removed ${removed} orphan asset${removed === 1 ? '' : 's'} ` +
    `(${(bytesFreed / 1024 / 1024).toFixed(1)} MB) from dist/_astro/`,
  );
}

main().catch(err => { console.error(err); process.exit(1); });
