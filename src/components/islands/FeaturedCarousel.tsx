import { useState, useEffect, useCallback } from 'react';
import Illustration from './Illustration';
import ArticlePlayer from './ArticlePlayer';
import type { PostSummary } from '@lib/types';
import { CATEGORIES } from '@lib/categories';
import { fmtDate } from '@lib/utils';
import { formatPostIssueLabel } from '@lib/issue';

interface Props {
  posts: PostSummary[];
}

function CategoryTag({ catId, size = 'sm' }: { catId: string; size?: 'sm' | 'lg' }) {
  const c = CATEGORIES[catId];
  if (!c) return null;
  return (
    // Sizing is done via .do-tag--sm / .do-tag--lg classes rather than
    // inline style, so media queries can shrink the lg variant on narrow
    // viewports where longer category names (e.g. "THE REFRAME") would
    // otherwise break onto two lines inside the meta-row pill.
    <span className={`do-tag do-tag--${size}`}>
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
  const [idx, setIdx]               = useState(0);
  const [paused, setPaused]         = useState(false);
  // True whenever an ArticlePlayer is open on any slide. Derived from the
  // player's onOpen/onClose callbacks. We pause auto-advance / progress bar /
  // hero zoom while this is true so audio playback isn't interrupted
  // mid-sentence by a slide transition.
  const [playerOpen, setPlayerOpen] = useState(false);
  const DUR = 8000;

  const handlePlayerOpen  = useCallback(() => setPlayerOpen(true),  []);
  const handlePlayerClose = useCallback(() => setPlayerOpen(false), []);

  useEffect(() => {
    if (paused || playerOpen || posts.length <= 1) return;
    const t = setTimeout(() => setIdx(i => (i + 1) % posts.length), DUR);
    return () => clearTimeout(t);
  }, [idx, paused, playerOpen, posts.length]);

  const advance = (n: number) => setIdx(i => (i + n + posts.length) % posts.length);
  const jumpTo  = (n: number) => setIdx(n);

  const post = posts[idx];
  if (!post) return null;

  const cat = CATEGORIES[post.category];

  // Single source of truth for slide pacing: the `DUR` constant above
  // drives the setTimeout that advances `idx`, and is exposed as
  // `--do-slide-duration` so both the progress bar and the hero zoom
  // keyframe read the same value. Change DUR and everything stays in sync.
  //
  // --player-accent is also set here (per active post's category tint) so
  // it cascades to everything inside the carousel: the portaled pill +
  // transport in .do-featured-ctas, the CTA link on hover, and the active
  // carousel dot inside .do-featured-art.
  const rootStyle = {
    '--do-slide-duration': `${DUR}ms`,
    '--player-accent': cat?.tint ?? '#B8432B',
  } as React.CSSProperties;

  return (
    <section
      className={`do-featured is-framed${playerOpen ? ' is-player-open' : ''}`}
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
              animationPlayState:   (paused || playerOpen) ? 'paused' : 'running',
            }}
          />
        </div>

        {/* Frame — index-card-styled box that wraps the art + text columns.
            Adds a 6px breathing margin around the contents and a subtle
            rule + radius matching the .do-card grid below. Collapses to
            display:contents at <=1080px so the existing responsive rules
            for art/text/progress (which target them as direct children of
            .do-featured-inner) keep working unchanged. */}
        <div className="do-featured-frame">

        {/* Slide stack — one container per post, only the active one shows.
            The Ken Burns zoom that used to live on the active slide's image
            has been replaced by the Riso eject sequence (rendered below as
            .do-eject-stack). The slide stack now only holds the static
            "settled" image; it sits underneath the eject overlay and is
            what's visible after the eject sequence completes. */}
        <div className="do-featured-art">
          {posts.map((p, i) => {
            const isActive = i === idx;
            return (
              <div
                key={i}
                className={`do-featured-art-slide${isActive ? ' is-active' : ''}`}
                aria-hidden={!isActive}
              >
                {p.cover
                  ? <img
                      src={p.cover.src}
                      srcSet={p.cover.srcset}
                      sizes={p.cover.sizes}
                      width={p.cover.width}
                      height={p.cover.height}
                      alt=""
                      className="do-featured-img"
                      draggable={false}
                      loading={isActive ? 'eager' : 'lazy'}
                      {...(isActive ? { fetchpriority: 'high' } as any : {})}
                    />
                  : <Illustration
                      recipe={recipeFor(p)}
                      className="do-featured-svg"
                    />}
              </div>
            );
          })}

          {/* Riso eject sequence — five staggered "fresh print" overlays of
              the active post's cover. Remounts on every idx change via the
              keyed wrapper, which restarts the animation chain. The first
              four passes slide in from the right blurry and offset, then
              exit left as the next pass arrives. The fifth is the keeper:
              it lands clean and stays (animation-fill-mode: both holds the
              end state for the rest of the slide dwell). All motion is in
              CSS — see .do-eject-stack rules in global.css. Reduced-motion
              users get an opacity crossfade via media query. */}
          {post.cover && (
            <div className="do-eject-stack" key={`eject-${idx}`} aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <img
                  key={i}
                  src={post.cover!.src}
                  srcSet={post.cover!.srcset}
                  sizes={post.cover!.sizes}
                  alt=""
                  className={`do-eject ${i === 4 ? 'do-eject--final' : 'do-eject--pass'}`}
                  data-i={i}
                  draggable={false}
                />
              ))}
            </div>
          )}

          {/* Issue pips — subtle "N of M" indicator showing how many
              articles are in the current carousel. Read-only; the carousel
              advances on its own. Sits at the bottom-center of the art. */}
          {posts.length > 1 && (
            <div
              className="do-issue-pips"
              role="group"
              aria-label={`Article ${idx + 1} of ${posts.length}`}
            >
              {posts.map((_, i) => (
                <span
                  key={i}
                  className={`do-issue-pip${i === idx ? ' is-on' : ''}`}
                  aria-hidden="true"
                >
                  {i === idx && (
                    <svg className="do-issue-pip-mark" viewBox="0 0 10 10" width="6" height="6" aria-hidden="true">
                      <path
                        d="M5 1v8M1.5 2.5l7 5M1.5 7.5l7-5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Carousel controls — temporarily hidden. Auto-advance still
              runs (DUR timer in the useEffect above); users just can't
              prev/next/pause/dot-jump manually while this is commented out.
              Restore by uncommenting the block below. */}
          {/*
          <div className="do-featured-controls">
            <button className="do-ctrl" onClick={() => advance(-1)} aria-label="Previous">
              <svg width="12" height="12" viewBox="0 0 14 14">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.3" fill="none" />
              </svg>
            </button>
            <button
              className="do-ctrl"
              onClick={() => setPaused(p => !p)}
              aria-label={paused ? 'Play' : 'Pause'}
            >
              {paused
                ? <svg width="12" height="12" viewBox="0 0 14 14"><path d="M3 2v10l9-5z" fill="currentColor" /></svg>
                : <svg width="12" height="12" viewBox="0 0 14 14">
                    <rect x="3" y="2" width="3" height="10" fill="currentColor" />
                    <rect x="8" y="2" width="3" height="10" fill="currentColor" />
                  </svg>}
            </button>
            <button className="do-ctrl" onClick={() => advance(1)} aria-label="Next">
              <svg width="12" height="12" viewBox="0 0 14 14">
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
          */}
        </div>

        {/* Text block — flex column with meta+hero at top, CTA row at bottom.
            The CTA row's bottom edge aligns with the art column's bottom
            because both columns stretch to row 1's height. The meta bar
            and hero content stay visible while the player is open; only
            the CTA row morphs into the audio transport. */}
        <div className="do-featured-text" key={`txt-${idx}`}>
          <div className="do-featured-meta">
            <CategoryTag catId={post.category} size="lg" />
            <span className="do-featured-read">
              {post.readingTime} · {fmtDate(post.publishedAt)}
            </span>
          </div>
          <div className="do-featured-hero-content">
            <h1
              className={`do-featured-title${
                post.title.length >= 45 ? ' is-xlong' :
                post.title.length >= 30 ? ' is-long'  : ''
              }`}
            >
              <a className="do-featured-title-link" href={`/post/${post.slug}`}>{post.title}</a>
            </h1>
            <p className="do-featured-excerpt">{post.description}</p>
          </div>
          {/* Per-slide issue metadata — sits between the blurb and the CTA
              row. Renders nothing when the post has no issue assigned. */}
          {/* {formatPostIssueLabel(post) && (
            <div className="do-featured-issue">
              <span className="do-issue-label">{formatPostIssueLabel(post)}</span>
            </div>
          )} */}
          {/* CTA row — Listen now pill (portaled in by ArticlePlayer when
              audio is present) + Read the piece link. The transport is
              also portaled here and absolute-positioned to morph from the
              pill's footprint to the row's full width on open.
              --player-accent cascades from the .do-featured section root. */}
          <div className="do-featured-ctas">
            <a className="do-featured-cta" href={`/post/${post.slug}`}>
              <span>Read the piece</span>
              <svg width="28" height="10" viewBox="0 0 28 10" fill="none">
                <path d="M0 5h26M22 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </a>
          </div>
        </div>
        </div>{/* /.do-featured-frame */}

        {/* Bespoke audio player — one per slide, keyed by slug so carousel
            navigation unmounts the active player cleanly (audio stops, player
            for the new slide mounts in its at-rest pill state). Only renders
            when the active post has an audio URL; absent that, the slide is
            byte-identical to how it was pre-feature. */}
        {post.audio && (
          <ArticlePlayer
            key={post.slug}
            article={post}
            onOpen={handlePlayerOpen}
            onClose={handlePlayerClose}
          />
        )}
      </div>
    </section>
  );
}
