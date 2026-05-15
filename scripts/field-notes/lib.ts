/**
 * Shared helpers for the manual Field Notes flow.
 *
 * Mirrors the URL-/RSS-/HTML-handling logic that the deleted Field Notes
 * agent (src/agent/run.ts) used, stripped down to what the manual scripts
 * (search.ts, new.ts) need. Lightweight regex parsing only — no cheerio,
 * no rss-parser, no dotenv.
 */

import fs   from 'node:fs';
import path from 'node:path';

// ── .env.local loader (mirrors scripts/generate-audio.ts) ────────────────────

export function loadDotenv(filePath: string): void {
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
    // Always let .env.local win over a shell-inherited value. Some sandboxes
    // export the env key as an empty string, which would otherwise prevent
    // the file value from taking effect.
    if (value) process.env[key] = value;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Source {
  id:   string;
  name: string;
  url:  string;
  rss:  string | null;
}

export interface SourcesFile {
  blocklist: string[];
  sources:   Source[];
}

export interface DiscoveredItem {
  url:             string;
  title:           string | null;
  author:          string | null;
  publicationDate: string | null; // ISO date YYYY-MM-DD or null
  summary:         string | null;
}

// ── URL canonicalization ─────────────────────────────────────────────────────

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|ref_src$|ref_url$|igshid$|_hsenc$|_hsmi$|hsCtaTracking$|cmpid$|share$|s$|si$)/i;

/**
 * Canonicalize a URL for dedupe:
 *   - lowercase host
 *   - drop default port
 *   - strip tracking query params
 *   - drop fragment
 *   - remove trailing slash (except root)
 * Returns the original input unchanged on parse failure.
 */
export function canonicalizeUrl(input: string): string {
  let u: URL;
  try { u = new URL(input.trim()); } catch { return input.trim(); }

  u.hostname = u.hostname.toLowerCase();
  if (
    (u.protocol === 'https:' && u.port === '443') ||
    (u.protocol === 'http:'  && u.port === '80')
  ) {
    u.port = '';
  }

  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) u.searchParams.delete(key);
  }

  u.hash = '';

  let s = u.toString();
  if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1);
  return s;
}

// ── Slug helpers (mirrors prior agent + scripts/new-post.ts) ─────────────────

export function slugify(s: string): string {
  return s.toLowerCase()
          .replace(/['']/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 80);
}

// ── HTTP fetch (mirrors prior agent) ─────────────────────────────────────────

export const FETCH_TIMEOUT_MS = 20_000;
export const FETCH_USER_AGENT = 'FieldNotes-Manual/0.1 (+https://ldlr.design)';

export async function httpFetch(
  url:    string,
  accept: string = '*/*',
): Promise<{ status: number; body: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers:  { 'User-Agent': FETCH_USER_AGENT, Accept: accept },
      signal:   controller.signal,
      redirect: 'follow',
    });
    const body = await res.text();
    return { status: res.status, body, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

// ── HTML utilities ───────────────────────────────────────────────────────────

const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&rsquo;': '’', '&lsquo;': '‘',
  '&ldquo;': '“', '&rdquo;': '”',
  '&mdash;': '—', '&ndash;': '–',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39|apos|rsquo|lsquo|ldquo|rdquo|mdash|ndash);/g, m => HTML_ENTITY_MAP[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

export function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<\/(p|div|li|h[1-6]|br|tr|blockquote|article|section)>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  s = s.replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').replace(/\n{3,}/g, '\n\n');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s.trim();
}

function unwrapCdata(s: string): string {
  const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : s;
}

