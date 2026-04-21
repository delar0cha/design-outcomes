# Content authoring guide

## Creating a new post

The fastest path: use the CLI scaffolder.

```bash
npm run new-post -- --title "Your Post Title"
```

This creates `src/content/posts/your-post-title.mdx` with all frontmatter fields pre-filled and `draft: true`. Open the file and write.

---

## Frontmatter reference

```yaml
title: "Your Title Here"
publishedAt: 2026-04-19          # ISO date — used for sort order and display
description: "One sentence."     # Card excerpt + OG description
why: "Why this matters — ..."    # Optional lede on article page (leave blank to omit)
category: decision               # See categories below
audience: Leaders                # Everyone | Leaders | ICs
coverImage: /images/slug.jpg     # Hero image + card thumbnail
featured: false                  # true = appears in the homepage carousel
draft: true                      # true = hidden in production, visible in dev
tags: []                         # Reserved for future use
audio: https://...               # Optional ElevenLabs audio URL
audioGeneratedAt: 2026-04-19     # Optional — set when audio is added
```

### Categories

| Key       | Display name         | Use when…                                                    |
|-----------|----------------------|--------------------------------------------------------------|
| `reframe` | The Reframe          | You're flipping an assumption the reader probably holds      |
| `crit`    | Crit Notes           | You're sharing feedback with the reasoning made visible      |
| `decision`| The Decision         | You're unpacking a real product or org decision              |
| `makers`  | Maker's Log          | You're documenting a hands-on making or building process     |
| `toolbox` | Toolbox              | You're sharing a reusable framework, scorecard, or method    |
| `reading` | Reading List         | You're curating weekly links with personal commentary        |
| `state`   | State of the Craft   | Monthly synthesis — use sparingly                            |

### Audience

| Value      | Use when…                                              |
|------------|--------------------------------------------------------|
| `Everyone` | Any designer or leader can get value from this         |
| `Leaders`  | Primarily useful for people managing teams or orgs     |
| `ICs`      | Primarily useful for individual contributors           |

---

## Draft workflow

1. `npm run new-post -- --title "..."` — scaffold the file
2. Write in the MDX file with `draft: true`
3. Preview locally: `npm run dev` — drafts are visible in dev
4. When ready: set `draft: false` and `featured: true` if it's for the carousel
5. Update `src/lib/issue.ts` with the new issue number and week date
6. Deploy (push to GitHub — Vercel builds automatically)

---

## Adding a cover image

1. Place the image at `public/images/your-slug.jpg` (1200×800px recommended)
2. Set `coverImage: /images/your-slug.jpg` in frontmatter
3. The same image is used as the hero, card thumbnail, and OG image automatically

---

## Audio placeholder (ElevenLabs)

The schema reserves two optional fields for future audio integration:

```yaml
audio: https://your-elevenlabs-url.mp3
audioGeneratedAt: 2026-04-19
```

Leave both blank for now. When the audio pipeline is ready, fill these in per-post.

---

## Updating the current issue

Edit `src/lib/issue.ts`:

```typescript
export const CURRENT_ISSUE = {
  issueNumber: 3,              // ← increment each Sunday
  weekOf:      'Apr 26',       // ← short form for nav header
  weekOfFull:  'April 26, 2026', // ← long form for footer
} as const;
```

---

## MDX syntax guide

Plain paragraphs, headings (`##`, `###`), and blockquotes (`>`) are all you need for most posts. No JSX required.

```mdx
Regular paragraph. Just write.

## A heading

Another paragraph.

> A pull quote — one sentence that earns being read twice.

Back to prose.
```

Images (if you need one inline in the body, rare for posts):

```mdx
![Alt text](/images/your-image.jpg)
```
