#!/usr/bin/env tsx
/**
 * run.ts — the Field Notes agent.
 *
 * Reads sources.yaml, discovers new pieces (via RSS or page-scrape fallback),
 * runs each through three Sonnet 4.6 calls (rubric → annotation → connection
 * mapping), and stages non-dropped candidates as MDX in
 * src/content/field-notes/staging/.
 *
 * Run modes:
 *   tsx src/agent/run.ts                # full run
 *   tsx src/agent/run.ts --local        # don't commit/push (used by check)
 *   tsx src/agent/run.ts --source nubank-design
 *   tsx src/agent/run.ts --test-url https://example.com/post
 *   tsx src/agent/run.ts --limit 3
 */

import fs                from 'node:fs';
import path              from 'node:path';
import yaml              from 'js-yaml';
import Anthropic         from '@anthropic-ai/sdk';
import { buildCorpus }   from './corpus.js';
import type { CorpusEntry } from './corpus.js';

// ── .env.local loader ───────────────────────────────────────────────────────
// Mirrors the pattern in scripts/generate-audio.ts so local dev works the same
// way without pulling in a dotenv dependency.

function loadDotenv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Always let .env.local win over shell env for local dev. CI sets the
    // key directly via secrets (no .env.local present), so this is local-only.
    if (value) process.env[key] = value;
  }
}
loadDotenv(path.resolve('.env.local'));

// ── Types ───────────────────────────────────────────────────────────────────

interface Source {
  id:            string;
  name:          string;
  url:           string;
  rss:           string | null;
  /** Optional. Substring that must appear in a post's URL path. Used only by
   *  the page-scrape fallback; ignored when an RSS feed is present. */
  path_pattern?: string | null;
  tier:          'priority' | 'standard' | 'low_frequency' | 'meta_source';
  content_type:  'explicit_tactics_likely' | 'mixed' | 'mostly_inferred';
  category:      string;
  notes:         string | null;
}

interface State {
  sources: Record<string, { lastSeenUrls: string[]; lastRunAt: string | null }>;
}

interface DiscoveredItem {
  url:             string;
  title:           string | null;
  author:          string | null;
  publicationDate: string | null;
}

interface RubricScores {
  process_visibility:   number;
  decision_visibility:  number;
  specificity:          number;
  originality:          number;
  audience_fit:         number;
}

interface RubricResult {
  scores:               RubricScores;
  total:                number;
  verdict:              'explicit_tactics' | 'inferred_candidate' | 'drop';
  verdict_rationale:    string;
  suggested_tags:       string[];
  pull_quote_candidate: string | null;
  paywall_encountered:  boolean;
  uncertainty_notes:    string | null;
}

interface AnnotationResult {
  annotation_draft:      string;
  draft_notes:           string;
  alternative_phrasings: string[] | null;
  uncertainty_flags:     string | null;
}

interface ConnectionResult {
  connections: Array<{
    article_slug:    string;
    article_title:   string;
    rationale:       string;
    connection_type: 'shared_tactic' | 'argumentative_dialogue' | 'shared_theme';
    confidence:      'high' | 'medium' | 'low';
  }>;
  uncertainty_notes: string | null;
}

interface Candidate {
  source:            Source;
  item:              DiscoveredItem;
  fullText:          string;
  paywallSuspected:  boolean;
  rubric:            RubricResult;
  annotation:        AnnotationResult | null;
  connections:       ConnectionResult | null;
  slug:              string;
  errors:            string[];
}

// ── Paths and constants ─────────────────────────────────────────────────────

const REPO_ROOT     = path.resolve(process.cwd());
const AGENT_DIR     = path.join(REPO_ROOT, 'src/agent');
const PROMPTS_DIR   = path.join(AGENT_DIR, 'prompts');
const STAGING_DIR   = path.join(REPO_ROOT, 'src/content/field-notes/staging');
const RUN_LOG_DIR   = path.join(AGENT_DIR, 'logs/runs');
const STATE_FILE    = path.join(REPO_ROOT, '.field-notes-state.json');
const SOURCES_FILE  = path.join(AGENT_DIR, 'sources.yaml');

const MODEL = 'claude-sonnet-4-6';

// Cap full-text length so we don't blow token budgets on long pieces.
const MAX_FULLTEXT_CHARS = 60_000;

