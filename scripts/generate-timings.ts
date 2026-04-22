#!/usr/bin/env tsx
/**
 * generate-timings.ts — produce approximate word-level timings JSON for
 * posts with audio, so the homepage carousel's karaoke narration panel
 * has something to animate against.
 *
 * Usage:
 *   npm run generate-timings                  — all posts with audio that
 *                                               don't already have a
 *                                               timings file.
 *   npm run generate-timings -- --slug <slug> — a specific post.
 *   npm run generate-timings -- --force       — overwrite existing files.
 *
 * Pacing is a linear approximation — words-per-second × text, with
 * inter-sentence pauses taken directly from the <break time="Xs"/> tags
 * that sanitize-narration inserts. It won't match the actual narrated
 * audio exactly, but it reads as plausibly synced. When WhisperX-based
 * alignment is wired up later, it replaces this file one-for-one (same
 * JSON shape, same output location, same frontmatter field).
 *
 * The script also patches the post's MDX frontmatter to add `timings:
 * /timings/<slug>.json` if absent. Patch is surgical: it leaves every
 * other frontmatter line byte-for-byte intact (same approach as
 * generate-audio.ts's patchAudioFrontmatter).
 */

import fs   from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

import { sanitizeMdxToNarration } from './lib/sanitize-narration.ts';

// ── Calibration ─────────────────────────────────────────────────────────────
// ElevenLabs multilingual-v2 narration paces at ~2.5 words/second for
// reflective prose (measured against the leverage article: ~650 words /
// 261s ≈ 2.5). Adjust here if you recalibrate.
const WORDS_PER_SEC = 2.5;

// ── Arg parsing ─────────────────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

const targetSlug = getArg('--slug');
const force      = hasFlag('--force');

// ── Frontmatter patch ───────────────────────────────────────────────────────
/**
 * Insert a `timings` line into the YAML frontmatter if it isn't already
 * present. Placed immediately after `audioGeneratedAt:` if found,
 * otherwise after `audio:`, otherwise at the end of the block. Every
 * other line is preserved exactly — no quote-style normalisation, no
 * re-wrapping, no date coercion.
 */
function patchTimingsFrontmatter(raw: string, slug: string): string {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*)?$/);
  if (!m) throw new Error('No YAML frontmatter block found in MDX file.');

  const [, fmText, afterFm = ''] = m;
  const eol   = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = fmText.split(/\r?\n/);

  const timingsLine = `timings: /timings/${slug}.json`;

  // Already present — no-op.
  if (lines.some(line => /^timings\s*:/.test(line))) return raw;

  const afterKey = (key: string) => lines.findIndex(l => new RegExp(`^${key}\\s*:`).test(l));
  let insertAt = afterKey('audioGeneratedAt');
  if (insertAt === -1) insertAt = afterKey('audio');

  if (insertAt !== -1) {
    lines.splice(insertAt + 1, 0, timingsLine);
  } else {
    lines.push(timingsLine);
  }

  return `---${eol}${lines.join(eol)}${eol}---${afterFm}`;
}

// ── Narration → lines of word timings ───────────────────────────────────────

interface TimedWord { start: number; word: string; }
interface TimedLine { start: number; words: TimedWord[]; }

/**
 * Convert sanitised narration text (with embedded <break time="Xs"/>
 * tags) into an array of narration lines with per-word start times.
 *
 * Approach:
 *   1. Split the text on break tags, keeping pause durations.
 *   2. Split each text segment into sentences (on .?! boundaries).
 *   3. Walk sentence-by-sentence, assigning each word a start time of
 *      `cursor + wordIndex / WORDS_PER_SEC`. After each sentence
 *      advance the cursor by (wordCount / WORDS_PER_SEC) plus a small
 *      natural pause (0.25s); after a break tag, add its full
 *      duration.
 */
