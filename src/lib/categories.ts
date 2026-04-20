import type { CategoryMeta } from './types';

export const CATEGORIES: Record<string, CategoryMeta> = {
  reframe:  { id: 'reframe',  name: 'The Reframe',        monogram: 'TR', tint: '#B8432B', sub: 'Assumptions, examined.' },
  crit:     { id: 'crit',     name: 'Crit Notes',         monogram: 'CN', tint: '#4A5D3A', sub: 'Feedback, with the reasoning shown.' },
  decision: { id: 'decision', name: 'The Decision',       monogram: 'TD', tint: '#2F4858', sub: 'What we chose, and why.' },
  makers:   { id: 'makers',   name: "Maker's Log",        monogram: 'ML', tint: '#8A5A2B', sub: 'Process, visible.' },
  toolbox:  { id: 'toolbox',  name: 'Toolbox',            monogram: 'TB', tint: '#6B4E7B', sub: 'Frameworks you can steal.' },
  reading:  { id: 'reading',  name: 'Reading List',       monogram: 'RL', tint: '#7A5A3A', sub: 'Weekly links, personally vetted.' },
  state:    { id: 'state',    name: 'State of the Craft', monogram: 'SC', tint: '#15120E', sub: 'Monthly synthesis.' },
} as const;

export const AUDIENCES = ['Everyone', 'Leaders', 'ICs'] as const;
export type Audience = (typeof AUDIENCES)[number];
