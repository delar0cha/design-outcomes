import type { ProjectMeta, CaseStudyMeta, IllustrationSpec } from './types';

// ─── Helper ────────────────────────────────────────────────────────────────

function ill(kind: IllustrationSpec['kind'], palette: string[], seed = 1): IllustrationSpec {
  return { kind, palette, seed };
}

// ─── Project Thumbnail Grid ────────────────────────────────────────────────

export const PROJECT_CATS: Record<string, { id: string; name: string; tint: string }> = {
  leadership: { id: 'leadership', name: 'Executive Leadership',    tint: '#15120E' },
  product:    { id: 'product',    name: 'Product Design',          tint: '#2F4858' },
  systems:    { id: 'systems',    name: 'Design Systems',          tint: '#4A5D3A' },
  brand:      { id: 'brand',      name: 'Branding & Identity',     tint: '#B8432B' },
  creative:   { id: 'creative',   name: 'Creative Direction',      tint: '#8A5A2B' },
  making:     { id: 'making',     name: 'Making & Illustration',   tint: '#6B4E7B' },
};

export const PROJECTS: ProjectMeta[] = [
  {
    slug: 'sp-design-vision',
    cat: 'leadership', company: 'SimplePractice', year: '2025–2026',
    title: '2026 Design Vision',
    excerpt: 'Setting the strategic direction for product design at SimplePractice — defining what craft, quality, and outcomes mean for a platform serving 185k+ practitioners.',
    status: 'live',
    illustration: ill('eye', ['#E8E0D0', '#2F4858', '#15120E'], 1),
  },
  {
    slug: 'sp-product-engineering',
    cat: 'product', company: 'SimplePractice', year: '2024–2026',
    title: 'Product & Engineering Design',
    excerpt: 'Leading design across clinical care, revenue cycle, mobile, and an emerging AI/UX practice for the leading EHR platform for behavioral health.',
    status: 'coming-soon',
    illustration: ill('grid', ['#E8E0D0', '#4A5D3A', '#15120E'], 2),
  },
  {
    slug: 'spotify-ads-wow',
    cat: 'product', company: 'Spotify', year: '2022–2024',
    title: 'Ads Ways of Working',
    excerpt: 'Designing the operating model and creative rituals for a 64-person org spanning research, product design, content design, and design program management.',
    status: 'coming-soon',
    illustration: ill('bars', ['#E8E0D0', '#B8432B', '#15120E'], 7),
  },
  {
    slug: 'spotify-accessibility',
    cat: 'systems', company: 'Spotify', year: '2023',
    title: 'Ads Accessibility Northstar',
    excerpt: 'A comprehensive accessibility vision for Spotify Advertising — turning compliance requirements into a design quality standard.',
    status: 'coming-soon',
    illustration: ill('stack', ['#E8E0D0', '#2F4858', '#15120E'], 4),
  },
  {
    slug: 'sp-career-framework',
    cat: 'systems', company: 'SimplePractice', year: '2025',
    title: 'Design Career Framework',
    excerpt: 'Building the leveling guide, growth tracks, and evaluation rubrics that define what great design looks like at every stage.',
    status: 'coming-soon',
    illustration: ill('rays', ['#E8E0D0', '#4A5D3A', '#15120E'], 9),
  },
  {
    slug: 'intuit-design-system',
    cat: 'systems', company: 'Intuit', year: '2019–2021',
    title: 'Design System & Accessibility',
    excerpt: 'Head of Design Systems across TurboTax, QuickBooks, ProConnect, and Mint — unifying the Intuit design language and accessibility practice.',
    status: 'coming-soon',
    illustration: ill('grid', ['#E8E0D0', '#8A5A2B', '#15120E'], 5),
  },
  {
    slug: 'academic-coffee',
    cat: 'brand', company: 'Academic Coffee', year: '2022',
    title: 'Brand Identity',
    excerpt: 'Full brand system for an Oakland specialty coffee shop: wordmark, identity system, packaging, and environmental design.',
    status: 'coming-soon',
    illustration: ill('bars', ['#E8E0D0', '#8A5A2B', '#15120E'], 3),
  },
  {
    slug: 'sister-roots',
    cat: 'brand', company: 'Sister Roots', year: '2023',
    title: 'Identity System',
    excerpt: 'Visual identity for a community-centered wellness brand — mark, palette, typography, and brand voice working as a unified system.',
    status: 'coming-soon',
    illustration: ill('stack', ['#E8E0D0', '#4A5D3A', '#15120E'], 6),
  },
  {
    slug: 'neotax-rebrand',
    cat: 'brand', company: 'Neo.Tax', year: '2023',
    title: 'Website Redesign',
    excerpt: 'Repositioning a tax automation platform for CFOs and finance teams — new site architecture, messaging, and visual identity.',
    status: 'coming-soon',
    illustration: ill('rays', ['#E8E0D0', '#6B4E7B', '#15120E'], 10),
  },
  {
    slug: 'logofolio',
    cat: 'brand', company: 'Freelance', year: '2018–2024',
    title: 'Logofolio',
    excerpt: 'Six years of mark-making: wordmarks, monograms, and symbol systems across coffee, hospitality, tech, and community organizations.',
    status: 'coming-soon',
    illustration: ill('grid', ['#E8E0D0', '#B8432B', '#15120E'], 12),
  },
  {
    slug: 'illustrations-commd',
    cat: 'making', company: 'Personal', year: '2020–2026',
    title: 'Illustrations & Communication Design',
    excerpt: 'An ongoing practice: type explorations, editorial illustrations, and visual communication work produced outside of client and company projects.',
    status: 'coming-soon',
    illustration: ill('bars', ['#E8E0D0', '#6B4E7B', '#15120E'], 11),
  },
  {
    slug: 'thirty-covers',
    cat: 'making', company: 'Personal', year: '2021',
    title: '30 Covers, 30 Days',
    excerpt: 'A daily design sprint: one reimagined book or album cover per day for 30 consecutive days. Constraint as creative engine.',
    status: 'coming-soon',
    illustration: ill('stack', ['#E8E0D0', '#B8432B', '#15120E'], 14),
  },
];

