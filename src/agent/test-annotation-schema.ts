#!/usr/bin/env tsx
/**
 * Smoke test for AnnotationSchema, findAnnotationLengthViolations,
 * and truncateAnnotationToBudget. Run: tsx src/agent/test-annotation-schema.ts
 */

import {
  AnnotationSchema,
  ANNOTATION_LIMITS,
  findAnnotationLengthViolations,
  truncateAnnotationToBudget,
} from './schemas.js';

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail?: string): void {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else      { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const ok = {
  card_title:        'Killing darlings, statistically',
  card_abstract:     'Nubank ran a real A/B test on whether to scale or shut down an internal HR product. The data was unambiguous. The team\'s feelings about the data were considerably less so.',
  pull_quote:        '==We had built it. We were proud of it.== The data still told us to kill it.',
  bullets: [
    'A/B testing applied to decommissioning, not just feature launches',
    'Internal tools deserve the same rigor as customer-facing products',
    'Specific framework: usage below threshold X, kill it; above X, scale it',
    'Hardest part isn\'t the data; it\'s letting the team accept the verdict',
  ],
  draft_notes:       'Lead with the decommissioning insight; this is what makes the piece transferable.',
  uncertainty_flags: null,
};

console.log('── Valid annotation passes parse ──');
const v1 = findAnnotationLengthViolations(ok);
check('no violations on conforming object', v1.length === 0, v1.join('; '));
const p1 = AnnotationSchema.safeParse(ok);
check('zod accepts conforming object', p1.success, !p1.success ? p1.error.message : '');

console.log('\n── Length violations are detected ──');
const longPullQuote = { ...ok, pull_quote: 'x'.repeat(165) };
const vPQ = findAnnotationLengthViolations(longPullQuote);
check('detects oversize pull_quote', vPQ.some(v => v.includes('165') && v.includes('120')), vPQ.join('; '));

const fiveBullets = { ...ok, bullets: [...ok.bullets, 'A fifth bullet that should not exist'] };
const v5b = findAnnotationLengthViolations(fiveBullets);
check('detects 5 bullets', v5b.some(v => v.includes('5 entries') && v.includes('exactly 4')), v5b.join('; '));

const longBullet = { ...ok, bullets: [...ok.bullets.slice(0, 3), 'x'.repeat(149)] };
const vLB = findAnnotationLengthViolations(longBullet);
check('detects oversize bullet', vLB.some(v => v.includes('bullet 4') && v.includes('149')), vLB.join('; '));

const longAbstract = { ...ok, card_abstract: 'x'.repeat(310) };
const vCA = findAnnotationLengthViolations(longAbstract);
check('detects oversize card_abstract', vCA.some(v => v.includes('310') && v.includes('240')), vCA.join('; '));

console.log('\n── Multi-violation message looks right for retry prompt ──');
const messy = { ...ok, pull_quote: 'x'.repeat(165), bullets: [...ok.bullets, 'extra'].map((b, i) => i === 2 ? 'x'.repeat(149) : b) };
const vMessy = findAnnotationLengthViolations(messy);
console.log('  retry message preview:');
for (const m of vMessy) console.log(`    ${m}`);
check('flags multiple violations', vMessy.length >= 3, `got ${vMessy.length}`);

console.log('\n── Truncation brings everything under budget ──');
const oversized = {
  ...ok,
  pull_quote:    'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, ut enim ad minim veniam quis nostrud exercitation ullamco.',
  card_abstract: 'A'.repeat(50) + ' ' + 'B'.repeat(50) + ' ' + 'C'.repeat(50) + ' ' + 'D'.repeat(50) + ' ' + 'E'.repeat(50) + ' ' + 'F'.repeat(50),
  bullets: [
    'A'.repeat(85) + ' tail of more words that pushes it over the budget',
    'B'.repeat(85) + ' tail of more words that pushes it over the budget',
    'C'.repeat(85) + ' tail of more words that pushes it over the budget',
    'D'.repeat(85) + ' tail of more words that pushes it over the budget',
    'E'.repeat(85) + ' fifth bullet should be dropped',
  ],
};
const trunc = truncateAnnotationToBudget(oversized) as typeof oversized;
const trViol = findAnnotationLengthViolations(trunc);
check('truncated has no violations', trViol.length === 0, trViol.join('; '));
check('pull_quote within budget', trunc.pull_quote.length <= ANNOTATION_LIMITS.pullQuote, `got ${trunc.pull_quote.length}`);
check('card_abstract within budget', trunc.card_abstract.length <= ANNOTATION_LIMITS.cardAbstract, `got ${trunc.card_abstract.length}`);
check('exactly 4 bullets after truncate', trunc.bullets.length === 4, `got ${trunc.bullets.length}`);
check('every bullet within budget', trunc.bullets.every(b => b.length <= ANNOTATION_LIMITS.bullet), `lengths ${trunc.bullets.map(b => b.length).join(',')}`);
const pTrunc = AnnotationSchema.safeParse(trunc);
check('zod accepts truncated', pTrunc.success, !pTrunc.success ? pTrunc.error.message : '');

console.log(`\n${pass} pass / ${fail} fail`);
process.exitCode = fail === 0 ? 0 : 1;
