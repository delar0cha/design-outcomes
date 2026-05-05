// Serializable plain object passed from Astro pages to React islands as props.
// Never import CollectionEntry here — islands don't have access to astro:content.

export interface HeroCover {
  src:    string;
  srcset: string;
  sizes:  string;
  width:  number;
  height: number;
}

export interface PostSummary {
  slug: string;
  title: string;
  description: string;
  why?: string;
  category: string;
  audience: string;
  coverImage?: string;
  /**
   * Pre-resolved hero image variants for the homepage FeaturedCarousel.
   * Populated by the parent .astro page via getImage() in src/lib/posts.ts.
   * Islands can't import astro:assets, so URLs are resolved server-side.
   * Absent for posts without a coverImage.
   */
  cover?: HeroCover;
  publishedAt: string; // ISO string
  readingTime: string; // e.g. "4 min read"
  issue?: number;
  draft: boolean;
  tags: string[];
  audio?: string;
  timings?: string;
}

export interface CategoryMeta {
  id: string;
  name: string;
  monogram: string;
  tint: string;
  // Original per-category hue, preserved when tints were unified to the
  // dark warm gray. Restore by swapping `tint` back to this value.
  originalTint?: string;
  sub: string;
  description: string;
}

export interface ProjectMeta {
  slug: string;
  cat: string;
  company: string;
  year: string;
  title: string;
  excerpt: string;
  status: 'live' | 'coming-soon';
  illustration: IllustrationSpec;
}

export interface CaseStudySection {
  type: 'p' | 'h' | 'quote' | 'img';
  text?: string;
  src?: string;
  caption?: string;
}

export interface CaseStudySlide {
  src: string;
  caption: string;
}

export interface CaseStudyMeta extends ProjectMeta {
  subtitle: string;
  summary: string;
  body: CaseStudySection[];
  slides: CaseStudySlide[];
}

export interface IllustrationSpec {
  kind: 'eye' | 'compass' | 'grid' | 'bars' | 'stack' | 'rays' | 'photo';
  palette?: string[];
  seed?: number;
  src?: string; // for kind:'photo'
}
