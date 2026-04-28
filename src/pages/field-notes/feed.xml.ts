/**
 * /field-notes/feed.xml — RSS feed of published Field Notes entries.
 */

import rss               from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const entries = await getCollection('field-notes');
  entries.sort((a, b) => {
    const ad = a.data.piece_published_at?.getTime() ?? 0;
    const bd = b.data.piece_published_at?.getTime() ?? 0;
    return bd - ad;
  });

  return rss({
    title:       'Field Notes — Design Outcomes',
    description: 'Curated design tactics from teams and individuals working today, with editorial annotations by Leonardo De La Rocha.',
    site:        context.site ?? 'https://ldlr.design',
    items: entries.map(entry => {
      const data = entry.data;
      // Description = pull quote (if any) + first sentence of annotation body.
      const annotationFirst = (entry.body ?? '').split(/(?<=[.?!])\s+/)[0] ?? '';
      const description = [
        data.pull_quote_candidate ? `"${data.pull_quote_candidate}"` : null,
        annotationFirst,
      ].filter(Boolean).join('\n\n');

      return {
        title:    data.piece_title,
        link:     `/field-notes/${entry.id}`,
        pubDate:  data.piece_published_at ?? new Date(),
        author:   data.piece_author ?? data.source,
        description,
      };
    }),
    customData: '<language>en-us</language>',
  });
}
