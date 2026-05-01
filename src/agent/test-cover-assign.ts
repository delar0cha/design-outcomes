#!/usr/bin/env tsx
/**
 * Smoke test for the cover-color assignment algorithm. Runs three scenarios
 * against assignCoverColors and asserts the no-neighbor-conflict invariant
 * on the combined newest-first sequence (staged + last 6 published).
 *
 * Run: tsx src/agent/test-cover-assign.ts
 */

import { assignCoverColors, COVER_PALETTE, COVER_HEX } from './cover-assign.js';
import type { CoverColor, AssignCandidate, PublishedRef } from './cover-assign.js';

const COLS = 3;

function neighborConflict(seq: (CoverColor | null)[]): { i: number; ni: number; color: CoverColor } | null {
  for (let i = 0; i < seq.length; i++) {
    const my = seq[i];
    if (!my) continue;
    const col = i % COLS;
    const checks: number[] = [];
    if (i - COLS >= 0)                        checks.push(i - COLS);
    if (i + COLS < seq.length)                checks.push(i + COLS);
    if (col > 0)                              checks.push(i - 1);
    if (col < COLS - 1 && i + 1 < seq.length) checks.push(i + 1);
    for (const ni of checks) {
      if (seq[ni] === my) return { i, ni, color: my };
    }
  }
  return null;
}

function frequency(colors: CoverColor[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of COVER_PALETTE) out[c] = 0;
  for (const c of colors) out[c]++;
  return out;
}

function dayMs(d: number): number {
  return new Date(2026, 4, d).getTime(); // May 2026
}

function runScenario(
  label:         string,
  staged:        AssignCandidate[],
  lastPublished: PublishedRef[],
): void {
  console.log(`\n── ${label} ──────────────────────────────────────`);
  const colors  = assignCoverColors(staged, lastPublished, msg => console.log(`  [warn] ${msg}`));
  const seq     = [...colors, ...lastPublished.map(p => p.coverColor)];
  const freq    = frequency(colors);

  console.log('Grid (newest-first, 3-col):');
  for (let r = 0; r < Math.ceil(seq.length / COLS); r++) {
    const cells = [];
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      if (idx >= seq.length) { cells.push('—'); continue; }
      const tag = idx < colors.length ? `S${idx}` : `P${idx - colors.length}`;
      cells.push(`${tag}:${seq[idx] ?? 'null'}`.padEnd(22));
    }
    console.log('  ' + cells.join(''));
  }

  console.log('Staged assignments:');
  for (let i = 0; i < staged.length; i++) {
    console.log(`  ${staged[i].slug.padEnd(20)} → ${colors[i]}`);
  }
  console.log('Frequency in staged batch:', freq);

  const conflict = neighborConflict(seq);
  if (conflict) {
    console.log(`  FAIL: position ${conflict.i} (${conflict.color}) clashes with neighbor ${conflict.ni}`);
    process.exitCode = 1;
  } else {
    console.log('  OK: no neighbor conflicts.');
  }
}

// Scenario A: 8 staged, no published history (first run).
runScenario(
  'A: 8 staged, no prior published history',
  Array.from({ length: 8 }, (_, i) => ({
    slug:        `staged-${i + 1}`,
    sourceId:    `source-${i + 1}`,
    publishedAt: dayMs(8 - i),
  })),
  [],
);

// Scenario B: 5 staged with 6 published (mix of legacy null + colors).
runScenario(
  'B: 5 staged, 6 published (mixed colors + 2 legacy nulls)',
  Array.from({ length: 5 }, (_, i) => ({
    slug:        `staged-${i + 1}`,
    sourceId:    `source-${i + 1}`,
    publishedAt: dayMs(15 - i),
  })),
  [
    { slug: 'pub-1', coverColor: 'navy',          publishedAt: dayMs(8) },
    { slug: 'pub-2', coverColor: 'aubergine',     publishedAt: dayMs(7) },
    { slug: 'pub-3', coverColor: null,            publishedAt: dayMs(6) },
    { slug: 'pub-4', coverColor: 'sage',          publishedAt: dayMs(5) },
    { slug: 'pub-5', coverColor: null,            publishedAt: dayMs(4) },
    { slug: 'pub-6', coverColor: 'warm-charcoal', publishedAt: dayMs(3) },
  ],
);

// Scenario C: 12 staged in one batch (stress test).
runScenario(
  'C: 12 staged in one batch (stress)',
  Array.from({ length: 12 }, (_, i) => ({
    slug:        `staged-${i + 1}`,
    sourceId:    `source-${i + 1}`,
    publishedAt: dayMs(12 - i),
  })),
  [],
);

console.log('\nPalette:');
for (const name of COVER_PALETTE) {
  console.log(`  ${name.padEnd(15)} ${COVER_HEX[name]}`);
}
