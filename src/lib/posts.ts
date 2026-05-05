import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import readingTime from 'reading-time';
import type { PostSummary, HeroCover } from './types';
import { CURRENT_ISSUE } from './issue';

type PostEntry = CollectionEntry<'posts'>;

// ─── Collection queries ────────────────────────────────────────────────────

/**
 * Returns all posts, sorted newest-first.
 * In production, drafts are excluded. In dev, all posts are included.
 */
export async function getAllPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('posts', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true
  );
  return posts.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
  );
}

/**
 * Returns every post belonging to the current issue (CURRENT_ISSUE.issueNumber
 * in src/lib/issue.ts), sorted newest-first. No slice, no fallback — the
 * carousel surfaces exactly the current week's batch.
 */
export async function getFeaturedPosts(): Promise<PostEntry[]> {
  const all = await getAllPosts();
  return all.filter(p => p.data.issue === CURRENT_ISSUE.issueNumber);
}

/**
 * Return a single post by slug. Returns undefined if not found.
 */
export async function getPostBySlug(slug: string): Promise<PostEntry | undefined> {
  const all = await getCollection('posts');
  return all.find(p => p.id === slug || p.id === `${slug}.mdx`);
}

// ─── Reading-time ──────────────────────────────────────────────────────────

/**
 * Calculate reading time from raw MDX body text.
 * Returns a string like "4 min read".
 */
export function calcReadingTime(body: string): string {
  const stats = readingTime(body);
  return stats.text; // e.g. "4 min read"
}

// ─── Serialisation ─────────────────────────────────────────────────────────

/**
 * Convert a CollectionEntry to a plain PostSummary object safe to pass as
 * a React island prop (no non-serialisable Dates, etc.).
 */
export function toPostSummary(entry: PostEntry): PostSummary {
  return {
    slug:        entry.id.replace(/\.mdx?$/, ''),
    title:       entry.data.title,
    description: entry.data.description,
    why:         entry.data.why,
    category:    entry.data.category,
    audience:    entry.data.audience,
    // After image() schema migration, coverImage is ImageMetadata, not a
    // string. The Illustration component (PostGrid card thumbs, related-
    // posts grid) needs a single URL — resolveSummaryCovers below fills
    // in `coverImage` (small variant URL) and `cover` (responsive set
    // for the FeaturedCarousel hero) for posts that have a cover.
    coverImage:  undefined,
    cover:       undefined,
    publishedAt: entry.data.publishedAt.toISOString(),
    readingTime: calcReadingTime(entry.body ?? ''),
    issue:       entry.data.issue,
    draft:       entry.data.draft,
    tags:        entry.data.tags ?? [],
    audio:       entry.data.audio,
    timings:     entry.data.timings,
  };
}

/**
 * Resolve hero cover variants for an array of summaries. Call from .astro
 * pages after toPostSummary(); fills in the small thumbnail URL plus the
 * responsive set for the carousel hero. Skips entries whose source post
 * has no coverImage. The async work runs in parallel.
 */
export async function resolveSummaryCovers(
  summaries: PostSummary[],
  entries:   PostEntry[],
): Promise<PostSummary[]> {
  const byId = new Map(entries.map(e => [e.id.replace(/\.mdx?$/, ''), e]));
  return Promise.all(summaries.map(async s => {
    const entry = byId.get(s.slug);
    const img   = entry?.data.coverImage;
    if (!img) return s;
    // Small variant (600w q60 webp) — used by Illustration's SVG <image>
    // path for card thumbnails (PostGrid + related-posts grid). The SVG
    // wrapper has no srcset support, so a single resolution is the limit.
    const thumb = await getImage({
      src: img, width: 600, format: 'webp', quality: 60,
    });
    // Responsive set for the FeaturedCarousel hero (~750 framed, ~1500
    // bleed). Largest art column is full viewport at full-bleed; 1500w
    // covers a 1920px viewport at 1× DPR or a 750px viewport at 2× DPR.
    const small = await getImage({
      src: img, width: 750, format: 'webp', quality: 60,
    });
    const large = await getImage({
      src: img, width: 1500, format: 'webp', quality: 60,
    });
    const cover: HeroCover = {
      src:    large.src,
      srcset: `${small.src} 750w, ${large.src} 1500w`,
      sizes:  '(max-width: 1080px) 100vw, 1500px',
      width:  large.attributes.width  ?? 1500,
      height: large.attributes.height ?? Math.round(1500 * (img.height / img.width)),
    };
    return { ...s, coverImage: thumb.src, cover };
  }));
}
