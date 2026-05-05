import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title:            z.string(),
    publishedAt:      z.date(),
    updatedAt:        z.date().optional(),

    /** 1–2 sentence description used for SEO meta and card previews. */
    description:      z.string(),

    /**
     * Optional "Why this matters" lede shown on the article page,
     * styled distinctly from the description.
     */
    why:              z.string().optional(),

    /** Branded editorial column. */
    category: z.enum([
      'reframe',   // The Reframe — Assumptions, examined.
      'crit',      // Crit Notes — Feedback, with the reasoning shown.
      'decision',  // The Decision — What we chose, and why.
      'makers',    // Maker's Log — Process, visible.
      'toolbox',   // Toolbox — Frameworks you can steal.
      'reading',   // Reading List — Weekly links, personally vetted.
      'state',     // State of the Craft — Monthly synthesis.
    ]),

    /** Who the piece is primarily written for. */
    audience: z.enum(['Everyone', 'Leaders', 'ICs']).default('Everyone'),

    tags:             z.array(z.string()).optional().default([]),
    coverImage:       image().optional(),

    /**
     * Free-text themes the post engages with, used by the Field Notes agent
     * to map connections between published articles and external pieces it
     * surfaces. Populated by `npm run field-notes:migrate-articles`.
     */
    themes:           z.array(z.string()).optional().default([]),

    /**
     * Tactic tags from the controlled vocabulary the Field Notes agent uses
     * for connection mapping. Populated by
     * `npm run field-notes:migrate-articles`.
     */
    tactics: z.array(z.enum([
      'research_and_validation',
      'systems_and_primitives',
      'prototyping_and_exploration',
      'critique_and_decision_making',
      'craft_and_detail',
      'cross_functional_and_process',
      'storytelling_and_narrative',
      'hiring_and_team',
    ])).optional().default([]),

    /**
     * URL to an ElevenLabs-generated MP3 on Vercel Blob.
     * Populated by the audio generation script (to be built in a separate pass).
     * Leave absent until the article has been narrated.
     *
     * TODO: plug audio generation script here — once ElevenLabs account is ready,
     * the script will populate this field and set audioGeneratedAt.
     */
    audio:            z.string().url().optional(),
    audioGeneratedAt: z.date().optional(),

    /**
     * Path (or URL) to the timings JSON used for synced lyric highlighting
     * in the featured-carousel audio player. Convention: `/timings/<slug>.json`
     * served from `public/timings/`. File format: `[{ start: <seconds>, text: <string> }]`.
     *
     * Optional — if absent, the player renders without active-line sync
     * (falls back to the description as a static block). Machine-generated
     * from the MP3 in a separate pipeline; the path just needs to be stable.
     */
    timings:          z.string().optional(),

    /** Set to true to keep a post out of production builds. */
    draft:   z.boolean().default(false),

    /**
     * The weekly issue this post belongs to. The homepage carousel surfaces
     * every post whose `issue` matches CURRENT_ISSUE.issueNumber in
     * src/lib/issue.ts. Posts without an `issue` are reachable from the
     * index but never appear in the carousel.
     */
    issue: z.number().int().positive().optional(),

    // readingTime is NOT authored — it is calculated automatically in src/lib/posts.ts
    // from the rendered body content. Do not add it here.
  }),
});

// ── Field Notes ──────────────────────────────────────────────────────────────
//
// Curated catalog of design work from teams and individuals worldwide, with
// editorial annotations. Entries live in src/content/field-notes/published/
// (the /staging/ subdirectory holds agent-generated drafts before review and
// is intentionally excluded from this collection so drafts don't appear on
// the site).

const TACTIC_VOCABULARY = [
  'research_and_validation',
  'systems_and_primitives',
  'prototyping_and_exploration',
  'critique_and_decision_making',
  'craft_and_detail',
  'cross_functional_and_process',
  'storytelling_and_narrative',
  'hiring_and_team',
] as const;

