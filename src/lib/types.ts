// Serializable plain object passed from Astro pages to React islands as props.
// Never import CollectionEntry here — islands don't have access to astro:content.

export interface PostSummary {
  slug: string;
  title: string;
  description: string;
  why?: string;
  category: string;
  audience: string;
  coverImage?: string;
  heroBgColor?: string;
  publishedAt: string; // ISO string
  readingTime: string; // e.g. "4 min read"
  featured: boolean;
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
  sub: string;
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
