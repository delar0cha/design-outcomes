import { useState, useEffect } from 'react';
import Illustration from './Illustration';
import type { PostSummary } from '@lib/types';
import { CATEGORIES } from '@lib/categories';
import { fmtDate } from '@lib/utils';

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

export default function FeaturedCarousel({ posts }: Props) {
  const [idx, setIdx]       = useState(0);
  const [paused, setPaused] = useState(false);
  const DUR = 8000;

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

  return (
    <section className="do-featured is-framed" aria-label="Featured posts">
      <div className="do-featured-inner">
        {/* Vertical progress bar */}
        <div className="do-progress" aria-label="Auto-advance timer">
          <div className="do-progress-track" />
          <div
            key={`fill-${idx}`}
            className="do-progress-fill"
            style={{
              background:           cat?.tint ?? '#B8432B',
              animationDuration:    `${DUR}ms`,
              animationPlayState:   paused ? 'paused' : 'running',
            }}
          />
        </div>

        {/* Illustration stack — crossfade between slides; active slide zooms
            from scale(1.25) (image overflows, looks tightly framed) to scale(1)
            (full image visible, heroBgColor letterboxes the natural aspect). */}
        <div className="do-featured-art">
          {posts.map((p, i) => {
            const isActive = i === idx;
            return (
              <div
                key={i}
                className={`do-featured-art-slide${isActive ? ' is-active' : ''}`}
                style={{ background: p.heroBgColor ?? 'var(--cream-2)' }}
                aria-hidden={!isActive}
              >
                <div
                  key={isActive ? `zoom-${idx}` : `rest-${i}`}
                  className="do-featured-art-zoom"
                  style={isActive ? {
                    animationDuration:  `${DUR}ms`,
                    animationPlayState: paused ? 'paused' : 'running',
                  } : undefined}
                >
                  {p.coverImage
                    ? <img
                        src={p.coverImage}
                        alt=""
                        className="do-featured-img"
                        draggable={false}
                      />
                    : <Illustration recipe={recipeFor(p)} className="do-featured-svg" />}
                </div>
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