// Cap how many items we process per source per run.
const DEFAULT_PER_SOURCE_LIMIT = 5;

// Cap how many URLs we keep per source in state (prevent unbounded growth).
const STATE_URL_CAP = 200;

const FETCH_TIMEOUT_MS  = 20_000;
const FETCH_USER_AGENT  = 'FieldNotesAgent/0.1 (+https://ldlr.design)';

// ── CLI arg parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getFlag(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}
function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

const flags = {
  local:    hasFlag('--local'),
  dryRun:   hasFlag('--dry-run'),
  testUrl:  getFlag('--test-url'),
  source:   getFlag('--source'),
  limit:    getFlag('--limit') ? parseInt(getFlag('--limit')!, 10) : DEFAULT_PER_SOURCE_LIMIT,
};

// ── State and sources I/O ───────────────────────────────────────────────────

function loadState(): State {
  if (!fs.existsSync(STATE_FILE)) return { sources: {} };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as State;
  } catch (err) {
    console.error(`Warning: state file unreadable, starting fresh (${(err as Error).message})`);
    return { sources: {} };
  }
}

function saveState(state: State): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function loadSources(): Source[] {
  const raw = fs.readFileSync(SOURCES_FILE, 'utf8');
  return yaml.load(raw) as Source[];
}

// ── Prompt loading and splitting ────────────────────────────────────────────
//
// Each prompt file has a static instruction prefix followed by a
// "# Now evaluate" / "# Now draft" / "# Now map" marker and placeholders.
// We split there so we can cache the prefix as a system prompt and pass the
// filled-in suffix as the user message.

interface Prompt {
  system: string;
  user:   string; // template containing {VARS}
}

function loadPrompt(filename: string, marker: RegExp): Prompt {
  const raw = fs.readFileSync(path.join(PROMPTS_DIR, filename), 'utf8');
  const m   = raw.match(marker);
  if (!m || m.index === undefined) {
    throw new Error(`Prompt ${filename} missing splitting marker ${marker}`);
  }
  return {
    system: raw.slice(0, m.index).trim(),
    user:   raw.slice(m.index).trim(),
  };
}

