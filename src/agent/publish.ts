#!/usr/bin/env tsx
/**
 * publish.ts — interactive approve/reject/hold for staged Field Notes entries.
 *
 * For each MDX in src/content/field-notes/staging/ (other than digest.md),
 * shows the annotation + frontmatter and prompts for a decision. Approved
 * files move to published/ and are committed. Rejected files are deleted
 * with a logged reason. Held files stay in staging.
 *
 * After all decisions, runs `npm run build` and reports any errors.
 */

import fs        from 'node:fs';
import path      from 'node:path';
import readline  from 'node:readline/promises';
import { execSync, spawnSync } from 'node:child_process';

const REPO_ROOT     = path.resolve(process.cwd());
const STAGING_DIR   = path.join(REPO_ROOT, 'src/content/field-notes/staging');
const PUBLISHED_DIR = path.join(REPO_ROOT, 'src/content/field-notes/published');
const LOG_DIR       = path.join(REPO_ROOT, 'src/agent/logs/decisions');

interface Decision {
  slug:      string;
  decision:  'approve' | 'reject' | 'hold';
  reason:    string | null;
  timestamp: string;
}

async function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return (await rl.question(prompt)).trim();
}

function readStagingFiles(): string[] {
  if (!fs.existsSync(STAGING_DIR)) return [];
  return fs.readdirSync(STAGING_DIR)
           .filter(f => f.endsWith('.mdx'))
           .map(f => path.join(STAGING_DIR, f));
}

function gitAvailable(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: REPO_ROOT, stdio: 'ignore' });
    return true;
  } catch { return false; }
}

async function main(): Promise<void> {
  fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const files = readStagingFiles();
  if (!files.length) {
    console.log('No staged Field Notes entries found.');
    return;
  }

  console.log(`Found ${files.length} staged ${files.length === 1 ? 'entry' : 'entries'}.\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const decisions: Decision[] = [];
  const approvedPaths: string[] = [];

  for (const filePath of files) {
    const slug = path.basename(filePath, '.mdx');
    const content = fs.readFileSync(filePath, 'utf8');

    console.log('────────────────────────────────────────────────────────');
    console.log(`Slug: ${slug}`);
    console.log(`File: ${path.relative(REPO_ROOT, filePath)}`);
    console.log('');
    console.log(content);
    console.log('────────────────────────────────────────────────────────');

    let answer = '';
    while (!['a', 'r', 'h', 's'].includes(answer)) {
      answer = (await ask(rl, '[a]pprove, [r]eject, [h]old, [s]kip remaining? ')).toLowerCase();
    }

    if (answer === 's') {
      console.log('Skipping remaining files.\n');
      break;
    }

    let reason: string | null = null;
    if (answer === 'r') {
      reason = await ask(rl, 'Reason for rejecting (free text): ');
    }

    const ts = new Date().toISOString();

    if (answer === 'a') {
      const dest = path.join(PUBLISHED_DIR, `${slug}.mdx`);
      fs.renameSync(filePath, dest);
      approvedPaths.push(dest);
      decisions.push({ slug, decision: 'approve', reason: null, timestamp: ts });
      console.log(`✓ Moved to ${path.relative(REPO_ROOT, dest)}\n`);
    } else if (answer === 'r') {
      fs.unlinkSync(filePath);
      decisions.push({ slug, decision: 'reject', reason, timestamp: ts });
      console.log(`✗ Rejected and deleted.\n`);
    } else {
      decisions.push({ slug, decision: 'hold', reason: null, timestamp: ts });
      console.log(`⊙ Held in staging.\n`);
    }
  }

  rl.close();

  // Write decision log.
  const runTs   = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(LOG_DIR, `${runTs}.json`);
  fs.writeFileSync(logPath, JSON.stringify({ decisions }, null, 2), 'utf8');
  console.log(`Wrote decision log: ${path.relative(REPO_ROOT, logPath)}`);

  // Commit approved files.
  if (approvedPaths.length && gitAvailable()) {
    try {
      execSync(`git add ${approvedPaths.map(p => `"${p}"`).join(' ')}`, { cwd: REPO_ROOT });
      // Also stage deletions of rejected files (they were moved out of staging).
      execSync('git add -u src/content/field-notes/staging', { cwd: REPO_ROOT });
      const msg = `field-notes: publish ${approvedPaths.length} ${approvedPaths.length === 1 ? 'entry' : 'entries'}`;
      execSync(`git commit -m "${msg}"`, { cwd: REPO_ROOT });
      console.log(`Committed: ${msg}`);
    } catch (err) {
      console.error(`Git commit failed: ${(err as Error).message}`);
      console.error('Files are still staged — commit manually.');
    }
  }

  // Run build to surface any schema errors introduced by the moves.
  console.log('\nRunning npm run build to verify...');
  const build = spawnSync('npm', ['run', 'build'], { cwd: REPO_ROOT, stdio: 'inherit' });
  if (build.status !== 0) {
    console.error('\nBuild failed. The published files may have introduced a schema or MDX error.');
    process.exit(build.status ?? 1);
  }

  const counts = decisions.reduce(
    (acc, d) => { acc[d.decision] = (acc[d.decision] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  console.log(`\nDone. Approved: ${counts.approve ?? 0}, Rejected: ${counts.reject ?? 0}, Held: ${counts.hold ?? 0}`);
}

main().catch((err: Error) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
