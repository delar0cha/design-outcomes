#!/usr/bin/env tsx
/**
 * field-notes:search — print candidate articles to the terminal.
 *
 * Pulls from:
 *   1. RSS feeds (or page-scrape fallback) in scripts/field-notes/sources.json
 *   2. Anthropic web_search queries in scripts/field-notes/search-queries.json
 *
 * Filters:
 *   - dedupe by canonical URL
 *   - drop anything already in src/content/field-notes/published/
 *   - drop anything older than 30 days
 *   - drop anything from a host on sources.json :: blocklist
 *
 * No file writes, no commits. Read-only.
 */

import fs   from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import {
  loadDotenv,
  canonicalizeUrl,
  httpFetch,
  parseFeed,
  extractLinksFromHtml,
  readExistingFieldNoteUrls,
  isWithinDays,
  daysAgoIso,
  isEditorialUrl,
  isEditorialTitle,
  type Source,
  type SourcesFile,
  type DiscoveredItem,
} from './lib.ts';

loadDotenv(path.resolve('.env.local'));

const REPO_ROOT     = path.resolve(process.cwd());
const SOURCES_FILE  = path.join(REPO_ROOT, 'scripts/field-notes/sources.json');
const QUERIES_FILE  = path.join(REPO_ROOT, 'scripts/field-notes/search-queries.json');

const RECENCY_DAYS         = 30;
const WEB_SEARCH_DAYS      = 14;
const PER_SOURCE_LIMIT     = 10;
const PER_QUERY_LIMIT      = 5;
const WEB_SEARCH_MODEL     = 'claude-sonnet-4-6';

type DiscoveryOrigin = 'feed' | 'web';

interface SearchResult extends DiscoveredItem {
  sourceLabel: string; // e.g. "Figma" or hostname
  origin:      DiscoveryOrigin;
}

// ── Sources & queries loaders ────────────────────────────────────────────────

function loadSources(): SourcesFile {
  if (!fs.existsSync(SOURCES_FILE)) {
    throw new Error(`Missing sources file at ${SOURCES_FILE}. Scaffolded one should already exist; restore from git.`);
  }
  const data = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8')) as SourcesFile;
  if (!Array.isArray(data.sources)) throw new Error('sources.json must have a `sources` array.');
  if (!Array.isArray(data.blocklist)) throw new Error('sources.json must have a `blocklist` array.');
  return data;
}

function loadQueries(): string[] {
  if (!fs.existsSync(QUERIES_FILE)) {
    throw new Error(`Missing queries file at ${QUERIES_FILE}.`);
  }
  const data = JSON.parse(fs.readFileSync(QUERIES_FILE, 'utf8')) as unknown;
  if (!Array.isArray(data) || !data.every(q => typeof q === 'string')) {
    throw new Error('search-queries.json must be a JSON array of strings.');
  }
  return data as string[];
}

// ── Feed discovery ───────────────────────────────────────────────────────────

async function discoverFromSource(source: Source): Promise<DiscoveredItem[]> {
  if (source.rss) {
    try {
      const r = await httpFetch(source.rss, 'application/rss+xml, application/atom+xml, application/xml, text/xml');
      if (r.status === 200) {
        const items = parseFeed(r.body);
        if (items.length) return items.slice(0, PER_SOURCE_LIMIT);
      } else {
        console.error(`  ${source.id}: feed returned HTTP ${r.status}`);
      }
    } catch (err) {
      console.error(`  ${source.id}: feed fetch failed — ${(err as Error).message}`);
    }
  }

  try {
    const r = await httpFetch(source.url, 'text/html');
    if (r.status !== 200) {
      console.error(`  ${source.id}: page returned HTTP ${r.status}`);
      return [];
    }
    return extractLinksFromHtml(r.body, source.url).slice(0, PER_SOURCE_LIMIT);
  } catch (err) {
    console.error(`  ${source.id}: page scrape failed — ${(err as Error).message}`);
    return [];
  }
}