const fieldNotes = defineCollection({
  // Glob loader so we can scope to /published/ and ignore /staging/ drafts.
  loader: glob({ pattern: '*.mdx', base: 'src/content/field-notes/published' }),
  schema: z.object({
    /** Stable slug; matches the filename and the URL segment under /field-notes/. */
    slug:               z.string(),
    /** Human-readable source name shown on the card and the detail page. */
    source:             z.string(),
    /** Identifier used to look up source-specific assets (e.g. logo SVG). */
    source_id:          z.string(),
    /** External URL of the original piece. */
    source_url:         z.string().url(),
    piece_title:        z.string(),
    piece_author:       z.string().optional(),
    piece_published_at: z.date().optional(),

    /** One to three controlled tactic tags from the rubric vocabulary. */
    tactic_tags:        z.array(z.enum(TACTIC_VOCABULARY)).min(1).max(3),

    /** Five-dimensional rubric scores plus the total. */
    rubric_scores: z.object({
      process_visibility:  z.number().int().min(0).max(5),
      decision_visibility: z.number().int().min(0).max(5),
      specificity:         z.number().int().min(0).max(5),
      originality:         z.number().int().min(0).max(5),
      audience_fit:        z.number().int().min(0).max(5),
      total:               z.number().int().min(0).max(25),
    }),
    rubric_verdict:    z.enum(['explicit_tactics', 'inferred_candidate', 'drop']),
    rubric_rationale:  z.string(),
    pull_quote_candidate: z.string().nullable().optional(),
    paywall_encountered: z.boolean().default(false),

    /**
     * Editorial card title shown on the kraft band of the catalog card —
     * Leonardo's framing in a Jim Holt-inspired register, not a description
     * of the source piece. The source's actual title (piece_title) still
     * shows on the flip page so a reader who opens a card sees fidelity
     * to the original. 4-7 words, max 45 characters.
     */
    card_title: z.string().max(45).optional(),

    /**
     * Editorial card abstract shown below the card title in the kraft
     * band. 1-3 sentences in the same Jim Holt voice. Target 100-180
     * characters; rendering caps display at 3 lines via CSS line-clamp.
     */
    card_abstract: z.string().max(300).optional(),

    /**
     * Editorial pull quote shown on the dot-grid flip page. ≤ 25 words.
     * Supports a markdown-style highlight syntax: wrapping a 3-7 word
     * phrase in ==double equals== marks it for scratch-style underline
     * rendering on the page (e.g. "...by breaking the work into ==small,
     * targeted steps=="). When set, this takes precedence over the
     * agent-generated pull_quote_candidate for display.
     */
    pull_quote: z.string().optional(),

    /**
     * Three to five "why it matters" bullets in Leonardo's voice. Each
     * bullet is one discrete observation, 8-15 words. The bullets array
     * is the primary editorial content rendered on the flip page;
     * the MDX body becomes archival-only.
     */
    bullets: z.array(z.string()).min(3).max(5).optional(),

    /** Up to two related Design Outcomes articles surfaced by the agent. */
    suggested_connections: z.array(z.object({
      article_slug:    z.string(),
      article_title:   z.string(),
      connection_type: z.enum(['shared_tactic', 'argumentative_dialogue', 'shared_theme']),
      confidence:      z.enum(['high', 'medium', 'low']),
      rationale:       z.string(),
    })).default([]),

    /** Agent-side notes about the annotation draft for editor reference. */
    draft_annotation_metadata: z.object({
      draft_notes:           z.string().optional(),
      alternative_phrasings: z.array(z.string()).optional().default([]),
      uncertainty_flags:     z.string().nullable().optional(),
    }).optional(),

    /**
     * How the source name renders on the card footer.
     *   "company"    — "BY {author} / {date}"
     *   "individual" — "{date}" only
     * Defaults to "company".
     */
    display_type: z.enum(['company', 'individual']).default('company'),

    /**
     * Optional Field Notes Friday issue number this entry was bundled into.
     * Surfaces on /field-notes/issue/{n} once issue MDX exists.
     */
    issue_number: z.number().int().positive().optional(),

    /**
     * Semantic name of the cover background color. The agent assigns this at
     * staging time with grid-aware adjacency (no two neighbors on the catalog
     * grid share a color). Hex resolution lives in CSS via --cover-{name}-*
     * tokens. Optional so legacy entries without it fall back to the
     * tactic-tag-driven cover color.
     */
    coverColor: z.enum([
      'deep-teal', 'sage', 'terracotta', 'aubergine', 'navy', 'warm-charcoal',
    ]).optional(),

    generated_at: z.date().optional(),
  }),
});

export const collections = { posts, 'field-notes': fieldNotes };
