/**
 * corpus.ts — build a JSON corpus of published articles for the
 * connection-mapping prompt.
 *
 * Reads every MDX file in `src/content/posts/` and pulls the frontmatter
 * fields the connection-mapping step needs. Uses the same `gray-matter`
 * dependency the rest of the site already has.
 *
 * Note: the existing collection directory is `posts/`, not `articles/`.
 * The Field Notes spec called it the "article corpus" semantically;
 * we read from posts/ on disk.
 */

import fs           from 'node:fs';
import path         from 'node:path';
import matter       from 'gray-matter';

const POSTS_DIR = path.resolve('src/content/posts');

export interface CorpusEntry {
  slug:        string;
  title:       string;
  category:    string | null;
  themes:      string[];
  tactics:     string[];
  excerpt:     string | null;
  why:         string | null;
  publishedAt: string | null;
}

export function buildCorpus(): CorpusEntry[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));

  return files
    .map((file): CorpusEntry => {
      const filePath = path.join(POSTS_DIR, file);
      const raw      = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(raw);

      const slug = file.replace(/\.mdx$/, '');

      return {
        slug,
        title:       typeof data.title === 'string' ? data.title : slug,
        category:    typeof data.category === 'string' ? data.category : null,
        themes:      Array.isArray(data.themes)  ? data.themes.map(String)  : [],
        tactics:     Array.isArray(data.tactics) ? data.tactics.map(String) : [],
        excerpt:     typeof data.description === 'string' ? data.description : null,
        why:         typeof data.why === 'string' ? data.why : null,
        publishedAt: data.publishedAt instanceof Date
          ? data.publishedAt.toISOString().split('T')[0]
          : (typeof data.publishedAt === 'string' ? data.publishedAt : null),
      };
    })
    .filter(entry => {
      // Drop drafts. Re-read once more because we already discarded the
      // matter object; cheaper to just check the file path again.
      const filePath = path.join(POSTS_DIR, `${entry.slug}.mdx`);
      const { data } = matter(fs.readFileSync(filePath, 'utf8'));
      return data.draft !== true;
    });
}

// Allow `tsx src/agent/corpus.ts` to dump the corpus for debugging.
const isDirectRun = (() => {
  try {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
    return entry === path.resolve(__filename) ||
           entry.endsWith('/src/agent/corpus.ts');
  } catch { return false; }
})();

if (isDirectRun) {
  const corpus = buildCorpus();
  console.log(JSON.stringify(corpus, null, 2));
  console.error(`\n${corpus.length} entries\n`);
}