const RUBRIC_PROMPT     = loadPrompt('rubric.md',             /# Now evaluate/);
const ANNOTATION_PROMPT = loadPrompt('annotation.md',         /# Now draft/);
const CONNECTION_PROMPT = loadPrompt('connection-mapping.md', /# Now map/);

// ── Anthropic client ────────────────────────────────────────────────────────

function makeClient(): Anthropic | null {
  if (flags.dryRun) return null;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Set it in .env.local for local runs or as a GitHub Actions secret in CI.');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

function extractText(response: Anthropic.Message): string {
  for (const block of response.content) {
    if (block.type === 'text') return block.text;
  }
  return '';
}

// JSON parsing with fallback that strips ```json fences if the model wrapped output.
function parseJson<T>(raw: string, label: string): T {
  let cleaned = raw.trim();
  const fence = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) cleaned = fence[1];
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`${label}: failed to parse JSON. First 300 chars: ${cleaned.slice(0, 300)}`);
  }
}

// ── HTTP fetching ───────────────────────────────────────────────────────────

async function httpFetch(url: string, accept: string = '*/*'): Promise<{ status: number; body: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res  = await fetch(url, {
      headers: { 'User-Agent': FETCH_USER_AGENT, Accept: accept },
      signal:  controller.signal,
      redirect:'follow',
    });
    const body = await res.text();
    return { status: res.status, body, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

// ── HTML to text ────────────────────────────────────────────────────────────
// Lightweight: strip script/style, replace block tags with newlines,
// strip remaining tags, decode common entities. Good enough to feed an LLM.

function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  s = s.replace(/<\/(p|div|li|h[1-6]|br|tr|blockquote|article|section)>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ')
       .replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&#39;/g, "'")
       .replace(/&rsquo;|&lsquo;/g, "'")
       .replace(/&ldquo;|&rdquo;/g, '"')
       .replace(/&mdash;/g, ',')
       .replace(/&ndash;/g, '-')
       .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  s = s.replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').replace(/\n{3,}/g, '\n\n');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s.trim();
}

function detectPaywall(html: string): boolean {
  const lower = html.toLowerCase();
  return /paywall|sign[\s-]?up to read|continue reading|subscribe to read|members only|create.{0,30}free account/i.test(lower);
}

// ── RSS / Atom parsing ──────────────────────────────────────────────────────
// We only need item title, link, pubDate. A handful of regex extractions over
// well-formed feeds works for the major publication platforms.

function decodeXmlEntities(s: string): string {
  return s.replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
}

function unwrapCdata(s: string): string {
  const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : s;
}

function parseFeed(xml: string): DiscoveredItem[] {
  const items: DiscoveredItem[] = [];

  // RSS 2.0: <item>...</item>
  const rssMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  for (const block of rssMatches) {
    const title   = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]   ?? null;
    const link    = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]     ?? null;
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? null;
    const author  = block.match(/<(?:dc:creator|author)[^>]*>([\s\S]*?)<\/(?:dc:creator|author)>/i)?.[1] ?? null;
    if (!link) continue;
    items.push({
      url:             decodeXmlEntities(unwrapCdata(link.trim())),
      title:           title ? decodeXmlEntities(unwrapCdata(title.trim())) : null,
      author:          author ? decodeXmlEntities(unwrapCdata(author.trim())) : null,
      publicationDate: pubDate ? new Date(pubDate.trim()).toISOString().split('T')[0] : null,
    });
  }

  // Atom: <entry>...</entry>
  const atomMatches = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const block of atomMatches) {
    const title   = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
    const linkTag = block.match(/<link[^>]*\bhref\s*=\s*"([^"]+)"/i)?.[1] ?? null;
    const updated = block.match(/<(?:published|updated)[^>]*>([\s\S]*?)<\/(?:published|updated)>/i)?.[1] ?? null;
    const author  = block.match(/<author[\s>][\s\S]*?<name[^>]*>([\s\S]*?)<\/name>/i)?.[1] ?? null;
    if (!linkTag) continue;
    items.push({
      url:             decodeXmlEntities(linkTag.trim()),
      title:           title ? decodeXmlEntities(unwrapCdata(title.trim())) : null,
      author:          author ? decodeXmlEntities(unwrapCdata(author.trim())) : null,
      publicationDate: updated ? updated.trim().split('T')[0] : null,
    });
  }

  return items;
}

// ── Discovery ───────────────────────────────────────────────────────────────

const COMMON_FEED_PATHS = ['/feed', '/feed/', '/rss', '/rss.xml', '/atom.xml', '/index.xml', '/feed.xml'];

async function discoverFromSource(source: Source): Promise<DiscoveredItem[]> {
  // Try the explicit feed URL first.
  if (source.rss) {
    try {
      const r = await httpFetch(source.rss, 'application/rss+xml, application/atom+xml, application/xml, text/xml');
      if (r.status === 200) {
        const items = parseFeed(r.body);
        if (items.length) return items;
      }
    } catch (err) {
      console.error(`  feed fetch failed for ${source.id}: ${(err as Error).message}`);
    }
  }

  // Try common feed paths derived from the source URL.
  const u    = new URL(source.url);
  const base = `${u.protocol}//${u.host}`;
  for (const p of COMMON_FEED_PATHS) {
    try {
      const candidate = base + p;
      const r = await httpFetch(candidate, 'application/rss+xml, application/atom+xml, application/xml, text/xml');
      if (r.status === 200 && /<(rss|feed|item|entry)\b/i.test(r.body)) {
        const items = parseFeed(r.body);
        if (items.length) {
          console.error(`  discovered feed at ${candidate}`);
          return items;
        }
      }
    } catch { /* try next */ }
  }

  // Fall back to scraping links from the listing page.
  try {
    const r = await httpFetch(source.url, 'text/html');
    if (r.status !== 200) return [];
    return extractLinksFromHtml(r.body, source);
  } catch (err) {
    console.error(`  page scrape failed for ${source.id}: ${(err as Error).message}`);
    return [];
  }
}

// Universal nav/marketing paths that almost never indicate a post. Match at
// the start of the path so legitimate slugs like /craft-and-detail aren't hit
// just because they contain "craft".
const NON_POST_PATH = /^\/(?:pricing|docs?|customers|signup|sign-up|login|sign-in|signin|about|contact|careers|jobs|homepage|home|search|tags?|categor(?:y|ies)|authors?|page|archive|feed|rss|sitemap|legal|privacy|terms|status|changelog|press|partners|integrations|download|apps?)(?:\/|$)/i;

