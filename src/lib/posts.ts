import { getCollection, type CollectionEntry } from 'astro:content';
import readingTime from 'reading-time';
import type { PostSummary } from './types';
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
    coverImage:  entry.data.coverImage,
    publishedAt: entry.data.publishedAt.toISOString(),
    readingTime: calcReadingTime(entry.body ?? ''),
    issue:       entry.data.issue,
    draft:       entry.data.draft,
    tags:        entry.data.tags ?? [],
    audio:       entry.data.audio,
    timings:     entry.data.timings,
  };
}
