/**
 * field-notes.ts — shared metadata + helpers for the Field Notes routes.
 *
 * Lives in @lib because Astro's getStaticPaths runs in a different scope
 * than the rest of the frontmatter; constants used in route generation
 * have to be importable from a real module file.
 */

export interface TacticMeta {
  id:    string;
  label: string;
  /** Short description shown in the tag-filter view header. Placeholder
   *  copy until Leonardo writes final tag descriptions. */
  sub:   string;
}

export const TACTICS: readonly TacticMeta[] = [
  { id: 'research_and_validation',      label: 'Research & validation',
    sub: 'How teams find their way to a problem worth solving.' },
  { id: 'systems_and_primitives',       label: 'Systems & primitives',
    sub: 'The shared building blocks design teams maintain across surfaces.' },
  { id: 'prototyping_and_exploration',  label: 'Prototyping & exploration',
    sub: 'Sketches, prototypes, and the work that happens before the work is real.' },
  { id: 'critique_and_decision_making', label: 'Critique & decision-making',
    sub: 'How teams give feedback and choose between options under pressure.' },
  { id: 'craft_and_detail',             label: 'Craft & detail',
    sub: 'The small moves and tuning passes that separate good from generic.' },
  { id: 'cross_functional_and_process', label: 'Cross-functional & process',
    sub: 'Working with engineering, product, and the rest of the org.' },
  { id: 'storytelling_and_narrative',   label: 'Storytelling & narrative',
    sub: 'The way design teams shape and share the story of the work.' },
  { id: 'hiring_and_team',              label: 'Hiring & team',
    sub: 'Who gets hired, how teams get built, and the operating shapes that follow.' },
] as const;

export const TACTIC_LABEL: Record<string, string> = Object.fromEntries(
  TACTICS.map(t => [t.id, t.label]),
);

/** Map a tactic id to the CSS variable suffix used for cover/quiet color tokens. */
export const TACTIC_VAR_KEY: Record<string, string> = {
  research_and_validation:      'research',
  systems_and_primitives:       'systems',
  prototyping_and_exploration:  'prototyping',
  critique_and_decision_making: 'critique',
  craft_and_detail:             'craft',
  cross_functional_and_process: 'cross',
  storytelling_and_narrative:   'storytelling',
  hiring_and_team:              'hiring',
};

/** First two sentences of an annotation body, with ellipsis if truncated. */
export function teaser(body: string): string {
  const sentences = body.split(/(?<=[.?!])\s+/);
  const first2 = sentences.slice(0, 2).join(' ').trim();
  return sentences.length > 2 ? first2 + '…' : first2;
}

export function formatDateAdded(d?: Date): string {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Header metadata for Field Notes routes — replaces the Articles-side
 * issue/week label with the Field Notes catalog state. Format:
 *   "3 ENTRIES — LATEST APR 10, 2026"
 *
 * Reads the published collection at build time and computes the count and
 * the latest piece_published_at across entries. Empty-state safe — if
 * there are no entries yet, returns "0 ENTRIES" with no date.
 */
export async function formatFieldNotesLabel(): Promise<string> {
  const { getCollection } = await import('astro:content');
  const entries = await getCollection('field-notes');
  if (!entries.length) return '0 entries';

  const latestMs = entries.reduce<number>((acc, e) => {
    const t = e.data.piece_published_at?.getTime() ?? 0;
    return t > acc ? t : acc;
  }, 0);
  if (!latestMs) return `${entries.length} entries`;

  const d      = new Date(latestMs);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Use UTC components so the rendered date matches the YAML date in the
  // MDX file (YAML "2026-04-10" parses as UTC midnight; using local
  // getters drifts to Apr 9 in Pacific timezones during static build).
  // Lowercased here; the .do-issue-label CSS uppercases for display.
  return `${entries.length} entries — Latest ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
