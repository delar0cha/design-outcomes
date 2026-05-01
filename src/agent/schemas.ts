/**
 * Zod schemas for agent-internal data shapes. The Field Notes catalog has
 * fixed-size card slots, so the LLM's annotation output has hard character
 * budgets the layout can't grow past. These schemas are the source of truth
 * for those budgets — keep them in sync with the limits in
 * src/agent/prompts/annotation.md.
 */

import { z } from 'zod';

export const ANNOTATION_LIMITS = {
  pullQuote:    120,
  bullet:        90,
  cardAbstract: 240,
  cardTitle:     45,
  bulletCount:    4,
} as const;

export const AnnotationSchema = z.object({
  card_title:        z.string().min(1).max(ANNOTATION_LIMITS.cardTitle),
  card_abstract:     z.string().min(1).max(ANNOTATION_LIMITS.cardAbstract),
  pull_quote:        z.string().min(1).max(ANNOTATION_LIMITS.pullQuote),
  bullets:           z.array(z.string().min(1).max(ANNOTATION_LIMITS.bullet)).length(ANNOTATION_LIMITS.bulletCount),
  draft_notes:       z.string().min(1),
  uncertainty_flags: z.string().nullable().optional(),
});

export type AnnotationResult = z.infer<typeof AnnotationSchema>;

/**
 * Inspect a raw annotation object for length-budget violations and produce
 * concrete, model-friendly violation messages. Used both to decide whether
 * to retry and to construct the retry prompt.
 *
 * Returns an empty array when the annotation satisfies all length budgets.
 * Structural problems (missing fields, wrong types) are NOT reported here —
 * those are caught by AnnotationSchema.parse downstream.
 */
export function findAnnotationLengthViolations(raw: unknown): string[] {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== 'object') return [];
  const out: string[] = [];
  if (typeof r.pull_quote === 'string' && r.pull_quote.length > ANNOTATION_LIMITS.pullQuote) {
    out.push(`Your pull_quote was ${r.pull_quote.length} chars; max is ${ANNOTATION_LIMITS.pullQuote}.`);
  }
  if (typeof r.card_abstract === 'string' && r.card_abstract.length > ANNOTATION_LIMITS.cardAbstract) {
    out.push(`Your card_abstract was ${r.card_abstract.length} chars; max is ${ANNOTATION_LIMITS.cardAbstract}.`);
  }
  if (typeof r.card_title === 'string' && r.card_title.length > ANNOTATION_LIMITS.cardTitle) {
    out.push(`Your card_title was ${r.card_title.length} chars; max is ${ANNOTATION_LIMITS.cardTitle}.`);
  }
  if (Array.isArray(r.bullets)) {
    if (r.bullets.length !== ANNOTATION_LIMITS.bulletCount) {
      out.push(`Your bullets array had ${r.bullets.length} entries; must be exactly ${ANNOTATION_LIMITS.bulletCount}.`);
    }
    r.bullets.forEach((b, i) => {
      if (typeof b === 'string' && b.length > ANNOTATION_LIMITS.bullet) {
        out.push(`Your bullet ${i + 1} was ${b.length} chars; max is ${ANNOTATION_LIMITS.bullet}.`);
      }
    });
  }
  return out;
}

/** Truncate a string at the budget with the nearest preceding word break. */
function truncateAtWordBoundary(s: string, max: number): string {
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  // Find the last whitespace before the cap so we never cut mid-word.
  const lastSpace = slice.search(/\s\S*$/);
  if (lastSpace > Math.floor(max * 0.5)) {
    return slice.slice(0, lastSpace).trimEnd();
  }
  // No reasonable word boundary found in the upper half: hard cut.
  return slice.trimEnd();
}

/**
 * Last-resort fallback when retry also produces oversized output. Trims
 * each over-budget field to its budget at the nearest word break, takes
 * the first 4 bullets if more were returned, and leaves under-budget fields
 * untouched. Bullet underflow (fewer than 4) cannot be fixed by truncation
 * — those entries are returned as-is and the caller should log.
 */
export function truncateAnnotationToBudget(raw: unknown): unknown {
  const r = (raw && typeof raw === 'object') ? { ...(raw as Record<string, unknown>) } : {};
  if (typeof r.pull_quote === 'string') {
    r.pull_quote = truncateAtWordBoundary(r.pull_quote, ANNOTATION_LIMITS.pullQuote);
  }
  if (typeof r.card_abstract === 'string') {
    r.card_abstract = truncateAtWordBoundary(r.card_abstract, ANNOTATION_LIMITS.cardAbstract);
  }
  if (typeof r.card_title === 'string') {
    r.card_title = truncateAtWordBoundary(r.card_title, ANNOTATION_LIMITS.cardTitle);
  }
  if (Array.isArray(r.bullets)) {
    let bullets = r.bullets.slice(0, ANNOTATION_LIMITS.bulletCount);
    bullets = bullets.map(b =>
      typeof b === 'string' ? truncateAtWordBoundary(b, ANNOTATION_LIMITS.bullet) : b,
    );
    r.bullets = bullets;
  }
  return r;
}