// "Looks like a post" heuristic for the page-scrape fallback.
function looksLikePost(absoluteUrl: string, source: Source): boolean {
  let u: URL;
  try { u = new URL(absoluteUrl); } catch { return false; }
  const pathname = u.pathname;
  const segs     = pathname.split('/').filter(Boolean);
  const last     = segs[segs.length - 1] ?? '';

  // Source-specific override: when path_pattern is set, every candidate must
  // contain it. This filters obvious nav/marketing first.
  if (source.path_pattern && !pathname.includes(source.path_pattern)) return false;

  // Universal exclusions: nav-y paths.
  if (NON_POST_PATH.test(pathname)) return false;
  if (segs.length === 0) return false;

  const hasDate  = /\/(?:19|20)\d{2}(?:\/\d{1,2})?(?:\/|$)/.test(pathname);
  const hasSlug  = /-/.test(last) && last.length > 4;
  const hasDepth = segs.length >= 2;

  // When path_pattern is set, the pattern matches both index pages
  // (e.g. /now/community) and posts (e.g. /now/some-post-slug). We additionally
  // require a slug or a date so indexes get filtered out.
  if (source.path_pattern) return hasSlug || hasDate;

  // No path_pattern: any of the signals is enough.
  return hasDepth || hasDate || hasSlug;
}

function extractLinksFromHtml(html: string, source: Source): DiscoveredItem[] {
  const sourceHost = new URL(source.url).host;
  const found = new Map<string, DiscoveredItem>();

  const anchor = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchor.exec(html)) !== null) {
    const href = m[1];
    // Card layouts wrap titles, descriptions, and bylines in the same <a>.
    // Take only the first non-empty line so we don't smuggle the whole card
    // into piece_title. The page's <title>/og:title overrides this in
    // processOne anyway, but this keeps things sane for the listing-only path.
    const fullText = htmlToText(m[2]);
    const firstLine = fullText.split('\n').map(s => s.trim()).find(Boolean) ?? '';
    const text = firstLine.slice(0, 200);
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue;

    let absolute: string;
    try { absolute = new URL(href, source.url).toString(); } catch { continue; }
    const linkHost = new URL(absolute).host;

    if (linkHost !== sourceHost) continue;
    if (absolute === source.url) continue;
    if (/\.(png|jpg|jpeg|svg|gif|webp|css|js|xml|pdf|mp3|mp4)(\?|$)/i.test(absolute)) continue;

    if (!looksLikePost(absolute, source)) continue;

    if (!found.has(absolute)) {
      found.set(absolute, { url: absolute, title: text || null, author: null, publicationDate: null });
    }
  }

  return [...found.values()];
}

// ── Full-text fetch ─────────────────────────────────────────────────────────

async function fetchFullText(url: string): Promise<{ text: string; paywallSuspected: boolean; title: string | null }> {
  const r = await httpFetch(url, 'text/html');
  const titleMatch  = r.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitle     = r.body.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)/i);
  const title       = ogTitle?.[1] ?? (titleMatch ? htmlToText(titleMatch[1]) : null);

  // Strip site chrome that pollutes the text and rarely carries article content.
  let body = r.body
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi,       ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi,   ' ');

  // Pick the largest content container, since some sites have stub <article>
  // tags in card layouts before the real one. Score: text length after strip.
  const candidates: string[] = [];
  for (const re of [
    /<article\b[\s\S]*?<\/article>/gi,
    /<main\b[\s\S]*?<\/main>/gi,
    /<div\b[^>]*class\s*=\s*["'][^"']*\b(?:entry-content|post-content|article-body|article__body|prose)\b[^"']*["'][\s\S]*?<\/div>/gi,
  ]) {
    const matches = body.match(re);
    if (matches) candidates.push(...matches);
  }
  let target = body;
  if (candidates.length) {
    target = candidates.reduce((best, cur) => cur.length > best.length ? cur : best);
  }

  let text = htmlToText(target);
  if (text.length > MAX_FULLTEXT_CHARS) {
    text = text.slice(0, MAX_FULLTEXT_CHARS) + '\n\n[truncated]';
  }
  return { text, title, paywallSuspected: detectPaywall(r.body) };
}

