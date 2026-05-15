#!/usr/bin/env tsx
/**
 * field-notes:new — scaffold a new Field Note MDX from a URL.
 *
 *   npm run field-notes:new -- --url https://example.com/some-post
 *
 * Fetches the URL, extracts title/canonical/publisher/author/published_at via
 * meta tags, and writes a schema-valid MDX to
 *   src/content/field-notes/published/<slug>.mdx
 * with placeholder values for editorial fields (clearly marked TODO).
 *
 * Schema-valid placeholders are intentional: the file lives in the published/
 * dir from the start so it's editable in-place and the build can validate
 * structure. The editor fills in tactic_tags, rubric_*, card_*, pull_quote,
 * bullets, suggested_connections, coverColor before committing.
 *
 * No git commit, no push. Local file write only.
 */

import fs   from 'node:fs';
import path from 'node:path';
import {
  canonicalizeUrl,
  httpFetch,
  extractArticleMeta,
  slugify,
  readExistingSlugs,
  assertSchemaShape,
  type Source,
  type SourcesFile,
} from './lib.ts';

const REPO_ROOT     = path.resolve(process.cwd());
const SOURCES_FILE  = path.join(REPO_ROOT, 'scripts/field-notes/sources.json');
const PUBLISHED_DIR = path.join(REPO_ROOT, 'src/content/field-notes/published');

// ── CLI parsing ──────────────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
}

