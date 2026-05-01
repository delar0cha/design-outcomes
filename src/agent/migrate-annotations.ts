#!/usr/bin/env tsx
/**
 * One-time migration: regenerate annotation fields (card_title, card_abstract,
 * pull_quote, bullets, draft_notes, uncertainty_flags) for every published
 * Field Notes entry under the new length budgets in src/agent/schemas.ts.
 *
 * For each card the script re-fetches the source page, synthesizes a Source
 * + DiscoveredItem + RubricResult from existing frontmatter (so the rubric
 * doesn't need to re-run and editorial scoring stays stable), calls the
 * existing callAnnotation pipeline (which now retries-on-overflow and
 * truncates as a last resort), shows a side-by-side diff with character
 * counts, and prompts y/n/skip.
 *
 * On accept: rewrites only the annotation fields in place. coverColor,
 * tactic_tags, rubric_*, suggested_connections, source metadata, dates,
 * and the MDX body are preserved exactly.
 *
 * Run: npm run field-notes:migrate-annotations
 */

import fs                   from 'node:fs';
import path                 from 'node:path';
import * as readline        from 'node:readline/promises';
import { stdin, stdout }    from 'node:process';
import { callAnnotation, fetchFullText, makeClient } from './run.js';
import type { Source, DiscoveredItem, RubricResult } from './run.js';
import {
  AnnotationSchema,
  ANNOTATION_LIMITS,
  findAnnotationLengthViolations,
} from './schemas.js';
import type { AnnotationResult } from './schemas.js';

const PUBLISHED_DIR = path.resolve('src/content/field-notes/published');

// ── Frontmatter parsing helpers ─────────────────────────────────────────────

interface ExistingCard {
  file:       string;
  fullPath:   string;
  rawFile:    string;
  fmRaw:      string;            // original frontmatter text
  bodyRaw:    string;            // text after closing ---
  headRaw:    string;            // opening "---\n"
  tailRaw:    string;            // closing "\n---"
  // parsed:
  slug:       string;
  source_id:  string;
  source_name:string;
  source_url: string;
  piece_title:string | null;
  piece_author: string | null;
  piece_published_at: string | null;
  tactic_tags: string[];
  rubric_scores: RubricResult['scores'];
  rubric_total: number;
  rubric_verdict: 'explicit_tactics' | 'inferred_candidate' | 'drop';
  rubric_rationale: string;
  pull_quote_candidate: string | null;
  paywall_encountered: boolean;
  // existing annotation values (to diff against):
  oldCardTitle:    string | null;
  oldCardAbstract: string | null;
  oldPullQuote:    string | null;
  oldBullets:      string[];
}

function getString(fm: string, key: string): string | null {
  const m = fm.match(new RegExp(`^${key}:\\s*"((?:\\\\"|[^"])*)"\\s*$`, 'm'));
  if (m) return m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  // unquoted scalar (dates, slugs without spaces)
  const m2 = fm.match(new RegExp(`^${key}:\\s*([^\\n#]+?)\\s*$`, 'm'));
  return m2 ? m2[1].trim() : null;
}

