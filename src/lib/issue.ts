// ─────────────────────────────────────────────────────────────────────────────
// UPDATE THIS EACH WEEK WHEN PUBLISHING NEW CONTENT
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENT_ISSUE = {
  issueNumber: 3,              // display as "Issue 03"
  weekOf:      'Apr 25',       // short form — retained for ad-hoc references, no longer used by nav/footer
  weekOfFull:  'April 25, 2026', // long form used by formatIssueLabel() everywhere
} as const;

/**
 * Single source of truth for the "Issue NN — Week of Month DD, YYYY" label
 * shown in both the site header (SiteNav) and the site footer. Rendering
 * surface: wrap the returned string in a span with class `do-issue-label`.
 */
export function formatIssueLabel(): string {
  const n = String(CURRENT_ISSUE.issueNumber).padStart(2, '0');
  return `Issue ${n} — Week of ${CURRENT_ISSUE.weekOfFull}`;
}

export const AUTHOR = {
  name:     'Leonardo De La Rocha',
  initials: 'LR',
  role:     'VP Product Design',
  domain:   'ldlr.design',
} as const;
