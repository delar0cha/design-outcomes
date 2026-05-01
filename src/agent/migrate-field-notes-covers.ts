#!/usr/bin/env tsx
/**
 * One-time migration: assign coverColor frontmatter to every published
 * Field Notes entry using the same adjacency-aware algorithm the agent
 * uses for new entries. Reads /published/*.mdx, sorts by piece_published_at
 * desc (matches the catalog index sort), assigns colors against an empty
 * prior history, and rewrites each file's frontmatter in place.
 *
 * Other frontmatter fields are not modified. Existing coverColor values are
 * overwritten by the migration (the whole history is being reassigned from
 * scratch).
 *
 * Run: npm run field-notes:migrate-covers
 */

import fs   from 'node:fs';
import path from 'node:path';
import { assignCoverColors, COVER_PALETTE, COVER_HEX } from './cover-assign.js';
import type { CoverColor, AssignCandidate } from './cover-assign.js';

const PUBLISHED_DIR = path.resolve('src/content/field-notes/published');
const COLS = 3;

// Tactic primary-tag → tactic CSS var key, mirroring FieldNoteCard.astro.
const TACTIC_VAR_KEY: Record<string, string> = {
  research_and_validation:      'research',
  systems_and_primitives:       'systems',
  prototyping_and_exploration:  'prototyping',
  critique_and_decision_making: 'critique',
  craft_and_detail:             'craft',
  cross_functional_and_process: 'cross',
  storytelling_and_narrative:   'storytelling',
  hiring_and_team:              'hiring',
};
// CSS var name → cover hex, from src/styles/global.css.
const TACTIC_HEX: Record<string, string> = {
  research:      '#1E3A5F',
  systems:       '#1F4D3A',
  prototyping:   '#6B3410',
  critique:      '#2C2A5A',
  craft:         '#1E3A5F',
  cross:         '#4A2545',
  storytelling:  '#6B3410',
  hiring:        '#2C2A5A',
};

interface Entry {
  file:           string;
  fullPath:       string;
  slug:           string;
  publishedAt:    number;
  primaryTactic:  string;
  oldHex:         string;
  rawFrontmatter: string;
  rawFile:        string;
}

function parseEntries(): Entry[] {
  if (!fs.existsSync(PUBLISHED_DIR)) {
    throw new Error(`Published directory not found: ${PUBLISHED_DIR}`);
  }
  const files = fs.readdirSync(PUBLISHED_DIR).filter(f => f.endsWith('.mdx'));
  const entries: Entry[] = [];
  for (const file of files) {
    const fullPath = path.join(PUBLISHED_DIR, file);
    const rawFile  = fs.readFileSync(fullPath, 'utf8');
    const m        = rawFile.match(/^---\n([\s\S]*?)\n---/);
    if (!m) {
      console.error(`  skip: ${file} has no frontmatter delimiters`);
      continue;
    }
    const fm   = m[1];
    const slug = fm.match(/^slug:\s*"?([^"\n]+)"?/m)?.[1]?.trim() ?? file.replace(/\.mdx$/, '');
    const dateStr = fm.match(/^piece_published_at:\s*([^\s#]+)/m)?.[1]?.trim();
    const dateMs  = dateStr ? Date.parse(dateStr) : NaN;
    const tagsBlock = fm.match(/^tactic_tags:\s*\n((?:\s*-\s*[a-z_]+\n?)+)/m)?.[1] ?? '';
    const firstTag  = tagsBlock.match(/^\s*-\s*([a-z_]+)/m)?.[1] ?? 'craft_and_detail';
    const cssKey    = TACTIC_VAR_KEY[firstTag] ?? 'craft';
    entries.push({
      file,
      fullPath,
      slug,
      publishedAt:    Number.isFinite(dateMs) ? dateMs : 0,
      primaryTactic:  firstTag,
      oldHex:         TACTIC_HEX[cssKey] ?? '#unknown',
      rawFrontmatter: fm,
      rawFile,
    });
  }
  return entries;
}

/** Insert or replace a `coverColor: "<name>"` line in the YAML frontmatter
 *  without disturbing any other field. Inserted right before
 *  `suggested_connections:` (mirroring the agent's emission order). */
function rewriteFrontmatter(rawFile: string, color: CoverColor): string {
  const fmMatch = rawFile.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!fmMatch) throw new Error('no frontmatter');
  const [, head, fmBody, tail] = fmMatch;
  let updated: string;
  if (/^coverColor:/m.test(fmBody)) {
    updated = fmBody.replace(/^coverColor:.*$/m, `coverColor: "${color}"`);
  } else if (/^suggested_connections:/m.test(fmBody)) {
    updated = fmBody.replace(/^suggested_connections:/m, `coverColor: "${color}"\nsuggested_connections:`);
  } else {
    // Fallback: append to end of frontmatter body.
    updated = fmBody + `\ncoverColor: "${color}"`;
  }
  return head + updated + tail + rawFile.slice(fmMatch[0].length);
}

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

function main(): void {
  const entries = parseEntries();
  if (!entries.length) {
    console.error('No published entries to migrate.');
    return;
  }
  // Date-desc sort, matching /field-notes index page. Items without a date
  // sink to the bottom (treated as oldest), same convention as the index.
  entries.sort((a, b) => b.publishedAt - a.publishedAt);

  const assignInputs: AssignCandidate[] = entries.map(e => ({
    slug:        e.slug,
    sourceId:    e.slug,
    publishedAt: e.publishedAt,
  }));
  const colors = assignCoverColors(assignInputs, [], msg => console.error(`  ${msg}`));

  // Sanity check on the assigned sequence.
  const conflict = neighborConflict(colors);
  if (conflict) {
    console.error(`\n  WARNING: position ${conflict.i} (${conflict.color}) shares its color with neighbor at ${conflict.ni}`);
    process.exitCode = 1;
  }

  // Report and write.
  console.log(`\nMigrating ${entries.length} published Field Notes\n`);
  console.log('Pos  Slug                                                            Old (tactic)        →  New');
  console.log('---  --------------------------------------------------------------  ------------------     ---------------');
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const pos = `r${Math.floor(i / COLS)}c${i % COLS}`;
    const old = `${e.primaryTactic.padEnd(28)} ${e.oldHex}`;
    const newName = colors[i];
    console.log(`${pos.padEnd(4)} ${e.slug.padEnd(63)} ${old}  →  ${newName.padEnd(13)} ${COVER_HEX[newName]}`);
  }

  console.log('\nFull date-desc color sequence:');
  console.log('  ' + colors.join(' → '));

  console.log('\nGrid (3-col, newest top-left):');
  for (let r = 0; r < Math.ceil(entries.length / COLS); r++) {
    const cells: string[] = [];
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      cells.push(idx < entries.length ? colors[idx].padEnd(15) : '—'.padEnd(15));
    }
    console.log('  ' + cells.join(''));
  }

  if (!conflict) {
    console.log('\nSanity check: no card shares its color with any grid neighbor. ✓');
  }

  // Write the files.
  let written = 0;
  for (let i = 0; i < entries.length; i++) {
    const e   = entries[i];
    const out = rewriteFrontmatter(e.rawFile, colors[i]);
    if (out !== e.rawFile) {
      fs.writeFileSync(e.fullPath, out, 'utf8');
      written++;
    }
  }
  console.log(`\nWrote ${written} of ${entries.length} files.`);
  console.log('Migration complete. Nothing committed — review the index page before deciding.');
}

main();