// ── Slug helpers ────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase()
          .replace(/['']/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 80);
}

function slugForCandidate(source: Source, item: DiscoveredItem): string {
  const fromTitle = item.title ? slugify(item.title) : '';
  if (fromTitle) return `${source.id}-${fromTitle}`;
  // Fall back to URL last path segment.
  try {
    const segs = new URL(item.url).pathname.split('/').filter(Boolean);
    const last = segs.pop() ?? 'piece';
    return `${source.id}-${slugify(last)}`;
  } catch {
    return `${source.id}-${Date.now()}`;
  }
}

// ── API calls ───────────────────────────────────────────────────────────────

async function callRubric(
  client:        Anthropic,
  source:        Source,
  item:          DiscoveredItem,
  fullText:      string,
  discoveryType: 'monitored' | 'search'
): Promise<RubricResult> {
  const userMessage = fillTemplate(RUBRIC_PROMPT.user, {
    DISCOVERY_TYPE:   discoveryType,
    TITLE:            item.title ?? '(unknown)',
    AUTHOR:           item.author ?? '(unknown)',
    SOURCE_NAME:      source.name,
    URL:              item.url,
    PUBLICATION_DATE: item.publicationDate ?? '(unknown)',
    FULL_TEXT:        fullText,
  });

  const res = await client.messages.create({
    model:       MODEL,
    max_tokens:  2000,
    temperature: 0.3,
    system: [{ type: 'text', text: RUBRIC_PROMPT.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });

  return parseJson<RubricResult>(extractText(res), 'rubric');
}

async function callAnnotation(
  client:    Anthropic,
  source:    Source,
  item:      DiscoveredItem,
  fullText:  string,
  rubric:    RubricResult,
  related:   ConnectionResult['connections'] | null,
): Promise<AnnotationResult> {
  const relatedList = related && related.length
    ? related.map(c => `- ${c.article_title} (slug: ${c.article_slug}) — ${c.rationale}`).join('\n')
    : '(none — annotation should stand on its own)';

  const userMessage = fillTemplate(ANNOTATION_PROMPT.user, {
    TITLE:               item.title ?? '(unknown)',
    AUTHOR:              item.author ?? '(unknown)',
    SOURCE_NAME:         source.name,
    URL:                 item.url,
    RUBRIC_SCORES_JSON:  JSON.stringify(rubric.scores),
    TAGS:                rubric.suggested_tags.join(', '),
    PULL_QUOTE:          rubric.pull_quote_candidate ?? '(none surfaced)',
    RELATED_ARTICLES_LIST: relatedList,
    FULL_TEXT:           fullText,
  });

  const res = await client.messages.create({
    model:       MODEL,
    max_tokens:  1500,
    temperature: 0.7,
    system: [{ type: 'text', text: ANNOTATION_PROMPT.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });

  return parseJson<AnnotationResult>(extractText(res), 'annotation');
}

async function callConnections(
  client:     Anthropic,
  source:     Source,
  item:       DiscoveredItem,
  rubric:     RubricResult,
  annotation: string,
  corpus:     CorpusEntry[],
): Promise<ConnectionResult> {
  const userMessage = fillTemplate(CONNECTION_PROMPT.user, {
    TITLE:               item.title ?? '(unknown)',
    AUTHOR:              item.author ?? '(unknown)',
    SOURCE_NAME:         source.name,
    TAGS:                rubric.suggested_tags.join(', '),
    RUBRIC_SCORES_JSON:  JSON.stringify(rubric.scores),
    ANNOTATION:          annotation,
    ARTICLE_CORPUS_JSON: JSON.stringify(corpus, null, 2),
  });

  const res = await client.messages.create({
    model:       MODEL,
    max_tokens:  1500,
    temperature: 0.5,
    system: [{ type: 'text', text: CONNECTION_PROMPT.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });

  return parseJson<ConnectionResult>(extractText(res), 'connections');
}

// ── MDX writer ──────────────────────────────────────────────────────────────

function yamlEscape(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function writeStagingMdx(c: Candidate): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push(`slug: ${yamlEscape(c.slug)}`);
  lines.push(`source: ${yamlEscape(c.source.name)}`);
  lines.push(`source_id: ${yamlEscape(c.source.id)}`);
  lines.push(`source_url: ${yamlEscape(c.item.url)}`);
  if (c.item.title)           lines.push(`piece_title: ${yamlEscape(c.item.title)}`);
  if (c.item.author)          lines.push(`piece_author: ${yamlEscape(c.item.author)}`);
  if (c.item.publicationDate) lines.push(`piece_published_at: ${c.item.publicationDate}`);
  lines.push(`tactic_tags:`);
  for (const t of c.rubric.suggested_tags) lines.push(`  - ${t}`);
  lines.push(`rubric_scores:`);
  lines.push(`  process_visibility:  ${c.rubric.scores.process_visibility}`);
  lines.push(`  decision_visibility: ${c.rubric.scores.decision_visibility}`);
  lines.push(`  specificity:         ${c.rubric.scores.specificity}`);
  lines.push(`  originality:         ${c.rubric.scores.originality}`);
  lines.push(`  audience_fit:        ${c.rubric.scores.audience_fit}`);
  lines.push(`  total:               ${c.rubric.total}`);
  lines.push(`rubric_verdict: ${c.rubric.verdict}`);
  lines.push(`rubric_rationale: ${yamlEscape(c.rubric.verdict_rationale)}`);
  if (c.rubric.pull_quote_candidate) {
    lines.push(`pull_quote_candidate: ${yamlEscape(c.rubric.pull_quote_candidate)}`);
  }
  lines.push(`paywall_encountered: ${c.rubric.paywall_encountered || c.paywallSuspected}`);
  lines.push(`suggested_connections:`);
  if (c.connections && c.connections.connections.length) {
    for (const conn of c.connections.connections) {
      lines.push(`  - article_slug:    ${yamlEscape(conn.article_slug)}`);
      lines.push(`    article_title:   ${yamlEscape(conn.article_title)}`);
      lines.push(`    connection_type: ${conn.connection_type}`);
      lines.push(`    confidence:      ${conn.confidence}`);
      lines.push(`    rationale:       ${yamlEscape(conn.rationale)}`);
    }
  } else {
    lines.push(`  []`);
  }
  lines.push(`draft_annotation_metadata:`);
  if (c.annotation) {
    lines.push(`  draft_notes: ${yamlEscape(c.annotation.draft_notes)}`);
    if (c.annotation.alternative_phrasings && c.annotation.alternative_phrasings.length) {
      lines.push(`  alternative_phrasings:`);
      for (const a of c.annotation.alternative_phrasings) lines.push(`    - ${yamlEscape(a)}`);
    }
    if (c.annotation.uncertainty_flags) {
      lines.push(`  uncertainty_flags: ${yamlEscape(c.annotation.uncertainty_flags)}`);
    }
  }
  if (c.errors.length) {
    lines.push(`agent_errors:`);
    for (const e of c.errors) lines.push(`  - ${yamlEscape(e)}`);
  }
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push('---');
  lines.push('');
  lines.push(c.annotation?.annotation_draft ?? '(annotation drafting failed; see agent_errors in frontmatter)');
  lines.push('');

  const filePath = path.join(STAGING_DIR, `${c.slug}.mdx`);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return filePath;
}

// ── Digest writer ───────────────────────────────────────────────────────────

function writeDigest(candidates: Candidate[], droppedCount: number, errorCount: number, runStart: Date): string {
  const lines: string[] = [];
  const dateStr = runStart.toISOString().split('T')[0];
  lines.push(`# Field Notes — staging digest, ${dateStr}`);
  lines.push('');
  lines.push(`Run started ${runStart.toISOString()}.`);
  lines.push('');
  lines.push(`- Staged: **${candidates.length}**`);
  lines.push(`- Dropped: ${droppedCount}`);
  if (errorCount) lines.push(`- Errored: ${errorCount}`);
  lines.push('');
  if (!candidates.length) {
    lines.push('No candidates cleared the rubric this run.');
  } else {
    lines.push('## Staged candidates');
    lines.push('');
    for (const c of candidates) {
      const verdictLabel = c.rubric.verdict === 'explicit_tactics' ? 'Explicit tactics' : 'Inferred candidate';
      lines.push(`### ${c.item.title ?? c.slug}`);
      lines.push('');
      lines.push(`- Source: ${c.source.name}`);
      lines.push(`- URL: ${c.item.url}`);
      lines.push(`- Verdict: ${verdictLabel} (total ${c.rubric.total}/25)`);
      lines.push(`- Tags: ${c.rubric.suggested_tags.join(', ') || '(none)'}`);
      if (c.rubric.paywall_encountered || c.paywallSuspected) lines.push(`- Paywall: yes`);
      lines.push(`- Staging file: \`src/content/field-notes/staging/${c.slug}.mdx\``);
      if (c.annotation) {
        lines.push('');
        lines.push('> ' + c.annotation.annotation_draft.split('\n').join('\n> '));
      }
      if (c.connections && c.connections.connections.length) {
        lines.push('');
        lines.push(`Connections:`);
        for (const conn of c.connections.connections) {
          lines.push(`- ${conn.article_title} (${conn.confidence}): ${conn.rationale}`);
        }
      }
      lines.push('');
    }
  }
  const filePath = path.join(STAGING_DIR, 'digest.md');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return filePath;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function processOne(
  client:        Anthropic | null,
  source:        Source,
  item:          DiscoveredItem,
  corpus:        CorpusEntry[],
  discoveryType: 'monitored' | 'search',
): Promise<Candidate | null> {
  if (!client) {
    // Dry-run: skip fetch + scoring, just report what would have been processed.
    console.error(`  → [dry-run] ${item.title ?? item.url}`);
    return null;
  }
  const errors: string[] = [];
  const slug = slugForCandidate(source, item);
  console.error(`  → ${item.title ?? item.url}`);

  // 1. Fetch full text.
  let fullText = '';
  let paywallSuspected = false;
  try {
    const fetched = await fetchFullText(item.url);
    fullText         = fetched.text;
    paywallSuspected = fetched.paywallSuspected;
    // The page's <title>/og:title is more reliable than scraped link text;
    // override unless we already have a clean RSS-supplied title.
    const scrapedLooksBad = !!item.title && (item.title.includes('\n') || item.title.length > 120);
    if (fetched.title && (!item.title || scrapedLooksBad)) {
      // Strip common " - Site Name" / " | Site Name" suffixes that <title>
      // tags often carry. Keep stripping conservative — only the trailing
      // delimiter + short site name pattern.
      item.title = fetched.title.replace(/\s+[-|—]\s+[^|—-]{1,40}$/, '').trim();
    }
  } catch (err) {
    const msg = `fetchFullText: ${(err as Error).message}`;
    console.error(`    ${msg}`);
    return null; // can't score without text
  }
  if (!fullText || fullText.length < 200) {
    console.error('    skipping: full text too short');
    return null;
  }

  // 2. Rubric.
  let rubric: RubricResult;
  try {
    rubric = await callRubric(client, source, item, fullText, discoveryType);
  } catch (err) {
    console.error(`    rubric failed: ${(err as Error).message}`);
    return null;
  }
  console.error(`    rubric: ${rubric.verdict} (total ${rubric.total})`);
  if (rubric.verdict === 'drop') {
    return { source, item, fullText, paywallSuspected, rubric, annotation: null, connections: null, slug, errors };
  }

  // 3. Annotation (no related-article context yet — connections come after).
  let annotation: AnnotationResult | null = null;
  try {
    annotation = await callAnnotation(client, source, item, fullText, rubric, null);
  } catch (err) {
    const msg = `annotation failed: ${(err as Error).message}`;
    console.error(`    ${msg}`);
    errors.push(msg);
  }

  // 4. Connection mapping.
  let connections: ConnectionResult | null = null;
  if (annotation) {
    try {
      connections = await callConnections(client, source, item, rubric, annotation.annotation_draft, corpus);
    } catch (err) {
      const msg = `connections failed: ${(err as Error).message}`;
      console.error(`    ${msg}`);
      errors.push(msg);
    }
  }

  return { source, item, fullText, paywallSuspected, rubric, annotation, connections, slug, errors };
}

async function main(): Promise<void> {
  const runStart = new Date();
  console.error(`Field Notes agent — run started ${runStart.toISOString()}`);
  if (flags.local)   console.error('  --local: will not commit/push');
  if (flags.testUrl) console.error(`  --test-url: ${flags.testUrl}`);
  if (flags.source)  console.error(`  --source: ${flags.source}`);

  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.mkdirSync(RUN_LOG_DIR, { recursive: true });

  const sources = loadSources();
  const state   = loadState();
  const corpus  = buildCorpus();
  console.error(`  ${sources.length} sources, ${corpus.length} corpus entries`);

  const client = makeClient();
  if (flags.dryRun) console.error('  --dry-run: discovery only, no API calls');

  const staged:   Candidate[] = [];
  let dropped     = 0;
  let errored     = 0;

  // Test-url mode: bypass discovery, treat the URL as a single monitored piece.
  if (flags.testUrl) {
    const stub: Source = sources.find(s => s.id === flags.source) ?? {
      id: 'test', name: 'Test', url: flags.testUrl, rss: null,
      tier: 'priority', content_type: 'mixed', category: 'company_blog', notes: null,
    };
    const item: DiscoveredItem = { url: flags.testUrl, title: null, author: null, publicationDate: null };
    const c = await processOne(client, stub, item, corpus, 'monitored');
    if (c) {
      if (c.rubric.verdict === 'drop') { dropped++; }
      else { writeStagingMdx(c); staged.push(c); }
    } else {
      errored++;
    }
  } else {
    const targetSources = flags.source ? sources.filter(s => s.id === flags.source) : sources;
    if (flags.source && !targetSources.length) {
      throw new Error(`No source with id "${flags.source}" in sources.yaml`);
    }

    for (const source of targetSources) {
      console.error(`\n[${source.id}] ${source.name}`);
      const seenUrls = new Set(state.sources[source.id]?.lastSeenUrls ?? []);

      let items: DiscoveredItem[];
      try {
        items = await discoverFromSource(source);
      } catch (err) {
        console.error(`  discovery failed: ${(err as Error).message}`);
        errored++;
        continue;
      }
      const isFirstRun = !state.sources[source.id];
      const newItems = items.filter(i => !seenUrls.has(i.url));
      console.error(`  discovered ${items.length} items, ${newItems.length} new${isFirstRun ? ' (first run for this source)' : ''}`);

      // On the very first run for a source, we don't yet know what's old; cap
      // hard so we don't blast the API with the entire backlog.
      const toProcess = (isFirstRun ? newItems.slice(0, Math.min(flags.limit, 3)) : newItems.slice(0, flags.limit));

      for (const item of toProcess) {
        try {
          const c = await processOne(client, source, item, corpus, 'monitored');
          if (!c) {
            if (!flags.dryRun) errored++;
            continue;
          }
          if (c.rubric.verdict === 'drop') { dropped++; }
          else { writeStagingMdx(c); staged.push(c); }
        } catch (err) {
          console.error(`  unexpected error: ${(err as Error).message}`);
          errored++;
        }
      }

      // Update state with all discovered URLs (whether processed or not, so we
      // don't reprocess them next week). Keep the most recent STATE_URL_CAP.
      const allSeen = new Set([...seenUrls, ...items.map(i => i.url)]);
      const trimmed = [...allSeen].slice(-STATE_URL_CAP);
      state.sources[source.id] = { lastSeenUrls: trimmed, lastRunAt: runStart.toISOString() };
    }
  }

  // Write digest, log run, save state.
  const digestPath = writeDigest(staged, dropped, errored, runStart);
  console.error(`\nWrote ${digestPath}`);

  const logPath = path.join(RUN_LOG_DIR, `${runStart.toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(logPath, JSON.stringify({
    runStart:    runStart.toISOString(),
    runEnd:      new Date().toISOString(),
    flags,
    summary:     { staged: staged.length, dropped, errored },
    candidates:  staged.map(c => ({
      slug:    c.slug,
      url:     c.item.url,
      source:  c.source.id,
      verdict: c.rubric.verdict,
      total:   c.rubric.total,
      tags:    c.rubric.suggested_tags,
      errors:  c.errors,
    })),
  }, null, 2), 'utf8');
  console.error(`Wrote ${logPath}`);

  if (!flags.testUrl) saveState(state);

  console.error(`\nDone. Staged ${staged.length}, dropped ${dropped}, errored ${errored}.`);
}

main().catch((err: Error) => {
  console.error(`\nFatal error: ${err.message}`);
  console.error(err.stack);
  // Try to leave a partial digest if we crashed mid-run.
  try { writeDigest([], 0, 1, new Date()); } catch { /* ignore */ }
  process.exit(1);
});
