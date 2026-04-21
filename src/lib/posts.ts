import { getCollection, type CollectionEntry } from 'astro:content';
import readingTime from 'reading-time';
import type { PostSummary } from './types';

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
 * Returns the three featured posts (featured: true in frontmatter),
 * sorted newest-first. Falls back to the three most recent posts if
 * fewer than three are marked featured.
 */
export async function getFeaturedPosts(): Promise<PostEntry[]> {
  const all = await getAllPosts();
  const featured = all.filter(p => p.data.featured);
  if (featured.length >= 3) return featured.slice(0, 3);
  // Pad with most-recent non-featured if needed
  const rest = all.filter(p => !p.data.featured);
  return [...featured, ...rest].slice(0, 3);
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
    heroBgColor: entry.data.heroBgColor,
    publishedAt: entry.data.publishedAt.toISOString(),
    readingTime: calcReadingTime(entry.body ?? ''),
    featured:    entry.data.featured,
    draft:       entry.data.draft,
    tags:        entry.data.tags ?? [],
    audio:       entry.data.audio,
  };
}