function decodeXml(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

// ── RSS / Atom parsing (subset of prior agent's parseFeed) ───────────────────

export function parseFeed(xml: string): DiscoveredItem[] {
  const out: DiscoveredItem[] = [];

  // RSS 2.0
  for (const block of xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []) {
    const title   = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
    const link    = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]   ?? null;
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? null;
    const author  = block.match(/<(?:dc:creator|author)[^>]*>([\s\S]*?)<\/(?:dc:creator|author)>/i)?.[1] ?? null;
    const descRaw = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? null;
    if (!link) continue;
    const isoDate = pubDate ? toIsoDate(pubDate.trim()) : null;
    out.push({
      url:             decodeXml(unwrapCdata(link.trim())),
      title:           title  ? decodeXml(unwrapCdata(title.trim()))  : null,
      author:          author ? decodeXml(unwrapCdata(author.trim())) : null,
      publicationDate: isoDate,
      summary:         descRaw ? truncate(htmlToText(unwrapCdata(descRaw)), 200) : null,
    });
  }

  // Atom
  for (const block of xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? []) {
    const title   = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
    const linkTag = block.match(/<link[^>]*\bhref\s*=\s*"([^"]+)"/i)?.[1] ?? null;
    const updated = block.match(/<(?:published|updated)[^>]*>([\s\S]*?)<\/(?:published|updated)>/i)?.[1] ?? null;
    const author  = block.match(/<author[\s>][\s\S]*?<name[^>]*>([\s\S]*?)<\/name>/i)?.[1] ?? null;
    const summary = block.match(/<(?:summary|content)[^>]*>([\s\S]*?)<\/(?:summary|content)>/i)?.[1] ?? null;
    if (!linkTag) continue;
    out.push({
      url:             decodeXml(linkTag.trim()),
      title:           title  ? decodeXml(unwrapCdata(title.trim()))  : null,
      author:          author ? decodeXml(unwrapCdata(author.trim())) : null,
      publicationDate: updated ? updated.trim().split('T')[0] : null,
      summary:         summary ? truncate(htmlToText(unwrapCdata(summary)), 200) : null,
    });
  }

  return out;
}

