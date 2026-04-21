#!/usr/bin/env tsx
/**
 * generate-audio.ts — narrate a single post via ElevenLabs and publish to Vercel Blob.
 *
 * Usage:
 *   npm run generate-audio -- --slug <post-slug>
 *
 * Reads src/content/posts/<slug>.mdx, sanitizes the MDX body into narration
 * text, calls ElevenLabs (eleven_multilingual_v2 / mp3_44100_128), uploads the
 * MP3 to Vercel Blob at audio/posts/<slug>.mp3, and writes the resulting URL
 * plus a generated-at timestamp back into the post's frontmatter.
 */

import fs       from 'node:fs';
import os       from 'node:os';
import path     from 'node:path';
import readline from 'node:readline/promises';
import { Readable }              from 'node:stream';
import { pipeline }              from 'node:stream/promises';
import { stdin, stdout }         from 'node:process';

import matter                    from 'gray-matter';
import { ElevenLabsClient }      from '@elevenlabs/elevenlabs-js';
import { put }                   from '@vercel/blob';

import { sanitizeMdxToNarration } from './lib/sanitize-narration.ts';

// ── .env.local loader ───────────────────────────────────────────────────────
// Small inline loader — avoids adding a dotenv dependency just for one file.

function loadDotenv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotenv(path.resolve('.env.local'));

// ── Frontmatter surgical patch ──────────────────────────────────────────────
/**
 * Replace or append the `audio` and `audioGeneratedAt` lines in the YAML
 * frontmatter of an MDX file's raw text. Every other line is left untouched
 * (byte-for-byte), so we don't churn quote style, date formats, or line
 * wrapping on unrelated fields.
 *
 * Assumes both target fields are single-line when present (which they always
 * are when written by this script).
 */
