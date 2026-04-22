import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
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
    coverImage:       z.string().optional(),

    /**
     * Dominant background color of the cover image, drawn from the site palette.
     * Used as the container background behind the hero image on the homepage
     * carousel and the article detail page so the image can zoom/recede into
     * a seamless field without exposing its edges.
     *
     * Palette:
     *   #F5F0E8 cream   — default for warm off-white illustrations
     *   #2F4858 teal    — deep blue-green
     *   #4A5D3A sage    — muted green
     *   #B8432B terracotta
     *   #15120E near-black
     */
    heroBgColor: z.enum([
      '#F5F0E8',
      '#2F4858',
      '#4A5D3A',
      '#B8432B',
      '#15120E',
    ]).optional(),

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
     * Marks a post for the weekly featured carousel.
     * Flip to true for the current week's 3 articles; flip back after rotation.
     */
    featured: z.boolean().default(false),

    // readingTime is NOT authored — it is calculated automatically in src/lib/posts.ts
    // from the rendered body content. Do not add it here.
  }),
});

export const collections = { posts };