function toIsoDate(s: string): string | null {
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().split('T')[0];
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

// ── Editorial filter ─────────────────────────────────────────────────────────
//
// Two-layer filter to keep marketing pages, product pages, taxonomy indexes,
// auxiliary pages, and bare navigation labels out of the candidate list.
// Applied both during page-scrape (extractLinksFromHtml) and again in
// search.ts against the merged candidate set (so RSS- and web-search-supplied
// items get the same treatment).

// Match anywhere in the path. Taxonomy structures can be nested under any
// prefix (e.g. /blog/category/news, /blog/topics/accounting), so anchoring at
// the start would miss them.
const NON_EDITORIAL_PATH_ANYWHERE = /\/(?:categor(?:y|ies)|tags?|topics?|section)(?:\/|$)/i;

// Match at the start of the path only. Drops product/marketing/auxiliary
// pages at root level.
// Note: /security is intentionally NOT in this list — github.blog uses
// /security/<article-slug> for real blog articles. Vercel's
// /security/bot-management product page is caught by the title filter instead
// (NAV_LABELS contains "bot management" etc.). Adding it here would create
// false positives on GitHub's security content.
const NON_EDITORIAL_PATH_PREFIX = /^\/(?:pricing|products?|solutions|use-cases|teams|platform|enterprise|frameworks|core-features|docs?|customers|signup|sign-up|sign[_-]?in|login|log[_-]?in|signin|about|contact|careers|jobs|homepage|home|search|authors?|page|archive|feed|rss|sitemap|legal|privacy(?:-policy)?|terms(?:-of-(?:service|use))?|status|changelog|press|partners|integrations|download|apps?|users?|track|tracks|song|songs)(?:\/|$)/i;

// Bare navigation labels that masquerade as titles. Compared case-insensitive
// against the trimmed title. Keep this list short and concrete — the
// short-title heuristic below catches most others structurally.
const NAV_LABELS = new Set([
  'pricing', 'news', 'community', 'craft', 'accessibility',
  'get started', 'overview', 'log in', 'login', 'sign in', 'sign up', 'signin', 'signup',
  'about', 'contact', 'search', 'help', 'support',
  'press', 'partners', 'careers', 'jobs', 'status', 'changelog',
  'privacy', 'terms', 'legal', 'home', 'homepage',
  'library', 'tracks', 'songs', 'channels',
  'find a co-host', 'voice & tone', 'voice and tone',
  'maker stories', 'working well', 'inside figma', 'insights',
  'behind the scenes', '3d design',
  'design system', 'design systems', 'see what\'s new', "see what's new",
  'trending songs', 'design philosophy', 'design thinking', 'design services',
  'design language', 'practices', 'teams', 'impact',
  'color', 'typography', 'tokens', 'iconography', 'ai', 'ai gateway', 'ai sdk',
  'ci/cd', 'observability', 'bot management', 'web application firewall',
  'next.js', 'turborepo', 'composable commerce', 'marketing sites',
  'managed payments', 'payment links', 'checkout', 'elements', 'payment methods',
  'authorization boost', 'link', 'usage-based billing', 'subscriptions',
  'revenue recognition',
  'notion calendar', 'notion mail',
  'product', 'product psychology', 'agencies', 'sales', 'success', 'marketing',
  'designers', 'pitch decks', 'sales decks', 'presentation maker',
  'meridian', 'inside mercury',
  'cmf',
]);

/** Drop a URL if its path matches non-editorial patterns or is a bare
 *  category/work index page. */
export function isEditorialUrl(url: string): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  const path = u.pathname;

  if (NON_EDITORIAL_PATH_PREFIX.test(path)) return false;
  if (NON_EDITORIAL_PATH_ANYWHERE.test(path)) return false;

  // Bare /blog/<single-segment>: category index page (Figma blog uses this).
  // Threshold tuned so real article slugs survive — Intercom and Webflow use
  // /blog/<slug> with 1-2 dashes and 15-25 chars for real posts. Figma
  // categories tend to be ≤15 chars and 0-1 dashes ("news", "ai",
  // "design-systems", "maker-stories"). Multi-word category titles like
  // "Behind the scenes" that pass this URL check are caught by NAV_LABELS.
  const blogSingle = path.match(/^\/blog\/([^\/]+)\/?$/);
  if (blogSingle) {
    const seg = blogSingle[1];
    const dashCount = (seg.match(/-/g) ?? []).length;
    if (seg.length <= 15 && dashCount <= 1) return false;
  }

  // Bare /now/<single-segment>: Linear "Now" landing pages live here.
  const nowSingle = path.match(/^\/now\/([^\/]+)\/?$/);
  if (nowSingle) {
    const seg = nowSingle[1];
    const dashCount = (seg.match(/-/g) ?? []).length;
    if (seg.length < 25 && dashCount <= 2) return false;
  }

  // Bare /work or /work/<short-slug>: Pentagram-style portfolio indexes.
  const workMatch = path.match(/^\/work(?:\/([^\/]+))?\/?$/);
  if (workMatch) {
    const seg = workMatch[1];
    if (!seg) return false; // bare /work
    const dashCount = (seg.match(/-/g) ?? []).length;
    if (seg.length < 25 && dashCount <= 1) return false;
  }

  return true;
}

/** Drop a title if it reads as a bare navigation label. Conservative: tries
 *  not to drop short-but-legit titles. Returns true for "looks editorial." */