function patchAudioFrontmatter(
  raw: string,
  updates: { audio: string; audioGeneratedAt: Date },
): string {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*)?$/);
  if (!m) throw new Error('No YAML frontmatter block found in MDX file.');

  const [, fmText, afterFm = ''] = m;
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = fmText.split(/\r?\n/);

  const audioLine = `audio: "${updates.audio.replace(/"/g, '\\"')}"`;
  const dateLine  = `audioGeneratedAt: ${updates.audioGeneratedAt.toISOString()}`;

  const replaceOrAppend = (key: string, newLine: string): void => {
    const idx = lines.findIndex(line => new RegExp(`^${key}\\s*:`).test(line));
    if (idx !== -1) lines[idx] = newLine;
    else            lines.push(newLine);
  };

  replaceOrAppend('audio',            audioLine);
  replaceOrAppend('audioGeneratedAt', dateLine);

  return `---${eol}${lines.join(eol)}${eol}---${afterFm}`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function getArg(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

// ── Arg + env validation ────────────────────────────────────────────────────

const slug = getArg('--slug');
if (!slug) {
  fail('--slug is required.\n  Usage: npm run generate-audio -- --slug <post-slug>');
}

const apiKey    = process.env.ELEVENLABS_API_KEY;
const voiceId   = process.env.ELEVENLABS_VOICE_ID;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

if (!apiKey)    fail('ELEVENLABS_API_KEY is not set (check .env.local).');
if (!voiceId)   fail('ELEVENLABS_VOICE_ID is not set (check .env.local).');
if (!blobToken) fail('BLOB_READ_WRITE_TOKEN is not set (check .env.local).');

const POST_PATH = path.resolve('src/content/posts', `${slug}.mdx`);
if (!fs.existsSync(POST_PATH)) fail(`Post not found: ${POST_PATH}`);

const LOG_PATH = path.resolve('scripts/audio-generation.log');

// ── Read + parse frontmatter ────────────────────────────────────────────────

const raw = fs.readFileSync(POST_PATH, 'utf8');
const { data: frontmatter, content: body } = matter(raw);

const title = typeof frontmatter.title === 'string' ? frontmatter.title : '';
const why   = typeof frontmatter.why   === 'string' ? frontmatter.why   : undefined;

if (!title) fail('Frontmatter `title` is required for narration.');

// ── Sanitize ────────────────────────────────────────────────────────────────

const narration = sanitizeMdxToNarration({ title, why, body });
const charCount = narration.length;

console.log('\n── Narration text ─────────────────────────────────────────────\n');
console.log(narration);
console.log('\n── Stats ──────────────────────────────────────────────────────');
console.log(`Slug:              ${slug}`);
console.log(`Character count:   ${charCount}`);
console.log(`Est. credit cost:  ${charCount} (Multilingual v2 = 1 credit/char; includes SSML tags)`);
console.log();

// ── Confirm ─────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: stdin, output: stdout });
const answer = (await rl.question("Type 'yes' to proceed with ElevenLabs generation: ")).trim().toLowerCase();
rl.close();
if (answer !== 'yes') {
  console.log('Aborted. No API call made.');
  process.exit(0);
}

// ── Generate + upload + write-back ──────────────────────────────────────────

const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-'));
const tmpPath = path.join(tmpDir, `${slug}.mp3`);

try {
  console.log('Calling ElevenLabs…');
  const client = new ElevenLabsClient({ apiKey });

  const { data: stream, rawResponse } = await client.textToSpeech
    .convert(voiceId, {
      text: narration,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    })
    .withRawResponse();

  // Capture cost-tracking headers. Names per ElevenLabs API; log what we got.
  const characterCount =
    rawResponse.headers.get('x-character-count') ??
    rawResponse.headers.get('character-cost') ??
    '';
  const requestId = rawResponse.headers.get('request-id') ?? '';

  // Stream the MP3 response to a temp file.
  const nodeStream = Readable.fromWeb(stream as unknown as import('node:stream/web').ReadableStream<Uint8Array>);
  await pipeline(nodeStream, fs.createWriteStream(tmpPath));

  const fileSize = fs.statSync(tmpPath).size;
  console.log(`Received MP3 (${(fileSize / 1024).toFixed(1)} KB). Uploading to Vercel Blob…`);

  // Upload to Vercel Blob. `allowOverwrite` + `addRandomSuffix: false`
  // keep the URL stable across regenerations.
  const audioBuffer = fs.readFileSync(tmpPath);
  const blob = await put(`audio/posts/${slug}.mp3`, audioBuffer, {
    access:          'public',
    contentType:     'audio/mpeg',
    addRandomSuffix: false,
    allowOverwrite:  true,
    token:           blobToken,
  });

  // Write frontmatter back via a surgical patch. We deliberately do NOT use
  // matter.stringify() — it re-serializes every field through js-yaml, which
  // normalizes quote style, expands dates to full ISO timestamps, and flow-
  // folds long strings. We want every other field left byte-for-byte intact.
  const generatedAt = new Date();
  const patched     = patchAudioFrontmatter(raw, { audio: blob.url, audioGeneratedAt: generatedAt });
  fs.writeFileSync(POST_PATH, patched, 'utf8');

  // Append a single log line for monthly credit tracking.
  const logLine = [
    generatedAt.toISOString(),
    slug,
    characterCount || '-',
    requestId || '-',
  ].join(' ') + '\n';
  fs.appendFileSync(LOG_PATH, logLine, 'utf8');

  // Success summary.
  console.log('\n── Success ────────────────────────────────────────────────────');
  console.log(`Generated:       ${slug}.mp3`);
  console.log(`Characters:      ${characterCount || '(header missing)'}`);
  console.log(`Credits used:    ${characterCount || '(header missing)'}`);
  console.log(`Request ID:      ${requestId || '(header missing)'}`);
  console.log(`URL:             ${blob.url}`);
  console.log();
} catch (err) {
  console.error('\nGeneration failed.');
  console.error(err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
} finally {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
}