function narrationToLines(narration: string): TimedLine[] {
  const BREAK_RE    = /<break time="([\d.]+)s"\/>/g;
  const SENTENCE_RE = /[^.!?]+[.!?]+(?=\s|$)/g;

  interface Chunk { kind: 'text'; value: string; }
  interface Break { kind: 'break'; duration: number; }
  const parts: (Chunk | Break)[] = [];

  let last = 0;
  let mt: RegExpExecArray | null;
  while ((mt = BREAK_RE.exec(narration)) !== null) {
    if (mt.index > last) {
      parts.push({ kind: 'text', value: narration.slice(last, mt.index) });
    }
    parts.push({ kind: 'break', duration: parseFloat(mt[1]) });
    last = mt.index + mt[0].length;
  }
  if (last < narration.length) {
    parts.push({ kind: 'text', value: narration.slice(last) });
  }

  const lines: TimedLine[] = [];
  let cursor = 0;

  for (const part of parts) {
    if (part.kind === 'break') {
      cursor += part.duration;
      continue;
    }

    const text = part.value.trim();
    if (!text) continue;

    // Split into sentences. If nothing matches (no terminal punctuation),
    // treat the whole thing as a single sentence.
    const sentences = text.match(SENTENCE_RE) ?? [text];

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) continue;

      const lineStart = cursor;
      const wordTimings: TimedWord[] = words.map((word, i) => ({
        start: round(cursor + i / WORDS_PER_SEC),
        word,
      }));

      lines.push({ start: round(lineStart), words: wordTimings });

      // Advance the cursor by the duration of spoken words plus a small
      // natural inter-sentence pause.
      cursor += words.length / WORDS_PER_SEC + 0.25;
    }
  }

  return lines;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Per-post runner ─────────────────────────────────────────────────────────

function generateForSlug(slug: string, { force }: { force: boolean }): boolean {
  const postPath = path.resolve('src/content/posts', `${slug}.mdx`);
  if (!fs.existsSync(postPath)) {
    console.warn(`[skip] ${slug}: post file not found at ${postPath}`);
    return false;
  }

  const raw = fs.readFileSync(postPath, 'utf8');
  const { data: fm, content: body } = matter(raw);

  if (!fm.audio) {
    console.log(`[skip] ${slug}: no audio field`);
    return false;
  }

  const outPath = path.resolve('public/timings', `${slug}.json`);
  if (fs.existsSync(outPath) && !force) {
    console.log(`[skip] ${slug}: timings file already exists (use --force to overwrite)`);
    // Still patch frontmatter if the field is missing — paranoid guard.
    if (!fm.timings) {
      const patched = patchTimingsFrontmatter(raw, slug);
      if (patched !== raw) {
        fs.writeFileSync(postPath, patched, 'utf8');
        console.log(`[patch] ${slug}: added timings frontmatter field`);
      }
    }
    return false;
  }

  const title = typeof fm.title === 'string' ? fm.title : '';
  const why   = typeof fm.why   === 'string' ? fm.why   : undefined;
  if (!title) {
    console.warn(`[skip] ${slug}: no title`);
    return false;
  }

  const narration = sanitizeMdxToNarration({ title, why, body });
  const lines     = narrationToLines(narration);

  const last = lines[lines.length - 1];
  const estDuration = last ? last.words[last.words.length - 1].start : 0;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(lines, null, 2) + '\n', 'utf8');
  console.log(`[write] ${slug}: ${lines.length} lines, ends at ~${estDuration.toFixed(1)}s → ${path.relative(process.cwd(), outPath)}`);

  // Patch frontmatter to add the field.
  const patched = patchTimingsFrontmatter(raw, slug);
  if (patched !== raw) {
    fs.writeFileSync(postPath, patched, 'utf8');
    console.log(`[patch] ${slug}: added timings frontmatter field`);
  }

  return true;
}

// ── Entry ───────────────────────────────────────────────────────────────────

const postsDir = path.resolve('src/content/posts');

if (targetSlug) {
  generateForSlug(targetSlug, { force });
} else {
  const files = fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.mdx') && !f.startsWith('_'));
  let count = 0;
  for (const file of files) {
    const slug = file.replace(/\.mdx$/, '');
    if (generateForSlug(slug, { force })) count += 1;
  }
  console.log(`\nDone. Wrote timings for ${count} post(s).`);
}
