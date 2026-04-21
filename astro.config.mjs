import { defineConfig } from 'astro/config';
import react   from '@astrojs/react';
import mdx     from '@astrojs/mdx';
import vercel  from '@astrojs/vercel';

export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [
    react(),
    mdx(),
  ],
  // Markdown defaults (also applied to MDX via the mdx() integration)
  markdown: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});
