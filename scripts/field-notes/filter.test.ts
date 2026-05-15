#!/usr/bin/env tsx
/**
 * filter.test.ts — smoke assertions for the Field Notes editorial filter.
 *
 *   npm run field-notes:test
 *
 * Anchors the heuristic in lib.ts against the concrete noise patterns recent
 * runs surfaced (Pentagram, Linear, Figma, Stripe, Notion, Raycast, Mercury,
 * Pitch). Fails loudly with exit code 1 if any assertion regresses.
 */

import { isEditorialUrl, isEditorialTitle } from './lib.ts';

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean): void {
  if (ok) { pass++; return; }
  fail++;
  console.error(`  FAIL: ${label}`);
}

function assertRejectUrl(url: string): void {
  check(`reject URL: ${url}`, !isEditorialUrl(url));
}
function assertKeepUrl(url: string): void {
  check(`keep URL:   ${url}`, isEditorialUrl(url));
}
function assertRejectTitle(title: string): void {
  check(`reject title: "${title}"`, !isEditorialTitle(title));
}
function assertKeepTitle(title: string): void {
  check(`keep title:   "${title}"`, isEditorialTitle(title));
}

// ── URL filter ──────────────────────────────────────────────────────────────

// Marketing / product / auxiliary prefixes the user listed.
assertRejectUrl('https://example.com/pricing');
assertRejectUrl('https://www.notion.so/product/calendar');
assertRejectUrl('https://www.notion.so/product/mail');
// Stripe's /payments/* and /managed-payments aren't in the URL prefix list
// (they pass the URL check) — they get rejected by the title filter on the
// product-name titles ("Payment links", "Managed Payments"). See title block.
assertRejectUrl('https://pitch.com/use-cases/presentation-maker');
assertRejectUrl('https://pitch.com/teams/agencies');
assertRejectUrl('https://vercel.com/products/observability');
assertRejectUrl('https://vercel.com/solutions/turborepo');
// Note: vercel.com/security/bot-management is intentionally kept by the URL
// filter — /security isn't a blanket prefix (github.blog uses it for real
// articles). The product page is caught by the title filter on "Bot
// Management" (see NAV_LABELS), which is the more reliable signal.
assertRejectUrl('https://vercel.com/frameworks/nextjs');
assertRejectUrl('https://www.raycast.com/core-features/ai');
assertRejectUrl('https://www.raycast.com/users/sign_in');
assertRejectUrl('https://pitch.com/privacy-policy');
assertRejectUrl('https://example.com/login');
assertRejectUrl('https://example.com/terms');

// Taxonomy / index anywhere.
assertRejectUrl('https://www.raycast.com/blog/category/news');
assertRejectUrl('https://mercury.com/blog/categories/library');
assertRejectUrl('https://mercury.com/blog/topics/accounting');
assertRejectUrl('https://example.com/blog/tag/design');

// Bare blog/now/work indexes.
assertRejectUrl('https://www.figma.com/blog/maker-stories');
assertRejectUrl('https://www.figma.com/blog/working-well');
assertRejectUrl('https://www.figma.com/blog/news');
assertRejectUrl('https://www.figma.com/blog/ai');
assertRejectUrl('https://www.figma.com/blog/design-systems');
assertRejectUrl('https://linear.app/now/community');
assertRejectUrl('https://linear.app/now/craft');
assertRejectUrl('https://linear.app/now/ai');
assertRejectUrl('https://www.pentagram.com/work/grale');
assertRejectUrl('https://www.pentagram.com/work/gush');
assertRejectUrl('https://www.pentagram.com/work');

// Individual tracks (Spotify Design).
assertRejectUrl('https://spotify.design/track/4cgjA7B4fJBHyB9Ya2bu0t');
assertRejectUrl('https://spotify.design/section/0JQ5DB5E8N831KzFzsBBQ2');

// Real article URLs that must survive.
assertKeepUrl('https://microsoft.design/articles/proof-and-possibility');
assertKeepUrl('https://microsoft.design/articles/a-simplified-system');
assertKeepUrl('https://blog.replit.com/app-monitoring');
assertKeepUrl('https://blog.replit.com/defense-in-depth-how-replit-secures-every-layer-of-the-vibe-coding-stack');
assertKeepUrl('https://github.blog/engineering/architecture-optimization/from-latency-to-instant-modernizing-github-issues-navigation-performance');
assertKeepUrl('https://www.intercom.com/blog/operator-a-look-under-the-hood');
assertKeepUrl('https://linear.app/now/code-intelligence-for-linear-agent');
assertKeepUrl('https://linear.app/now/output-isn-t-design');
assertKeepUrl('https://designsystemscollective.substack.com/p/the-informal-contract-is-over');
// Regression guards: real articles whose URLs look superficially category-like.
assertKeepUrl('https://github.blog/security/raising-the-bar-quality-shared-responsibility-and-the-future-of-githubs-bug-bounty-program');
assertKeepUrl('https://www.intercom.com/blog/introducing-operator');
assertKeepUrl('https://webflowmarketingmain.com/blog/claude-chat-webflow');
assertKeepUrl('https://webflowmarketingmain.com/blog/stripe-checkout-webflow');

// ── Title filter ────────────────────────────────────────────────────────────

// Bare navigation labels.
assertRejectTitle('Pricing');
assertRejectTitle('News');
assertRejectTitle('Community');
assertRejectTitle('Craft');
assertRejectTitle('Accessibility');
assertRejectTitle('Get started');
assertRejectTitle('Overview');
assertRejectTitle('Log in');
assertRejectTitle('Voice & Tone');
assertRejectTitle('Find a co-host');
assertRejectTitle('Trending songs');
assertRejectTitle('Color');
assertRejectTitle('Typography');
assertRejectTitle('Tokens');
assertRejectTitle('AI');
assertRejectTitle('Insights');
assertRejectTitle('Maker Stories');
assertRejectTitle('Working Well');
assertRejectTitle('Inside Figma');
assertRejectTitle('Design system');
assertRejectTitle('Design philosophy');
assertRejectTitle('Payment links');
assertRejectTitle('AI Gateway');
assertRejectTitle('Plastic Air');
assertRejectTitle('Bot Management');
assertRejectTitle('Next.js');
assertRejectTitle('Composable Commerce');
// "X & Y" category titles from Pentagram/Figma.
assertRejectTitle('Arts & Culture');
assertRejectTitle('Civic & Public');
assertRejectTitle('Climate & Sustainability');
assertRejectTitle('Fashion & Beauty');
assertRejectTitle('Career & education');
assertRejectTitle('Plugins & tooling');
assertRejectTitle('Profiles & interviews');
assertRejectTitle('Quality & performance');
assertRejectTitle('Tips & inspiration');

// Real article titles that must survive.
assertKeepTitle('Proof and possibility');
assertKeepTitle('A simplified system');
assertKeepTitle('The missing seat at the frontier team table');
assertKeepTitle('Output isn’t design');
assertKeepTitle('Code Intelligence for Linear Agent');
assertKeepTitle('Mothers who build');
assertKeepTitle('Why Design Systems Fail');
assertKeepTitle('Self portraits: You Zhang');
assertKeepTitle('Defense in Depth: How Replit Secures Every Layer of the Vibe Coding Stack');
assertKeepTitle('The cleanup cost of ungoverned AI-generated code');

console.log(`\nfilter.test: ${pass} pass, ${fail} fail.`);
if (fail > 0) process.exit(1);
