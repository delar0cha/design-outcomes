// ─────────────────────────────────────────────────────────────────────────────
// UPDATE THIS EACH WEEK WHEN PUBLISHING NEW CONTENT
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENT_ISSUE = {
  issueNumber: 4,              // display as "Issue 04"
  weekOf:      'May 3',        // short form — retained for ad-hoc references, no longer used by nav/footer
  weekOfFull:  'May 3, 2026',  // long form used by formatIssueLabel() everywhere
} as const;

/**
 * Single source of truth for the "Issue NN — Week of Month DD, YYYY" label
 * shown in the site footer. (The header used to show this too; that now
 * lives per-slide inside the homepage carousel via formatPostIssueLabel.)
 * Rendering surface: wrap the returned string in a span with class
 * `do-issue-label`.
 */
export function formatIssueLabel(): string {
  const n = String(CURRENT_ISSUE.issueNumber).padStart(2, '0');
  return `Issue ${n} — Week of ${CURRENT_ISSUE.weekOfFull}`;
}

/**
 * Per-post issue label shown inside the homepage carousel between the
 * article excerpt and the CTA row. Uses each post's own `issue` and
 * `publishedAt` so each carousel slide announces its own week.
 * Returns null when the post has no issue assigned — the carousel will
 * skip the metadata line rather than render an empty space.
 */
export function formatPostIssueLabel(post: { issue?: number; publishedAt: string | Date }): string | null {
  if (!post.issue) return null;
  const d = typeof post.publishedAt === 'string' ? new Date(post.publishedAt) : post.publishedAt;
  const longDate = d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  return `Issue ${String(post.issue).padStart(2, '0')} — Week of ${longDate}`;
}

export const AUTHOR = {
  name:     'Leonardo De La Rocha',
  initials: 'LR',
  role:     'VP Product Design',
  domain:   'ldlr.design',
} as const;