// ── Web search via Anthropic ─────────────────────────────────────────────────

interface WebSearchResultRow {
  title:        string;
  url:          string;
  publisher:    string | null;
  author:       string | null;
  publish_date: string | null;
  summary:      string | null;
}

async function runWebSearch(client: Anthropic, query: string): Promise<WebSearchResultRow[]> {
  const sinceIso = daysAgoIso(WEB_SEARCH_DAYS);
  const prompt = `Search the web for recent articles matching this query: "${query}"

Constraints:
- Published on or after ${sinceIso} (last ${WEB_SEARCH_DAYS} days).
- Focused on product design, design leadership, design systems, design management, or design craft.
- Skip listicles, sponsored content, marketing pages, and SEO aggregators.

Return the ${PER_QUERY_LIMIT} most relevant results as a JSON array. Output ONLY the JSON, no preamble or markdown fences. Each entry must have exactly these keys:
  - "title": string
  - "url": string (absolute URL)
  - "publisher": string or null (site name; not the author)
  - "author": string or null (article byline if visible in search results; do NOT fetch the article page to get it)
  - "publish_date": string or null (ISO YYYY-MM-DD)
  - "summary": string or null (one sentence)

If you cannot find ${PER_QUERY_LIMIT} relevant results, return fewer. If you find none, return an empty array [].`;

  const res = await client.messages.create({
    model:       WEB_SEARCH_MODEL,
    max_tokens:  2000,
    temperature: 0.2,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
    messages: [{ role: 'user', content: prompt }],
  });

  // Find the final text block (after any tool_use blocks).
  let text = '';
  for (const block of res.content) {
    if (block.type === 'text') text += block.text;
  }
  text = text.trim();

  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) text = fence[1].trim();

  // Pluck the JSON array out if the model wrapped it in prose.
  const first = text.indexOf('[');
  const last  = text.lastIndexOf(']');
  if (first === -1 || last === -1 || last < first) {
    console.error(`  query "${query}": model returned no JSON array; skipping.`);
    return [];
  }

  let parsed: unknown;
  try { parsed = JSON.parse(text.slice(first, last + 1)); }
  catch (err) {
    console.error(`  query "${query}": JSON parse failed — ${(err as Error).message}`);
    return [];
  }
  if (!Array.isArray(parsed)) {
    console.error(`  query "${query}": parsed result is not an array; skipping.`);
    return [];
  }

  return parsed.filter(
    (r): r is WebSearchResultRow =>
      r !== null && typeof r === 'object'
      && typeof (r as WebSearchResultRow).title === 'string'
      && typeof (r as WebSearchResultRow).url === 'string',
  );
}

// ── Filtering ────────────────────────────────────────────────────────────────

function hostOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase(); }
  catch { return ''; }
}

function isBlocked(url: string, blocklist: string[]): boolean {
  const h = hostOf(url);
  if (!h) return false;
  return blocklist.some(b => h === b.toLowerCase() || h.endsWith('.' + b.toLowerCase()));
}

function dedupe(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = canonicalizeUrl(r.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...r, url: key });
  }
  return out;
}

// ── Printing ─────────────────────────────────────────────────────────────────

