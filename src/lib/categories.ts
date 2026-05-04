import type { CategoryMeta } from './types';

// Unified category tint — matches --color-dark-warm (logo, favicon, cursor pill).
// Per-category hues live on `originalTint` so they can be restored later.
const UNIFIED_TINT = '#3D3633';

export const CATEGORIES: Record<string, CategoryMeta> = {
  reframe:  { id: 'reframe',  name: 'The Reframe',        monogram: 'TR', tint: UNIFIED_TINT, originalTint: '#B8432B', sub: 'Assumptions, examined.',           description: "The thing you thought was the problem usually isn't. These are the moments when the picture changed shape." },
  crit:     { id: 'crit',     name: 'Crit Notes',         monogram: 'CN', tint: UNIFIED_TINT, originalTint: '#4A5D3A', sub: 'Feedback, with the reasoning shown.', description: 'Most feedback gets handed over as a verdict. Here, we show our work.' },
  decision: { id: 'decision', name: 'The Decision',       monogram: 'TD', tint: UNIFIED_TINT, originalTint: '#2F4858', sub: 'What we chose, and why.',          description: 'Every decision is a small bet against the alternatives. These are the bets, written down before they looked obvious.' },
  makers:   { id: 'makers',   name: "Maker's Log",        monogram: 'ML', tint: UNIFIED_TINT, originalTint: '#8A5A2B', sub: 'Process, visible.',                description: "Finished work tends to hide the steps that got it there. These don't." },
  toolbox:  { id: 'toolbox',  name: 'Toolbox',            monogram: 'TB', tint: UNIFIED_TINT, originalTint: '#6B4E7B', sub: 'Frameworks you can steal.',        description: 'A framework is most useful once somebody has used it and can tell you where it breaks. These are those frameworks.' },
  reading:  { id: 'reading',  name: 'Reading List',       monogram: 'RL', tint: UNIFIED_TINT, originalTint: '#7A5A3A', sub: 'Weekly links, personally vetted.', description: "A small pile of things worth reading, pulled from a much larger pile that wasn't." },
  state:    { id: 'state',    name: 'State of the Craft', monogram: 'SC', tint: UNIFIED_TINT, originalTint: '#15120E', sub: 'Monthly synthesis.',               description: "Once a month, a step back. What's actually changing in the work, and what only sounds like it is." },
} as const;

export const AUDIENCES = ['Everyone', 'Leaders', 'ICs'] as const;
export type Audience = (typeof AUDIENCES)[number];