const inputUrl = getArg('--url');
if (!inputUrl) {
  console.error('Error: --url is required.');
  console.error('  npm run field-notes:new -- --url https://example.com/post');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadSources(): Source[] {
  if (!fs.existsSync(SOURCES_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8')) as SourcesFile;
    return Array.isArray(data.sources) ? data.sources : [];
  } catch {
    return [];
  }
}

function matchSource(url: string, sources: Source[]): Source | null {
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  for (const s of sources) {
    let sHost: string;
    try { sHost = new URL(s.url).hostname.toLowerCase(); } catch { continue; }
    if (host === sHost || host.endsWith('.' + sHost) || sHost.endsWith('.' + host)) {
      return s;
    }
  }
  return null;
}

function sourceIdFromHost(host: string): string {
  return slugify(host.replace(/^www\./, '').replace(/\./g, '-')) || 'unknown-source';
}

function dedupeSlug(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error(`Could not find a free slug starting from "${base}".`);
}

function yamlQuote(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// ── Frontmatter writer ───────────────────────────────────────────────────────

interface ScaffoldInput {
  slug:         string;
  source:       string;
  sourceId:     string;
  sourceUrl:    string;
  pieceTitle:   string;
  pieceAuthor:  string | null;
  publishedAt:  string | null;
  description:  string | null;
}

function buildMdx(input: ScaffoldInput): string {
  const today = new Date().toISOString();

  const lines: string[] = [];
  lines.push('---');
  lines.push(`slug: ${yamlQuote(input.slug)}`);
  lines.push(`source: ${yamlQuote(input.source)}`);
  lines.push(`source_id: ${yamlQuote(input.sourceId)}`);
  lines.push(`source_url: ${yamlQuote(input.sourceUrl)}`);
  lines.push(`piece_title: ${yamlQuote(input.pieceTitle)}`);
  if (input.pieceAuthor) {
    lines.push(`piece_author: ${yamlQuote(input.pieceAuthor)}`);
  } else {
    lines.push(`# piece_author: "TODO — author name if known"`);
  }
  if (input.publishedAt) {
    lines.push(`piece_published_at: ${input.publishedAt}`);
  } else {
    lines.push(`# piece_published_at: YYYY-MM-DD  # TODO — original publish date`);
  }
  lines.push('');
  lines.push('# TODO — pick 1-3 tactic tags from the controlled vocabulary:');
  lines.push('#   research_and_validation, systems_and_primitives, prototyping_and_exploration,');
  lines.push('#   critique_and_decision_making, craft_and_detail, cross_functional_and_process,');
  lines.push('#   storytelling_and_narrative, hiring_and_team');
  lines.push('tactic_tags:');
  lines.push('  - craft_and_detail');
  lines.push('');
  lines.push('# TODO — score each dimension 0-5, total = sum.');
  lines.push('rubric_scores:');
  lines.push('  process_visibility:  0');
  lines.push('  decision_visibility: 0');
  lines.push('  specificity:         0');
  lines.push('  originality:         0');
  lines.push('  audience_fit:        0');
  lines.push('  total:               0');
  lines.push('# TODO — verdict: explicit_tactics | inferred_candidate | drop');
  lines.push('rubric_verdict: inferred_candidate');
  lines.push('rubric_rationale: "TODO — why this piece is worth surfacing (or not)."');
  lines.push('paywall_encountered: false');
  lines.push('display_type: "company"  # TODO — "company" or "individual"');
  lines.push('');
  lines.push('# Editorial fields below. Card title ≤45 chars, abstract ≤300, pull quote ≤120, bullets 3-5 each ≤90 chars.');
  lines.push('# card_title: "TODO — 4-7 words, ≤45 chars"');
  lines.push('# card_abstract: "TODO — 1-3 sentences, 100-180 chars target."');
  lines.push('# pull_quote: "TODO — ≤25 words, may use ==highlight== syntax."');
  lines.push('bullets:');
  lines.push('  - "TODO — first observation, 8-15 words, ≤90 chars."');
  lines.push('  - "TODO — second observation, 8-15 words, ≤90 chars."');
  lines.push('  - "TODO — third observation, 8-15 words, ≤90 chars."');
  lines.push('# suggested_connections: optional. Up to two related Design Outcomes articles.');
  lines.push('# suggested_connections:');
  lines.push('#   - article_slug:    "todo-article-slug"');
  lines.push('#     article_title:   "TODO"');
  lines.push('#     connection_type: shared_tactic  # shared_tactic | argumentative_dialogue | shared_theme');
  lines.push('#     confidence:      medium          # high | medium | low');
  lines.push('#     rationale:       "TODO"');
  lines.push('# coverColor: deep-teal  # TODO — deep-teal | sage | terracotta | aubergine | navy | warm-charcoal');
  lines.push(`generated_at: ${today}`);
  lines.push('---');
  lines.push('');
  if (input.description) {
    lines.push(`{/* Source description (from og:description): ${input.description.replace(/\*\//g, '* /')} */}`);
    lines.push('');
  }
  lines.push('{/* Optional archival prose. The flip-page editorial content comes from the `bullets` frontmatter field above. */}');
  lines.push('');
  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  assertSchemaShape(REPO_ROOT);

  console.error(`Fetching ${inputUrl}…`);
  const res = await httpFetch(inputUrl!, 'text/html');
  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status} fetching ${inputUrl}`);
  }

  const meta = extractArticleMeta(res.body, res.finalUrl || inputUrl!);

  // Prefer the page's canonical URL over the input.
  const canonicalSource = meta.canonicalUrl ?? res.finalUrl ?? inputUrl!;
  const sourceUrl       = canonicalizeUrl(canonicalSource);

  if (!meta.title) {
    throw new Error(`Could not extract a title from ${inputUrl}. The page may be JS-rendered or behind a paywall.`);
  }

  const sources       = loadSources();
  const matched       = matchSource(sourceUrl, sources);
  const fallbackHost  = (() => { try { return new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, ''); } catch { return 'unknown'; } })();
  const sourceLabel   = matched?.name ?? meta.publisher ?? fallbackHost;
  const sourceIdValue = matched?.id   ?? sourceIdFromHost(fallbackHost);

  const baseSlug    = slugify(meta.title);
  if (!baseSlug) throw new Error(`Slug came out empty from title "${meta.title}".`);
  const existing    = readExistingSlugs(REPO_ROOT);
  const slug        = dedupeSlug(baseSlug, existing);
  const outPath     = path.join(PUBLISHED_DIR, `${slug}.mdx`);

  if (fs.existsSync(outPath)) {
    throw new Error(`File already exists at ${outPath}. Pick a different URL or delete the existing draft.`);
  }

  const mdx = buildMdx({
    slug,
    source:      sourceLabel,
    sourceId:    sourceIdValue,
    sourceUrl,
    pieceTitle:  meta.title,
    pieceAuthor: meta.author,
    publishedAt: meta.publishedAt,
    description: meta.description,
  });

  fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  fs.writeFileSync(outPath, mdx, 'utf8');

  console.log('');
  console.log(`Created ${path.relative(REPO_ROOT, outPath)}`);
  console.log('');
  console.log(`  slug:        ${slug}`);
  console.log(`  source:      ${sourceLabel}  (source_id: ${sourceIdValue})`);
  console.log(`  source_url:  ${sourceUrl}`);
  console.log(`  piece_title: ${meta.title}`);
  console.log(`  piece_author: ${meta.author ?? '(TODO)'}`);
  console.log(`  published:   ${meta.publishedAt ?? '(TODO)'}`);
  console.log('');
  console.log('Next: open the file and fill in the TODO fields (tactic_tags, rubric_*, card_*, pull_quote, bullets, optional suggested_connections, optional coverColor), then commit.');
}

main().catch((err: Error) => {
  console.error(`\nfield-notes:new failed: ${err.message}`);
  process.exit(1);
});