// ─── Case Studies ──────────────────────────────────────────────────────────

export const CASE_STUDIES: CaseStudyMeta[] = [
  {
    slug: 'sp-design-vision',
    cat: 'leadership', company: 'SimplePractice', year: '2025–2026',
    title: '2026 Design Vision',
    subtitle: 'Building a Design Vision That Can Steer Work',
    excerpt: 'Setting the strategic direction for product design at SimplePractice — defining what craft, quality, and outcomes mean for a platform serving 185k+ practitioners.',
    status: 'live',
    illustration: ill('eye', ['#E8E0D0', '#2F4858', '#15120E'], 1),
    summary: 'A design vision document is easy to write and hard to make useful. Most of them live somewhere in Notion, get shared once at an all-hands, and slowly lose relevance as the product moves forward without them. When I started on this one, the first question I kept returning to was not what should the vision say, but what would it take for this to actually change how people make decisions six months from now. That question shaped everything.',
    body: [
      { type: 'img', src: '/images/sp-design-vision/vision-on-a-page.png', caption: 'The TL;DR slide — north star statement, AI modes, quality bar, and key initiatives on one page.' },
      { type: 'h', text: 'The starting conditions' },
      { type: 'p', text: 'SimplePractice sits at a specific kind of inflection point. The company serves independent mental health clinicians, a group whose administrative burden is significant and whose tolerance for software complexity is low. We were scaling aggressively across multiple product pillars, adding AI capabilities faster than our shared standards could keep up, and operating with design teams that had grown close enough to their individual pillars to start developing their own mental models for how the product should behave.' },
      { type: 'p', text: 'None of that was anyone\u2019s fault. It is what happens when capable people work in parallel on a growing product without a shared operating contract. The result was a product that felt, in places, like a collection of related tools rather than one coherent platform. For a clinician logging four hours on a Tuesday to close the billing and documentation loops from their sessions, that difference is not abstract.' },
      { type: 'p', text: 'AI raised the stakes further. When a product suggests things, takes actions, and surfaces decisions on behalf of a user, inconsistency stops being a polish problem and becomes a trust problem. A clinician who does not know whether the platform is acting or asking or confirming has to slow down to orient herself every time. That is exactly the cognitive overhead we exist to remove.' },
      { type: 'img', src: '/images/sp-design-vision/three-modes.png', caption: 'The core behavior model: one platform, three modes of support, applied directly to clinician jobs.' },
      { type: 'h', text: 'How we built it' },
      { type: 'p', text: 'The raw material came from two places. The first was a cross-functional offsite in Denver the year prior, where the extended design leadership team and product partners surfaced a range of signals about where the product experience was breaking down and where design needed to take a stronger position. The second was a series of ongoing conversations with our CPO about where he wanted design leadership focused in 2026.' },
      { type: 'p', text: 'I pulled those inputs into a first draft over the holidays, which is the kind of work that benefits from uninterrupted thinking time. The goal of that draft was not completeness. It was legibility: could I write down the most important things clearly enough that other smart people could push back on them with precision.' },
      { type: 'p', text: 'The DLT (Design Leadership Team) workshopped the draft with me in January. That session did the work that first drafts cannot do alone. We tightened the north star statement until it was plain enough to repeat at a board meeting and specific enough to critique against in a design review. We pressure-tested the three operating principles\u2014Predictable UX Behavior at the interaction level, A Single Mental Model at the product level, and Reliability at Every Practice Size at the system level\u2014until each one had a concrete question design teams could ask of their own work. We named the AIUX behavior modes, Conversational, Agentic, and Ambient, as a way to give PM, Design, and Engineering a shared vocabulary for how AI shows up across the platform consistently.' },
      { type: 'p', text: 'From there, the vision went through four alignment stages: the broader design leadership team, the extended cross-functional leadership group, a clinician review, and Product LT. Each pass sharpened the artifact and, more importantly, expanded the number of people who felt some ownership over it. A vision that only design understands is a vision design cannot use.' },
      { type: 'img', src: '/images/sp-design-vision/principles.png', caption: 'Three operating principles that gave design teams a concrete question to ask of any product decision.' },
      { type: 'h', text: 'What it became' },
      { type: 'quote', text: 'Day in and day out, SimplePractice makes a clinician\u2019s workflow feel unbelievably simple.' },
      { type: 'p', text: 'The north star statement landed there. The language is intentionally plain. It is a promise, not a positioning statement, and the difference matters. A promise can be evaluated. You can stand in front of a product decision and ask whether the thing you are about to ship makes the clinician\u2019s workflow feel simpler or not. That is the test.' },
      { type: 'p', text: 'The artifact also maps the three AIUX behavior modes directly to the jobs clinicians are doing across their day, from the morning brief through the session cycle through billing reconciliation and wrap-up. Conversational AI helps them understand. Agentic AI helps them act. Ambient AI helps them assure that nothing critical slipped through. Those three modes stay consistent regardless of surface, role, or how much AI is involved in a given workflow. That consistency is the product contract.' },
      { type: 'p', text: 'Seven design-led initiatives came out of the vision work, each owned by a named driver with an explicit connection to the 2026 product OKRs: Design Vision 2026, the AIUX and Groups Controls Playbook, Home and Navigation principles, Design System Evolution, Quality and crit operations, the clinician value journey and friction map, and lightweight status automation. The initiatives exist to make the vision executable, not to document what we aspire to.' },
      { type: 'img', src: '/images/sp-design-vision/aiux-mapping.png', caption: 'How the three modes of support map across core UX behaviors and AI capabilities.' },
      { type: 'h', text: 'What I learned from building it' },
      { type: 'p', text: 'The vision became useful in proportion to how operational it became. The north star statement mattered, but what mattered more was that Ian could reach for this deck in a Vista conversation without needing me in the room to re-contextualize it. What mattered was that a designer in crit could ask whether a proposed interaction pattern reinforces the mental model clinicians already have, and have a shared reference point for the answer.' },
      { type: 'p', text: 'The goal across all of it was to keep clinicians present in care, while the system handles recall burden in the background, surfaces what matters, and helps them follow through without after-hours work. That sentence describes a product ambition, but it also describes what the vision artifact itself needed to do for the design org. Carry the context. Reduce the overhead. Make the next decision a little easier to reach.' },
      { type: 'p', text: 'A vision is a steering instrument. The work of building one is mostly the work of earning the alignment that makes it possible to steer.' },
      { type: 'img', src: '/images/sp-design-vision/design-led-initiatives.png', caption: 'Seven design-led initiatives, each with a named DACI owner and connection to 2026 product OKRs.' },
    ],
    slides: [
      { src: '/images/sp-design-vision/vision-on-a-page.png',       caption: 'Our Vision on a Page' },
      { src: '/images/sp-design-vision/three-modes.png',            caption: 'Three Modes of Support' },
      { src: '/images/sp-design-vision/principles.png',             caption: 'Principles in Practice' },
      { src: '/images/sp-design-vision/aiux-mapping.png',           caption: 'AIUX Behavior Mapping' },
      { src: '/images/sp-design-vision/north-star-journeys.png',    caption: 'North Star Journeys' },
      { src: '/images/sp-design-vision/design-led-initiatives.png', caption: 'Design-Led Initiatives' },
      { src: '/images/sp-design-vision/lets-go.png',                caption: 'Let\u2019s Go' },
    ],
  },
];