function getStringList(fm: string, key: string): string[] {
  // Walk lines. Find the header `<key>:`, then collect every following line
  // whose first non-whitespace char is `-` (a YAML list item). Stop at the
  // first line whose first non-whitespace char is something else, or at EOF.
  const lines = fm.split('\n');
  const headerIdx = lines.findIndex(l => new RegExp(`^${key}:\\s*$`).test(l));
  if (headerIdx === -1) return [];
  const items: string[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    const m = l.match(/^\s+-\s+(?:"((?:\\"|[^"])*)"|(.+?))\s*$/);
    if (!m) break;
    items.push((m[1] ?? m[2] ?? '').replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  }
  return items;
}

function parseRubricScores(fm: string): RubricResult['scores'] | null {
  const block = fm.match(/^rubric_scores:\s*\n([\s\S]*?)(?=^[a-zA-Z_])/m);
  if (!block) return null;
  const get = (k: string): number => {
    const m = block[1].match(new RegExp(`^\\s+${k}:\\s+(-?\\d+)`, 'm'));
    return m ? parseInt(m[1], 10) : 0;
  };
  return {
    process_visibility:  get('process_visibility'),
    decision_visibility: get('decision_visibility'),
    specificity:         get('specificity'),
    originality:         get('originality'),
    audience_fit:        get('audience_fit'),
  };
}

function loadCards(): ExistingCard[] {
  const files = fs.readdirSync(PUBLISHED_DIR).filter(f => f.endsWith('.mdx'));
  const out: ExistingCard[] = [];
  for (const file of files) {
    const fullPath = path.join(PUBLISHED_DIR, file);
    const rawFile  = fs.readFileSync(fullPath, 'utf8');
    const fmMatch  = rawFile.match(/^(---\n)([\s\S]*?)(\n---)/);
    if (!fmMatch) {
      console.warn(`  skip ${file}: no frontmatter delimiters`);
      continue;
    }
    const [whole, headRaw, fmRaw, tailRaw] = fmMatch;
    const bodyRaw = rawFile.slice(whole.length);

    const scores = parseRubricScores(fmRaw);
    if (!scores) {
      console.warn(`  skip ${file}: missing rubric_scores`);
      continue;
    }
    const totalStr = fmRaw.match(/^\s+total:\s+(-?\d+)/m)?.[1];
    const verdict  = (getString(fmRaw, 'rubric_verdict') ?? 'inferred_candidate') as ExistingCard['rubric_verdict'];

    out.push({
      file,
      fullPath,
      rawFile,
      fmRaw,
      bodyRaw,
      headRaw,
      tailRaw,
      slug:       getString(fmRaw, 'slug')      ?? file.replace(/\.mdx$/, ''),
      source_id:  getString(fmRaw, 'source_id') ?? '',
      source_name:getString(fmRaw, 'source')    ?? '(unknown)',
      source_url: getString(fmRaw, 'source_url')?? '',
      piece_title: getString(fmRaw, 'piece_title'),
      piece_author: getString(fmRaw, 'piece_author'),
      piece_published_at: getString(fmRaw, 'piece_published_at'),
      tactic_tags: getStringList(fmRaw, 'tactic_tags'),
      rubric_scores: scores,
      rubric_total: totalStr ? parseInt(totalStr, 10) : 0,
      rubric_verdict: verdict,
      rubric_rationale: getString(fmRaw, 'rubric_rationale') ?? '',
      pull_quote_candidate: getString(fmRaw, 'pull_quote_candidate'),
      paywall_encountered: getString(fmRaw, 'paywall_encountered') === 'true',
      oldCardTitle:    getString(fmRaw, 'card_title'),
      oldCardAbstract: getString(fmRaw, 'card_abstract'),
      oldPullQuote:    getString(fmRaw, 'pull_quote'),
      oldBullets:      getStringList(fmRaw, 'bullets'),
    });
  }
  return out;
}

// ── Diff display ────────────────────────────────────────────────────────────

function lenTag(s: string | null | undefined, max: number): string {
  if (s == null) return '';
  const over = s.length > max ? ', OVER' : '';
  return ` (${s.length}/${max}${over})`;
}

function bulletList(label: string, bullets: string[], max: number): void {
  console.log(`${label}:`);
  bullets.forEach((b, i) => {
    console.log(`  [${i + 1}]${lenTag(b, max)}  ${b}`);
  });
}

function showDiff(card: ExistingCard, next: AnnotationResult): void {
  console.log(`\n${'═'.repeat(78)}`);
  console.log(`${card.source_name} — ${card.piece_title ?? card.slug}`);
  console.log(`File: ${card.file}`);
  console.log('─'.repeat(78));

  console.log(`\ncard_title:`);
  console.log(`  OLD${lenTag(card.oldCardTitle, ANNOTATION_LIMITS.cardTitle)}:  ${card.oldCardTitle ?? '(none)'}`);
  console.log(`  NEW${lenTag(next.card_title,    ANNOTATION_LIMITS.cardTitle)}:  ${next.card_title}`);

  console.log(`\ncard_abstract:`);
  console.log(`  OLD${lenTag(card.oldCardAbstract, ANNOTATION_LIMITS.cardAbstract)}:`);
  console.log(`    ${card.oldCardAbstract ?? '(none)'}`);
  console.log(`  NEW${lenTag(next.card_abstract,    ANNOTATION_LIMITS.cardAbstract)}:`);
  console.log(`    ${next.card_abstract}`);

  console.log(`\npull_quote:`);
  console.log(`  OLD${lenTag(card.oldPullQuote, ANNOTATION_LIMITS.pullQuote)}:`);
  console.log(`    ${card.oldPullQuote ?? '(none)'}`);
  console.log(`  NEW${lenTag(next.pull_quote,    ANNOTATION_LIMITS.pullQuote)}:`);
  console.log(`    ${next.pull_quote}`);

  console.log(`\nbullets (OLD: ${card.oldBullets.length}, NEW: ${next.bullets.length}):`);
  bulletList('  OLD', card.oldBullets, ANNOTATION_LIMITS.bullet);
  bulletList('  NEW', next.bullets,    ANNOTATION_LIMITS.bullet);
}

// ── Frontmatter rewrite ─────────────────────────────────────────────────────

function yamlEscape(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Replace a single-line scalar field in YAML frontmatter, keyed by name.
 *  Returns the updated frontmatter body. If the key is missing, inserts it
 *  before `suggested_connections:` (mirroring the agent's emission order). */
function setScalar(fmBody: string, key: string, value: string): string {
  const re = new RegExp(`^${key}:[^\\n]*$`, 'm');
  const line = `${key}: ${yamlEscape(value)}`;
  if (re.test(fmBody)) return fmBody.replace(re, line);
  if (/^suggested_connections:/m.test(fmBody)) {
    return fmBody.replace(/^suggested_connections:/m, `${line}\nsuggested_connections:`);
  }
  return fmBody + `\n${line}`;
}

/** Replace the `bullets:` block (multi-line list) entirely. */
function setBullets(fmBody: string, bullets: string[]): string {
  const block = `bullets:\n${bullets.map(b => `  - ${yamlEscape(b)}`).join('\n')}`;
  // Match bullets: header through the last "- ..." item before the next
  // top-level key, end of frontmatter, or blank line.
  const re = /^bullets:\s*\n(?:\s*-\s+[^\n]*\n?)+/m;
  if (re.test(fmBody)) return fmBody.replace(re, block + '\n');
  // Insert before draft_annotation_metadata if missing (the agent's order).
  if (/^draft_annotation_metadata:/m.test(fmBody)) {
    return fmBody.replace(/^draft_annotation_metadata:/m, `${block}\ndraft_annotation_metadata:`);
  }
  return fmBody + `\n${block}`;
}

/** Replace draft_notes/uncertainty_flags inside draft_annotation_metadata. */
function setDraftMetadata(fmBody: string, draftNotes: string, uncertainty: string | null | undefined): string {
  const dm  = fmBody.match(/^draft_annotation_metadata:\s*\n([\s\S]*?)(?=^[a-zA-Z_]|$)/m);
  const newBlock = [
    'draft_annotation_metadata:',
    `  draft_notes: ${yamlEscape(draftNotes)}`,
    ...(uncertainty ? [`  uncertainty_flags: ${yamlEscape(uncertainty)}`] : []),
  ].join('\n');
  if (dm) {
    return fmBody.replace(/^draft_annotation_metadata:\s*\n(?:[ \t][^\n]*\n?)+/m, newBlock + '\n');
  }
  return fmBody + `\n${newBlock}`;
}

function rewriteFile(card: ExistingCard, next: AnnotationResult): void {
  let fm = card.fmRaw;
  fm = setScalar(fm, 'card_title',    next.card_title);
  fm = setScalar(fm, 'card_abstract', next.card_abstract);
  fm = setScalar(fm, 'pull_quote',    next.pull_quote);
  fm = setBullets(fm, next.bullets);
  fm = setDraftMetadata(fm, next.draft_notes, next.uncertainty_flags ?? null);
  const out = card.headRaw + fm + card.tailRaw + card.bodyRaw;
  fs.writeFileSync(card.fullPath, out, 'utf8');
}

// ── Main ────────────────────────────────────────────────────────────────────

function synthesizeRubric(card: ExistingCard): RubricResult {
  return {
    scores:               card.rubric_scores,
    total:                card.rubric_total,
    verdict:              card.rubric_verdict,
    verdict_rationale:    card.rubric_rationale,
    suggested_tags:       card.tactic_tags,
    pull_quote_candidate: card.pull_quote_candidate,
    paywall_encountered:  card.paywall_encountered,
    uncertainty_notes:    null,
  };
}

function synthesizeSource(card: ExistingCard): Source {
  // callAnnotation only reads `source.name` from this object.
  return {
    id:           card.source_id,
    name:         card.source_name,
    url:          card.source_url,
    rss:          null,
    tier:         'priority',
    content_type: 'mixed',
    category:     'company_blog',
    notes:        null,
  };
}

async function main(): Promise<void> {
  const AUTO_ACCEPT = process.argv.includes('--auto-accept') || process.env.AUTO_ACCEPT === '1';

  const cards  = loadCards();
  console.log(`Found ${cards.length} published cards in ${PUBLISHED_DIR}`);
  if (AUTO_ACCEPT) console.log('  --auto-accept: every diff is accepted without prompting.');
  if (!cards.length) return;

  const client = makeClient();
  if (!client) {
    throw new Error('No Anthropic client available. Set ANTHROPIC_API_KEY in .env.local.');
  }

  const rl = AUTO_ACCEPT
    ? null
    : readline.createInterface({ input: stdin, output: stdout });

  const accepted: string[] = [];
  const rejected: string[] = [];
  const errored:  Array<{ slug: string; reason: string }> = [];

  for (const card of cards) {
    console.log(`\n${'━'.repeat(78)}`);
    console.log(`Processing: ${card.slug}`);
    console.log(`Fetching ${card.source_url} ...`);

    let fullText = '';
    try {
      const fetched = await fetchFullText(card.source_url);
      fullText = fetched.text;
      if (!fullText || fullText.length < 200) {
        console.error(`  skip: source text too short (${fullText.length} chars). Card unchanged.`);
        errored.push({ slug: card.slug, reason: 'source text too short' });
        continue;
      }
    } catch (err) {
      console.error(`  skip: fetch failed: ${(err as Error).message}. Card unchanged.`);
      errored.push({ slug: card.slug, reason: `fetch failed: ${(err as Error).message}` });
      continue;
    }

    const item: DiscoveredItem = {
      url:             card.source_url,
      title:           card.piece_title,
      author:          card.piece_author,
      publicationDate: card.piece_published_at,
    };

    let next: AnnotationResult;
    try {
      next = await callAnnotation(client, synthesizeSource(card), item, fullText, synthesizeRubric(card), null);
    } catch (err) {
      console.error(`  skip: annotation failed: ${(err as Error).message}. Card unchanged.`);
      errored.push({ slug: card.slug, reason: `annotation failed: ${(err as Error).message}` });
      continue;
    }

    // Final safety net — should be unreachable since callAnnotation already
    // ran the schema parse, but the user explicitly asked for verification.
    const safetyCheck = AnnotationSchema.safeParse(next);
    if (!safetyCheck.success) {
      console.error(`  skip: post-validate failed: ${safetyCheck.error.message}. Card unchanged.`);
      errored.push({ slug: card.slug, reason: 'post-validate failed' });
      continue;
    }
    const lenViol = findAnnotationLengthViolations(next);
    if (lenViol.length) {
      console.error(`  skip: still over budget after retry+truncate: ${lenViol.join(' ')}. Card unchanged.`);
      errored.push({ slug: card.slug, reason: 'still over budget' });
      continue;
    }

    showDiff(card, next);
    let answer: string;
    if (rl) {
      answer = (await rl.question(`\nAccept new annotation for "${card.piece_title ?? card.slug}"? [y/n/skip]: `)).trim().toLowerCase();
    } else {
      answer = 'y';
      console.log(`\nAccept new annotation for "${card.piece_title ?? card.slug}"? [y/n/skip]: y (auto)`);
    }
    if (answer === 'y' || answer === 'yes') {
      rewriteFile(card, next);
      console.log(`  ✓ rewrote ${card.file}`);
      accepted.push(card.slug);
    } else {
      console.log(`  ✗ left ${card.file} unchanged`);
      rejected.push(card.slug);
    }
  }

  rl?.close();

  // ── Summary ──
  console.log(`\n${'═'.repeat(78)}`);
  console.log('Migration summary');
  console.log('─'.repeat(78));
  console.log(`Accepted (${accepted.length}):`);
  for (const s of accepted) console.log(`  ✓ ${s}`);
  console.log(`\nRejected/skipped (${rejected.length}):`);
  for (const s of rejected) console.log(`  ✗ ${s}`);
  if (errored.length) {
    console.log(`\nErrored (${errored.length}):`);
    for (const e of errored) console.log(`  ! ${e.slug} — ${e.reason}`);
  }

  // Re-validate accepted files on disk to confirm budgets are satisfied.
  if (accepted.length) {
    console.log(`\nFinal budget check on accepted files:`);
    for (const slug of accepted) {
      const card = cards.find(c => c.slug === slug);
      if (!card) continue;
      const reread = fs.readFileSync(card.fullPath, 'utf8');
      const fm     = reread.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      const data   = {
        card_title:        getString(fm, 'card_title')    ?? '',
        card_abstract:     getString(fm, 'card_abstract') ?? '',
        pull_quote:        getString(fm, 'pull_quote')    ?? '',
        bullets:           getStringList(fm, 'bullets'),
        draft_notes:       fm.match(/^\s+draft_notes:\s*"((?:\\"|[^"])*)"/m)?.[1]?.replace(/\\"/g, '"') ?? '',
      };
      const r = AnnotationSchema.safeParse(data);
      if (r.success) {
        console.log(`  ✓ ${slug} satisfies AnnotationSchema (title ${data.card_title.length}/${ANNOTATION_LIMITS.cardTitle}, abstract ${data.card_abstract.length}/${ANNOTATION_LIMITS.cardAbstract}, pq ${data.pull_quote.length}/${ANNOTATION_LIMITS.pullQuote}, ${data.bullets.length} bullets)`);
      } else {
        console.log(`  ✗ ${slug} FAILED post-write validation: ${r.error.message}`);
      }
    }
  }
  console.log('\nNothing committed. Review the index page before deciding whether to keep the changes.');
}

main().catch(err => {
  console.error(`\nFatal error: ${(err as Error).message}`);
  console.error((err as Error).stack);
  process.exit(1);
});
