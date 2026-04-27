#!/usr/bin/env tsx
/**
 * migrate-articles.ts — one-time prep step to add `themes` and `tactics`
 * fields to existing posts in src/content/posts/.
 *
 * Themes are free-text (comma-separated). Tactics are constrained to the
 * controlled vocabulary used by the Field Notes rubric.
 *
 * Run once after the agent is built, before its first real run.
 */

import fs        from 'node:fs';
import path      from 'node:path';
import readline  from 'node:readline/promises';
import matter    from 'gray-matter';

const POSTS_DIR = path.resolve('src/content/posts');

const TACTICS = [
  'research_and_validation',
  'systems_and_primitives',
  'prototyping_and_exploration',
  'critique_and_decision_making',
  'craft_and_detail',
  'cross_functional_and_process',
  'storytelling_and_narrative',
  'hiring_and_team',
] as const;

async function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return (await rl.question(prompt)).trim();
}

function parseSelection(input: string): string[] {
  // Accept indices ("1,3,5"), names ("craft_and_detail, hiring_and_team"),
  // or a mix.
  const out = new Set<string>();
  for (const piece of input.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)) {
    const asNum = parseInt(piece, 10);
    if (!isNaN(asNum) && asNum >= 1 && asNum <= TACTICS.length) {
      out.add(TACTICS[asNum - 1]);
    } else if ((TACTICS as readonly string[]).includes(piece)) {
      out.add(piece);
    } else {
      console.error(`  ignoring "${piece}" (not a known tactic or index)`);
    }
  }
  return [...out];
}

async function main(): Promise<void> {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`No posts directory at ${POSTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  if (!files.length) {
    console.log('No posts to migrate.');
    return;
  }

  console.log(`Found ${files.length} ${files.length === 1 ? 'post' : 'posts'}.\n`);
  console.log('Tactic vocabulary:');
  for (const [i, t] of TACTICS.entries()) console.log(`  ${i + 1}. ${t}`);
  console.log('');
  console.log('For each post, you can press Enter to leave a field as-is.');
  console.log('Type "skip" to skip the post entirely. "quit" exits.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const changed: string[] = [];

  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const raw      = fs.readFileSync(filePath, 'utf8');
    const parsed   = matter(raw);
    const slug     = file.replace(/\.mdx$/, '');

    console.log('────────────────────────────────────────────────────────');
    console.log(`Slug: ${slug}`);
    console.log(`Title: ${parsed.data.title ?? '(no title)'}`);
    if (parsed.data.category)    console.log(`Category: ${parsed.data.category}`);
    if (parsed.data.description) console.log(`Description: ${parsed.data.description}`);
    if (parsed.data.tags?.length)    console.log(`Existing tags: ${parsed.data.tags.join(', ')}`);
    if (parsed.data.themes?.length)  console.log(`Existing themes: ${parsed.data.themes.join(', ')}`);
    if (parsed.data.tactics?.length) console.log(`Existing tactics: ${parsed.data.tactics.join(', ')}`);
    console.log('');

    const themesInput = await ask(rl,
      `Themes (comma-separated free-text, or "skip"/"quit"; current: ${(parsed.data.themes ?? []).join(', ') || '(none)'}): `,
    );
    if (themesInput.toLowerCase() === 'quit') break;
    if (themesInput.toLowerCase() === 'skip') { console.log('  skipping.\n'); continue; }

    const tacticsInput = await ask(rl,
      `Tactics (indices 1-${TACTICS.length} or names, comma-separated; current: ${(parsed.data.tactics ?? []).join(', ') || '(none)'}): `,
    );
    if (tacticsInput.toLowerCase() === 'quit') break;
    if (tacticsInput.toLowerCase() === 'skip') { console.log('  skipping.\n'); continue; }

    const newThemes  = themesInput
      ? themesInput.split(',').map(s => s.trim()).filter(Boolean)
      : (parsed.data.themes ?? []);
    const newTactics = tacticsInput
      ? parseSelection(tacticsInput)
      : (parsed.data.tactics ?? []);

    parsed.data.themes  = newThemes;
    parsed.data.tactics = newTactics;

    const out = matter.stringify(parsed.content, parsed.data);
    fs.writeFileSync(filePath, out, 'utf8');
    changed.push(slug);
    console.log(`  ✓ updated themes: [${newThemes.join(', ')}], tactics: [${newTactics.join(', ')}]\n`);
  }

  rl.close();
  console.log(`\nDone. Updated ${changed.length} ${changed.length === 1 ? 'post' : 'posts'}.`);
  if (changed.length) {
    console.log('Updated slugs:');
    for (const s of changed) console.log(`  - ${s}`);
  }
}

main().catch((err: Error) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