function printResults(label: string, results: SearchResult[]): void {
  console.log(`\n── ${label} (${results.length}) ────────────────────────────────────────────`);
  if (!results.length) {
    console.log('  (no candidates)');
    return;
  }
  for (const r of results) {
    console.log('');
    console.log(`  ${r.title ?? '(untitled)'}`);
    const meta: string[] = [];
    meta.push(r.sourceLabel || hostOf(r.url) || 'unknown');
    if (r.publicationDate) meta.push(r.publicationDate);
    console.log(`    ${meta.join(' · ')}`);
    console.log(`    ${r.url}`);
    if (r.summary) console.log(`    ${r.summary}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { sources, blocklist } = loadSources();
  const queries = loadQueries();
  const seenUrls = readExistingFieldNoteUrls(REPO_ROOT);

  console.error(`Loaded ${sources.length} sources, ${queries.length} queries, ${seenUrls.size} previously-saved URLs.\n`);

  // ── Feed-based discovery ──
  console.error('Fetching feeds…');
  const feedResults: SearchResult[] = [];
  for (const source of sources) {
    const items = await discoverFromSource(source);
    for (const item of items) {
      feedResults.push({ ...item, sourceLabel: source.name, origin: 'feed' });
    }
  }
  console.error(`  collected ${feedResults.length} raw feed items.`);

  // ── Web search ──
  let webResults: SearchResult[] = [];
  const haveKey = !!process.env.ANTHROPIC_API_KEY;
  if (!haveKey) {
    console.error('\nWarning: ANTHROPIC_API_KEY is not set in .env.local — skipping web search. Feed results only.');
  } else {
    console.error(`\nRunning ${queries.length} web search ${queries.length === 1 ? 'query' : 'queries'}…`);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    for (const query of queries) {
      try {
        const rows = await runWebSearch(client, query);
        for (const row of rows) {
          webResults.push({
            url:             row.url,
            title:           row.title,
            author:          row.author ?? null,
            publicationDate: row.publish_date,
            summary:         row.summary,
            sourceLabel:     row.publisher ?? hostOf(row.url) ?? 'web',
            origin:          'web',
          });
        }
        console.error(`  "${query}" → ${rows.length} result${rows.length === 1 ? '' : 's'}.`);
      } catch (err) {
        console.error(`  query "${query}" failed: ${(err as Error).message}`);
      }
    }
  }

  // ── Filter + dedupe ──
  // Filters run in two passes:
  //   1. Coarse: dedup, blocklist host, recency, already-published.
  //   2. Editorial: drop non-editorial URLs and bare nav-label titles.
  // The editorial drop is tracked separately so the script can report what
  // it threw away and the heuristic can be tuned over time.
  const coarseFilter = (r: SearchResult): boolean => {
    if (isBlocked(r.url, blocklist)) return false;
    if (seenUrls.has(canonicalizeUrl(r.url))) return false;
    if (!isWithinDays(r.publicationDate, RECENCY_DAYS)) return false;
    return true;
  };

  const feedCoarse = dedupe(feedResults.filter(coarseFilter));
  const webCoarse  = dedupe(webResults.filter(coarseFilter));

  const editorialDrops: SearchResult[] = [];
  const isEditorial = (r: SearchResult): boolean => {
    const kept = isEditorialUrl(r.url) && isEditorialTitle(r.title);
    if (!kept) editorialDrops.push(r);
    return kept;
  };

  const feeds = feedCoarse.filter(isEditorial);
  const web   = webCoarse.filter(isEditorial);

  // ── Print ──
  printResults('Feeds', feeds);
  printResults('Web Search', web);

  const rawTotal      = feedResults.length + webResults.length;
  const afterCoarse   = feedCoarse.length + webCoarse.length;
  const afterFinal    = feeds.length + web.length;
  console.log(`\nRaw: ${rawTotal} · After coarse filter: ${afterCoarse} · After editorial filter: ${afterFinal}.`);
  console.log(`Dropped by editorial filter: ${editorialDrops.length}.`);
  if (editorialDrops.length) {
    const sample = editorialDrops.slice(0, 5).map(r => `    ${r.title ?? '(untitled)'} — ${r.url}`).join('\n');
    console.log(`Sample of editorial drops (first 5 of ${editorialDrops.length}):\n${sample}`);
  }
  console.log(`To scaffold an entry: npm run field-notes:new -- --url <url>\n`);
}

main().catch((err: Error) => {
  console.error(`\nfield-notes:search failed: ${err.message}`);
  process.exit(1);
});
