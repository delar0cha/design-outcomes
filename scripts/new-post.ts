#!/usr/bin/env tsx
/**
 * new-post.ts — scaffold a new MDX post from the template
 *
 * Usage:
 *   npm run new-post -- --title "Your Post Title"
 *   npm run new-post -- --title "Your Post Title" --category toolbox --audience Everyone
 */

import fs   from 'fs';
import path from 'path';

// ── Argument parsing ────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

const title    = getArg('--title');
const category = getArg('--category') ?? 'decision';
const audience = getArg('--audience') ?? 'Leaders';

if (!title) {
  console.error('Error: --title is required.\n');
  console.error('  npm run new-post -- --title "Your Post Title"');
  process.exit(1);
}

// ── Slug generation ─────────────────────────────────────────────────────────

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/['']/g, '')          // smart apostrophes
    .replace(/[^a-z0-9\s-]/g, '') // strip non-alphanum
    .trim()
    .replace(/\s+/g, '-')          // spaces → dashes
    .replace(/-+/g, '-');          // collapse dashes
}

// ── Date helpers ────────────────────────────────────────────────────────────

function isoDate(d = new Date()): string {
  return d.toISOString().split('T')[0];
}

// ── Paths ───────────────────────────────────────────────────────────────────

const POSTS_DIR = path.resolve('src/content/posts');
const slug      = toSlug(title);
const filePath  = path.join(POSTS_DIR, `${slug}.mdx`);

if (fs.existsSync(filePath)) {
  console.error(`Error: File already exists at ${filePath}`);
  process.exit(1);
}

// ── Frontmatter ─────────────────────────────────────────────────────────────

const today = isoDate();

const frontmatter = `\
---
title: "${title.replace(/"/g, '\\"')}"
publishedAt: ${today}
description: "One sentence. This appears in the card, OG description, and reading list."
why: ""
category: ${category}
audience: ${audience}
coverImage: /images/${slug}.jpg
featured: false
draft: true
tags: []
# audio: https://...
# audioGeneratedAt: ${today}
---

Opening paragraph — write here.
`;

// ── Write ───────────────────────────────────────────────────────────────────

fs.writeFileSync(filePath, frontmatter, 'utf8');

console.log(`\n✓ Created: src/content/posts/${slug}.mdx`);
console.log(`\nNext steps:`);
console.log(`  1. Add your cover image → public/images/${slug}.jpg`);
console.log(`  2. Write the post in the new file`);
console.log(`  3. Set draft: false and featured: true when ready to publish`);
console.log(`  4. Update src/lib/issue.ts with the new issue number\n`);