export function isEditorialTitle(title: string | null): boolean {
  if (!title) return true; // unknown title: let URL filter and rubric decide
  const t = title.trim();
  if (!t) return true;
  const lc = t.toLowerCase();
  if (NAV_LABELS.has(lc)) return false;

  // Structural: ≤2 words AND ≤25 chars AND no sentence-style punctuation
  // catches "AI Gateway", "Bot Management", "Plastic Air" etc.
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  const hasSentencePunct = /[:?!—–]|'|'/.test(t);
  if (wordCount <= 2 && t.length <= 25 && !hasSentencePunct) return false;

  // "X & Y" taxonomy pattern: short title connecting two nouns with " & ".
  // Catches Pentagram ("Arts & Culture", "Climate & Sustainability") and
  // Figma category labels ("Career & education", "Plugins & tooling"). Cap
  // at 30 chars so real article titles like "Design & engineering: closing
  // the gap" survive. Intentionally not matching " and " — too many real
  // titles use it ("Proof and possibility", "A and B in distributed teams").
  if (t.length <= 30 && /\s&\s/.test(t) && !hasSentencePunct) return false;

  return true;
}

// ── Page-scrape fallback (lightweight, anchor-only) ──────────────────────────
//
// Used only when a source has no RSS feed. Applies isEditorialUrl during link
// extraction so per-source noise (Figma blog categories, Pentagram /work
// indexes, Stripe /payments product pages) never enters the candidate stream.

function looksLikePost(absoluteUrl: string): boolean {
  let u: URL;
  try { u = new URL(absoluteUrl); } catch { return false; }
  const pathname = u.pathname;
  const segs     = pathname.split('/').filter(Boolean);
  const last     = segs[segs.length - 1] ?? '';
  if (segs.length === 0) return false;
  if (!isEditorialUrl(absoluteUrl)) return false;
  const hasDate  = /\/(?:19|20)\d{2}(?:\/\d{1,2})?(?:\/|$)/.test(pathname);
  const hasSlug  = /-/.test(last) && last.length > 4;
  const hasDepth = segs.length >= 2;
  return hasDepth || hasDate || hasSlug;
}

export function extractLinksFromHtml(html: string, baseUrl: string): DiscoveredItem[] {
  const baseHost = new URL(baseUrl).host;
  const found = new Map<string, DiscoveredItem>();
  const anchor = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchor.exec(html)) !== null) {
    const href = m[1];
    const text = htmlToText(m[2]).split('\n').map(s => s.trim()).find(Boolean) ?? '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue;

    let absolute: string;
    try { absolute = new URL(href, baseUrl).toString(); } catch { continue; }
    try {
      if (new URL(absolute).host !== baseHost) continue;
    } catch { continue; }
    if (absolute === baseUrl) continue;
    if (/\.(png|jpg|jpeg|svg|gif|webp|css|js|xml|pdf|mp3|mp4)(\?|$)/i.test(absolute)) continue;
    if (!looksLikePost(absolute)) continue;

    const truncatedTitle = text.slice(0, 200) || null;
    // Skip nav labels we can already see from anchor text.
    if (!isEditorialTitle(truncatedTitle)) continue;

    if (!found.has(absolute)) {
      found.set(absolute, { url: absolute, title: truncatedTitle, author: null, publicationDate: null, summary: null });
    }
  }
  return [...found.values()];
}

// ── Article metadata extraction ──────────────────────────────────────────────

export interface ArticleMeta {
  title:        string | null;
  canonicalUrl: string | null;
  publisher:    string | null;
  author:       string | null;
  publishedAt:  string | null; // ISO date
  description:  string | null;
}

function metaContent(html: string, attr: string, value: string): string | null {
  // Match <meta name="..." content="..."> in either attribute order.
  const re = new RegExp(
    `<meta\\b[^>]*\\b${attr}\\s*=\\s*["']${value}["'][^>]*\\bcontent\\s*=\\s*["']([^"']*)["']` +
    `|<meta\\b[^>]*\\bcontent\\s*=\\s*["']([^"']*)["'][^>]*\\b${attr}\\s*=\\s*["']${value}["']`,
    'i',
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1] ?? m[2] ?? '') : null;
}

