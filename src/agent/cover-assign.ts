/**
 * Cover-color assignment for Field Notes staging.
 *
 * Catalog index renders a 3-column grid sorted by piece_published_at desc.
 * The agent's cover-color choice for each new entry must avoid sharing the
 * color with any of the entry's four grid neighbors (above, below, left,
 * right). Among non-conflicting choices, prefer the least-used color across
 * the current run plus the last 6 published entries, so frequency stays
 * roughly even.
 */

export type CoverColor =
  | 'deep-teal'
  | 'sage'
  | 'terracotta'
  | 'aubergine'
  | 'navy'
  | 'warm-charcoal';

export const COVER_PALETTE: readonly CoverColor[] = [
  'deep-teal',
  'sage',
  'terracotta',
  'aubergine',
  'navy',
  'warm-charcoal',
];

/** Hex resolution lives in CSS. This map is only used for diagnostic logging. */
export const COVER_HEX: Record<CoverColor, string> = {
  'deep-teal':     '#2F4858',
  'sage':          '#4A5D3A',
  'terracotta':    '#B8432B',
  'aubergine':     '#4A2545',
  'navy':          '#1E3A5F',
  'warm-charcoal': '#3A2F2A',
};

/** A reference to a published entry whose color is already fixed. */
export interface PublishedRef {
  slug:        string;
  coverColor:  CoverColor | null; // null = legacy entry pre-coverColor; doesn't constrain
  publishedAt: number;            // ms since epoch; 0 if unknown (sorts to bottom)
}

/** Subset of Candidate fields the assigner needs. */
export interface AssignCandidate {
  slug:        string;
  sourceId:    string;
  publishedAt: number;            // ms since epoch; 0 if unknown
}

const COLUMNS = 3;

function neighborsOf(idx: number, total: number): number[] {
  const out: number[] = [];
  const col = idx % COLUMNS;
  if (idx - COLUMNS >= 0)               out.push(idx - COLUMNS); // above
  if (idx + COLUMNS < total)            out.push(idx + COLUMNS); // below
  if (col > 0)                          out.push(idx - 1);       // left
  if (col < COLUMNS - 1 && idx + 1 < total) out.push(idx + 1);   // right
  return out;
}

/**
 * Assign cover colors for a batch of newly staged candidates with adjacency
 * awareness against the last 6 published entries.
 *
 * Returns an array of colors in the same order as the input `staged` array.
 */
export function assignCoverColors(
  staged:        AssignCandidate[],
  lastPublished: PublishedRef[],
  log:           (msg: string) => void = () => {},
): CoverColor[] {
  if (!staged.length) return [];

  // Combined virtual grid, sorted newest-first by publishedAt. Items with no
  // date sink to the bottom (treated as oldest).
  type Slot = { source: 'staged' | 'published'; stagedIdx?: number; color: CoverColor | null; publishedAt: number };
  const slots: Slot[] = [
    ...staged.map((c, i) => ({ source: 'staged' as const, stagedIdx: i, color: null as CoverColor | null, publishedAt: c.publishedAt })),
    ...lastPublished.map(p => ({ source: 'published' as const, color: p.coverColor, publishedAt: p.publishedAt })),
  ];
  // Stable sort: newer first, then preserve input order on ties (so staged
  // candidates with identical timestamps keep their original sequence).
  slots.sort((a, b) => b.publishedAt - a.publishedAt);

  const greedyOk = backtrack(slots, 0);
  if (!greedyOk) {
    const sourceIds = staged.map(s => s.sourceId).join(', ');
    log(`coverAssign: backtracking exhausted, falling back to round-robin. Source IDs: ${sourceIds}`);
    // Round-robin over only the staged slots, in their original input order.
    for (let i = 0; i < staged.length; i++) {
      const slot = slots.find(s => s.source === 'staged' && s.stagedIdx === i);
      if (slot) slot.color = COVER_PALETTE[i % COVER_PALETTE.length];
    }
  }

  // Materialize results in the original `staged` input order.
  const result: CoverColor[] = new Array(staged.length);
  for (const slot of slots) {
    if (slot.source === 'staged' && slot.stagedIdx !== undefined && slot.color) {
      result[slot.stagedIdx] = slot.color;
    }
  }
  return result;
}

/** Backtracking driver: walk slots in order, only assigning unfixed (staged) slots. */
function backtrack(slots: Array<{ source: 'staged' | 'published'; color: CoverColor | null }>, idx: number): boolean {
  if (idx === slots.length) return true;
  const slot = slots[idx];
  if (slot.source === 'published') {
    // Color is fixed (or null, which doesn't constrain). Move on.
    return backtrack(slots, idx + 1);
  }

  const blocked = new Set<CoverColor>();
  for (const ni of neighborsOf(idx, slots.length)) {
    const c = slots[ni].color;
    if (c) blocked.add(c);
  }

  // Frequency tally over slots that already have a color.
  const freq: Record<CoverColor, number> = {
    'deep-teal': 0, 'sage': 0, 'terracotta': 0,
    'aubergine': 0, 'navy': 0, 'warm-charcoal': 0,
  };
  for (const s of slots) if (s.color) freq[s.color]++;

  const ordered = COVER_PALETTE
    .filter(c => !blocked.has(c))
    .slice()
    .sort((a, b) => freq[a] - freq[b]);

  for (const color of ordered) {
    slot.color = color;
    if (backtrack(slots, idx + 1)) return true;
    slot.color = null;
  }
  return false;
}
