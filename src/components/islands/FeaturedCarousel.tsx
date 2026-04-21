import { useState, useEffect } from 'react';
import Illustration from './Illustration';
import type { PostSummary } from '@lib/types';
import { CATEGORIES } from '@lib/categories';
import { fmtDate } from '@lib/utils';
import { sampleHeroBg, HERO_BG_FALLBACK } from '@lib/sampleHeroBg';

interface Props {
  posts: PostSummary[];
}

function CategoryTag({ catId, size = 'sm' }: { catId: string; size?: 'sm' | 'lg' }) {
  const c = CATEGORIES[catId];
  if (!c) return null;
  const pad = size === 'lg' ? '8px 12px' : '5px 9px';
  const fs  = size === 'lg' ? 12 : 11;
  return (
    <span className="do-tag" style={{ padding: pad, fontSize: fs }}>
      <span className="do-tag-mono" style={{ background: c.tint }}>{c.monogram}</span>
      <span className="do-tag-name">{c.name}</span>
    </span>
  );
}

function recipeFor(post: PostSummary) {
  const cat = CATEGORIES[post.category];
  return post.coverImage
    ? { kind: 'photo' as const, src: post.coverImage }
    : { kind: 'bars' as const, palette: [cat?.tint ?? '#2F4858', '#E8E0D0', '#15120E'], seed: 1 };
}

/**
 * Sample every cover image's edge colour on mount. Results populate a
 * per-URL state map; the fallback chain is sampled → heroBgColor
 * frontmatter → neutral cream.
 */
function useSampledBgs(posts: PostSummary[]): Record<string, string> {
  const [bgs, setBgs] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    for (const p of posts) {
      if (!p.coverImage) continue;
      sampleHeroBg(p.coverImage).then(c => {
        if (cancelled || !c) return;
        setBgs(prev => (prev[p.coverImage!] === c ? prev : { ...prev, [p.coverImage!]: c }));
      });
    }
    return () => { cancelled = true; };
  }, [posts]);
  return bgs;
}

export default function FeaturedCarousel({ posts }: Props) {
  const [idx, setIdx]       = useState(0);
  const [paused, setPaused] = useState(false);
  const DUR = 8000;
  const bgs = useSampledBgs(posts);

  useEffect(() => {
    if (paused || posts.length <= 1) return;
    const t = setTimeout(() => setIdx(i => (i + 1) % posts.length), DUR);
    return () => clearTimeout(t);
  }, [idx, paused, posts.length]);

  const advance = (n: number) => setIdx(i => (i + n + posts.length) % posts.length);
  const jumpTo  = (n: number) => setIdx(n);

  const post = posts[idx];
  if (!post) return null;

  const cat = CATEGORIES[post.category];

  // Single source of truth for slide pacing: the `DUR` constant above
  // drives the setTimeout that advances `idx`, and is exposed as
  // `--do-slide-duration` so both the progress bar and the hero zoom
  // keyframe read the same value. Change DUR and everything stays in sync.
  const rootStyle = {
    '--do-slide-duration': `${DUR}ms`,
  } as React.CSSProperties;

  return (
    <section
      className="do-featured is-framed"
      aria-label="Featured posts"
      style={rootStyle}
    >
      <div className="do-featured-inner">
        {/* Vertical progress bar */}
        <div className="do-progress" aria-label="Auto-advance timer">
          <div className="do-progress-track" />
          <div
            key={`fill-${idx}`}
            className="do-progress-fill"
            style={{
              background:           cat?.tint ?? '#B8432B',
              animationPlayState:   paused ? 'paused' : 'running',
            }}
          />
        </div>

        {/* Illustration — stacked slides with a swift crossfade. Each slide
            carries its own sampled background; the active slide's image
            animates from scale(--hero-initial-scale) to the end scale across
            the full slide duration, so the zoom completes exactly when the
            slide transitions. */}
        <div className="do-featured-art">
          {posts.map((p, i) => {
            const isActive = i === idx;
            const bg = (p.coverImage && bgs[p.coverImage]) ?? p.heroBgColor ?? HERO_BG_FALLBACK;
            const imgStyle = isActive
              ? { animationPlayState: paused ? 'paused' : 'running' as const }
              : undefined;
            return (
              <div
                key={i}
                className={`do-featured-art-slide${isActive ? ' is-active' : ''}`}
                style={{ background: bg }}
                aria-hidden={!isActive}
              >
                {p.coverImage
                  ? <img
                      key={isActive ? `img-${idx}` : `rest-${i}`}
                      src={p.coverImage}
                      alt=""
                      className="do-featured-img"
                      crossOrigin="anonymous"
                      draggable={false}
                      style={imgStyle}
                    />
                  : <Illustration
                      key={isActive ? `svg-${idx}` : `rest-${i}`}
                      recipe={recipeFor(p)}
                      className="do-featured-svg"
                      style={imgStyle}
                    />}
              </div>
            );
          })}
        </div>

        {/* Text block */}
        <div className="do-featured-text" key={`txt-${idx}`}>
          <div className="do-featured-meta">
            <CategoryTag catId={post.category} size="lg" />
            <span className="do-featured-read">
              {post.readingTime} · {fmtDate(post.publishedAt)}
            </span>
          </div>
          <h1 className="do-featured-title">{post.title}</h1>
          <p className="do-featured-excerpt">{post.description}</p>
          <a className="do-featured-cta" href={`/post/${post.slug}`}>
            <span>Read the piece</span>
            <svg width="28" height="10" viewBox="0 0 28 10" fill="none">
              <path d="M0 5h26M22 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </a>
        </div>

        {/* Controls */}
        <div className="do-featured-controls">
          <button className="do-ctrl" onClick={() => advance(-1)} aria-label="Previous">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.3" fill="none" />
            </svg>
          </button>
          <button
            className="do-ctrl"
            onClick={() => setPaused(p => !p)}
            aria-label={paused ? 'Play' : 'Pause'}
          >
            {paused
              ? <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 2v10l9-5z" fill="currentColor" /></svg>
              : <svg width="14" height="14" viewBox="0 0 14 14">
                  <rect x="3" y="2" width="3" height="10" fill="currentColor" />
                  <rect x="8" y="2" width="3" height="10" fill="currentColor" />
                </svg>}
          </button>
          <button className="do-ctrl" onClick={() => advance(1)} aria-label="Next">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.3" fill="none" />
            </svg>
          </button>
          <div className="do-dots">
            {posts.map((_, i) => (
              <button
                key={i}
                className={`do-dot${i === idx ? ' is-on' : ''}`}
                onClick={() => jumpTo(i)}
                aria-label={`Featured ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