export function extractArticleMeta(html: string, requestedUrl: string): ArticleMeta {
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
  const ogTitle  = metaContent(html, 'property', 'og:title')
                ?? metaContent(html, 'name',     'twitter:title');
  let title = ogTitle ?? (titleTag ? htmlToText(titleTag) : null);
  // Strip trailing " - Site Name" / " | Site Name" suffixes (short tail only).
  if (title) title = title.replace(/\s+[-|—]\s+[^|—-]{1,40}$/, '').trim();

  const canonicalHref = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
                     ?? html.match(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\brel\s*=\s*["']canonical["']/i)?.[1]
                     ?? null;
  let canonicalUrl: string | null = null;
  if (canonicalHref) {
    try { canonicalUrl = new URL(canonicalHref, requestedUrl).toString(); }
    catch { canonicalUrl = null; }
  }

  const publisher = metaContent(html, 'property', 'og:site_name');
  const author    = metaContent(html, 'name',     'author')
                 ?? metaContent(html, 'property', 'article:author')
                 ?? metaContent(html, 'name',     'twitter:creator');

  const publishedRaw = metaContent(html, 'property', 'article:published_time')
                    ?? metaContent(html, 'property', 'og:article:published_time')
                    ?? metaContent(html, 'name',     'datePublished')
                    ?? metaContent(html, 'name',     'pubdate')
                    ?? null;
  const publishedAt = publishedRaw ? toIsoDate(publishedRaw) : null;

  const description = metaContent(html, 'property', 'og:description')
                   ?? metaContent(html, 'name',     'description')
                   ?? null;

  return { title, canonicalUrl, publisher, author, publishedAt, description };
}

// ── Existing field-notes index (for dedupe) ──────────────────────────────────

export function readExistingFieldNoteUrls(repoRoot: string): Set<string> {
  const dir = path.join(repoRoot, 'src/content/field-notes/published');
  const out = new Set<string>();
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.mdx')) continue;
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const fm  = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const url = fm.match(/^source_url:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
    if (url) out.add(canonicalizeUrl(url));
  }
  return out;
}

export function readExistingSlugs(repoRoot: string): Set<string> {
  const dir = path.join(repoRoot, 'src/content/field-notes/published');
  const out = new Set<string>();
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.mdx')) out.add(file.replace(/\.mdx$/, ''));
  }
  return out;
}

// ── Schema sanity check ──────────────────────────────────────────────────────
//
// The new.ts script writes a specific set of frontmatter fields. If someone
// renames a field in the content collection schema without updating this
// script, builds break. This check reads src/content/config.ts as text and
// asserts that every field name we write still appears in the schema.

const FRONTMATTER_FIELDS_WRITTEN = [
  'slug', 'source', 'source_id', 'source_url',
  'piece_title', 'piece_author', 'piece_published_at',
  'tactic_tags', 'rubric_scores', 'rubric_verdict', 'rubric_rationale',
  'paywall_encountered', 'display_type', 'bullets', 'generated_at',
] as const;

export function assertSchemaShape(repoRoot: string): void {
  const configPath = path.join(repoRoot, 'src/content/config.ts');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Cannot find content schema at ${configPath}.`);
  }
  const text = fs.readFileSync(configPath, 'utf8');
  const missing: string[] = [];
  for (const field of FRONTMATTER_FIELDS_WRITTEN) {
    // Match `field:` at the start of an indented schema line (after `z.object({`).
    const re = new RegExp(`\\b${field}\\s*:`);
    if (!re.test(text)) missing.push(field);
  }
  if (missing.length) {
    throw new Error(
      `Schema check failed. The following fields are no longer in src/content/config.ts: ${missing.join(', ')}. ` +
      `Either restore them or update scripts/field-notes/new.ts.`,
    );
  }
}

// ── Date helpers ─────────────────────────────────────────────────────────────

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export function isWithinDays(isoDate: string | null, days: number): boolean {
  if (!isoDate) return true; // unknown date: keep, let the human judge
  const ms = Date.parse(isoDate);
  if (!Number.isFinite(ms)) return true;
  return Date.now() - ms <= days * 24 * 60 * 60 * 1000;
}
