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
     * URL to an ElevenLabs-generated MP3 on Vercel Blob.
     * Populated by the audio generation script (to be built in a separate pass).
     * Leave absent until the article has been narrated.
     *
     * TODO: plug audio generation script here — once ElevenLabs account is ready,
     * the script will populate this field and set audioGeneratedAt.
     */
    audio:            z.string().url().optional(),
    audioGeneratedAt: z.date().optional(),

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
