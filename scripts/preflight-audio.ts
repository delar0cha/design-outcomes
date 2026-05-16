#!/usr/bin/env tsx
/**
 * preflight-audio.ts — pre-batch credit check before a multi-article narration run.
 *
 * Usage:
 *   npm run preflight-audio                 # check pending posts in CURRENT_ISSUE
 *   npm run preflight-audio -- --issue 6    # override issue number
 *   npm run preflight-audio -- --headroom 0.15   # require 15% buffer over need (default 10%)
 *
 * Scans src/content/posts/*.mdx for posts where `issue` matches the target
 * issue and `audio` is unset. Sanitizes each one through the same pipeline
 * generate-audio uses, sums the character counts, and compares against the
 * ElevenLabs account balance fetched from /v1/user/subscription.
 *
 * Exit codes:
 *   0 — PASS (sufficient balance with headroom) or TIGHT (covers but thin)
 *   1 — FAIL (insufficient balance) or missing config
 *
 * Read-only. Makes one ElevenLabs API call (subscription GET); no generation,
 * no MDX writes, no Blob uploads.
 */

import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

import { sanitizeMdxToNarration } from './lib/sanitize-narration.ts';
import { CURRENT_ISSUE } from '../src/lib/issue.ts';

// ── .env.local loader (copied from generate-audio.ts) ───────────────────────

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

// ── Args ────────────────────────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

function fail(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

const issueArg     = getArg('--issue');
const headroomArg  = getArg('--headroom');
const targetIssue  = issueArg ? Number.parseInt(issueArg, 10) : CURRENT_ISSUE.issueNumber;
const headroomPct  = headroomArg ? Number.parseFloat(headroomArg) : 0.10;

if (!Number.isFinite(targetIssue) || targetIssue <= 0) {
  fail(`--issue must be a positive integer (got "${issueArg}")`);
}
if (!Number.isFinite(headroomPct) || headroomPct < 0) {
  fail(`--headroom must be a non-negative number (got "${headroomArg}")`);
}

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) fail('ELEVENLABS_API_KEY is not set (check .env.local).');

// ── Scan pending posts ──────────────────────────────────────────────────────

const POSTS_DIR = path.resolve('src/content/posts');
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));

interface PendingPost {
  slug: string;
  title: string;
  chars: number;
}

const pending: PendingPost[] = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const { data, content } = matter(raw);

  if (data.issue !== targetIssue) continue;
  if (typeof data.audio === 'string' && data.audio.length > 0) continue;

  const title = typeof data.title === 'string' ? data.title : file;
  const why   = typeof data.why   === 'string' ? data.why   : undefined;

  const narration = sanitizeMdxToNarration({ title, why, body: content });

  pending.push({
    slug:  file.replace(/\.mdx$/, ''),
    title,
    chars: narration.length,
  });
}

pending.sort((a, b) => a.slug.localeCompare(b.slug));
const totalNeed = pending.reduce((sum, p) => sum + p.chars, 0);

// ── Fetch ElevenLabs subscription ───────────────────────────────────────────

console.log('Fetching ElevenLabs subscription…');
let sub: {
  tier?: string;
  character_count: number;
  character_limit: number;
  next_character_count_reset_unix?: number;
  status?: string;
};

try {
  const resp = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: { 'xi-api-key': apiKey },
  });
  if (!resp.ok) {
    const body = await resp.text();
    fail(`ElevenLabs API returned ${resp.status} ${resp.statusText}\n${body}`);
  }
  sub = await resp.json();
} catch (err) {
  fail(`Failed to fetch ElevenLabs subscription: ${err instanceof Error ? err.message : String(err)}`);
}

const used      = sub.character_count;
const limit     = sub.character_limit;
const unlimited = limit < 0;
const remaining = unlimited ? Number.POSITIVE_INFINITY : limit - used;

// ── Report ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('en-US');

console.log('\n── ElevenLabs balance ───────────────────────────────────────');
console.log(`Tier:       ${sub.tier ?? '(unknown)'}`);
console.log(`Status:     ${sub.status ?? '(unknown)'}`);
console.log(`Used:       ${fmt(used)} chars`);
if (unlimited) {
  console.log('Limit:      (unlimited)');
} else {
  console.log(`Limit:      ${fmt(limit)} chars`);
  console.log(`Remaining:  ${fmt(remaining)} chars`);
}
if (sub.next_character_count_reset_unix) {
  const reset = new Date(sub.next_character_count_reset_unix * 1000);
  console.log(`Next reset: ${reset.toISOString().slice(0, 10)} (${reset.toISOString()})`);
}

const issuePad = String(targetIssue).padStart(2, '0');
console.log(`\n── Pending Issue ${issuePad} posts ───────────────────────────────────`);

if (pending.length === 0) {
  console.log(`No posts found with issue===${targetIssue} and no audio field set.`);
  console.log('Nothing to narrate. Exiting.');
  process.exit(0);
}

console.log(`Found ${pending.length} post(s) with no audio field set:\n`);
for (const p of pending) {
  console.log(`  ${p.chars.toString().padStart(7)} chars  ${p.slug}`);
}
console.log('  ' + '─'.repeat(56));
console.log(`  ${totalNeed.toString().padStart(7)} chars  TOTAL across ${pending.length} post(s)`);

// ── Verdict ─────────────────────────────────────────────────────────────────

console.log('\n── Verdict ─────────────────────────────────────────────────');

if (unlimited) {
  console.log('PASS — account is on an unlimited tier; no balance constraint.');
  process.exit(0);
}

const buffer        = remaining - totalNeed;
const bufferPctNeed = totalNeed > 0 ? (buffer / totalNeed) * 100 : Number.POSITIVE_INFINITY;
const minBuffer     = Math.ceil(totalNeed * headroomPct);

if (remaining < totalNeed) {
  const short = totalNeed - remaining;
  console.log(`FAIL — short by ${fmt(short)} chars.`);
  console.log(`        Need ${fmt(totalNeed)}, have ${fmt(remaining)} remaining.`);
  console.log(`        Top up ElevenLabs credits before generating.`);
  process.exit(1);
}

if (buffer < minBuffer) {
  console.log(`TIGHT — covers the run but headroom is below the ${(headroomPct * 100).toFixed(0)}% threshold.`);
  console.log(`        Need ${fmt(totalNeed)}, have ${fmt(remaining)} (${fmt(buffer)}-char buffer = ${bufferPctNeed.toFixed(1)}% of need).`);
  console.log(`        Generation should succeed if all articles complete on the first attempt with no regenerations.`);
  process.exit(0);
}

console.log(`PASS — ${bufferPctNeed.toFixed(1)}% headroom over the run.`);
console.log(`        Need ${fmt(totalNeed)}, have ${fmt(remaining)} remaining (${fmt(buffer)}-char buffer).`);
process.exit(0);
