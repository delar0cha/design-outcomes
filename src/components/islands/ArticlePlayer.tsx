import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES } from '@lib/categories';
import type { PostSummary } from '@lib/types';

/**
 * Bespoke article audio player for the homepage FeaturedCarousel.
 *
 * Rest state: a small "Listen now" pill portaled into .do-featured-ctas
 * (alongside the "Read the piece" link at the bottom of the text column).
 *
 * Open state: the illustration in the art column fades out and is
 * replaced by a karaoke-style scrolling narration panel — the lines of
 * the article appear, the line currently being spoken is always centered
 * vertically in the art box, and individual words get a category-tinted
 * highlight bar drawn in behind them as they are read.
 *
 * Lifecycle contract with the parent carousel:
 *   - onOpen()  fires when the user taps the pill (same tick as the
 *               gesture, so the parent can pause auto-advance before
 *               anything races).
 *   - onClose() fires when the user taps × on the transport OR when the
 *               component unmounts while open (carousel idx change →
 *               ArticlePlayer remounts thanks to key={article.slug}).
 *
 * Time resets on nav: no position persistence across slide changes.
 */

const SPEEDS = [1, 1.25, 1.5, 2] as const;

/** One word in a narration line, with the start time (seconds) at which
 *  it begins being spoken. */
interface TimingWord {
  start: number;
  word: string;
}

/** One "line" of narrated text. If `words` is provided, the line renders
 *  word-by-word with per-word highlighting (karaoke). If only `text` is
 *  provided, the whole line toggles to "read" at its own start time. */
interface TimingLine {
  start: number;
  text?: string;
  words?: TimingWord[];
}

interface Props {
  article: PostSummary;
  onOpen?:  () => void;
  onClose?: () => void;
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlayGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size + 2}
      viewBox="0 0 12 14"
      aria-hidden="true"
      style={{ transform: 'translateX(1.5px)' }}
    >
      <path d="M0 0 L12 7 L0 14 Z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size + 2} viewBox="0 0 12 14" aria-hidden="true">
      <rect x="1" y="0" width="3" height="14" fill="currentColor" />
      <rect x="8" y="0" width="3" height="14" fill="currentColor" />
    </svg>
  );
}

function TinyPlayGlyph({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size + 2}
      viewBox="0 0 10 12"
      aria-hidden="true"
      style={{ transform: 'translateX(1px)' }}
    >
      <path d="M0 0 L10 6 L0 12 Z" fill="currentColor" />
    </svg>
  );
}

// ─── Karaoke scroll panel ──────────────────────────────────────────────
//
// Renders an array of narration lines. Finds the currently-active line
// (last line whose start <= currentTime) and translates the line stack so
// the active line's vertical center aligns with the scroll container's
// vertical center. Each line is measured via DOM offsetTop/offsetHeight
// because lines can wrap to multiple visual rows and so have variable
// heights. Words within the active line (and every line before it) are
// flagged `.is-read` once currentTime has passed their own start time;
// CSS then draws the category-tinted highlight bar behind them.

interface KaraokeProps {
  lines: TimingLine[];
  currentTime: number;
}

function findActiveLineIdx(lines: TimingLine[], t: number): number {
  if (!lines.length) return 0;
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].start <= t) idx = i;
    else break;
  }
  return idx;
}

function KaraokeText({ lines, currentTime }: KaraokeProps) {
  const linesRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState(0);

  const activeIdx = findActiveLineIdx(lines, currentTime);

  // Recompute the scroll offset whenever the active line changes. We
  // measure DOM instead of assuming a fixed line height because a single
  // "narration line" may wrap across multiple visual rows.
  useLayoutEffect(() => {
    const linesEl = linesRef.current;
    if (!linesEl) return;
    const activeEl = linesEl.children[activeIdx] as HTMLElement | undefined;
    if (!activeEl) return;
    const H = linesEl.offsetHeight;
    const activeCenter = activeEl.offsetTop + activeEl.offsetHeight / 2;
    // When `.do-player-karaoke-lines` is vertically centered inside its
    // scroll container (via flex align-items: center), its own center
    // aligns with the scroll container's center. Offsetting by
    // (linesHeight/2 − activeCenterInsideLines) therefore drags the
    // active line's center onto the scroll container's center.
    setTranslateY(H / 2 - activeCenter);
  }, [activeIdx, lines]);

  return (
    <div className="do-player-karaoke-scroll">
      <div
        className="do-player-karaoke-lines"
        ref={linesRef}
        style={{ transform: `translateY(${translateY}px)` }}
      >
        {lines.map((line, i) => {
          const hasWords = !!(line.words && line.words.length > 0);
          return (
            <div
              key={i}
              className={`do-player-karaoke-line${i === activeIdx ? ' is-active' : ''}`}
            >
              {hasWords
                ? line.words!.map((w, j) => {
                    const isRead = currentTime >= w.start;
                    // Regular trailing space (not &nbsp;) so lines wrap
                    // naturally at narrow viewports. Since the space is
                    // INSIDE the span, the highlight bar stays continuous
                    // between consecutive .is-read spans on the same line.
                    const trailing = j < line.words!.length - 1 ? ' ' : '';
                    return (
                      <span
                        key={j}
                        className={`do-player-karaoke-word${isRead ? ' is-read' : ''}`}
                      >
                        {w.word}
                        {trailing}
                      </span>
                    );
                  })
                : (
                  // No word-level timings — line-level highlight. The whole
                  // line flips to .is-read at its own start time.
                  <span
                    className={`do-player-karaoke-word${currentTime >= line.start ? ' is-read' : ''}`}
                  >
                    {line.text ?? ''}
                  </span>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ArticlePlayer ────────────────────────────────────────────────

export default function ArticlePlayer({ article, onOpen, onClose }: Props) {
  // No entry point if there's no audio. Parent should already gate on this,
  // but guard here too so a stray render never shows an inert pill.
  if (!article.audio) return null;

  const [open, setOpen]                 = useState(false);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [lines, setLines]               = useState<TimingLine[] | null>(null);

  const [artContainer, setArtContainer]   = useState<HTMLElement | null>(null);
  const [ctasContainer, setCtasContainer] = useState<HTMLElement | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stabilise parent callbacks via refs so the open/close effect doesn't
  // thrash when the parent passes inline arrow functions.
  const onOpenRef  = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onOpenRef.current  = onOpen;  }, [onOpen]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Fires onClose when the component transitions from open → closed OR
  // when it unmounts while still open (carousel navigation key-change).
  useEffect(() => {
    if (!open) return;
    return () => { onCloseRef.current?.(); };
  }, [open]);

  const categoryTint = CATEGORIES[article.category]?.tint ?? '#B8432B';

  // Look up the two portal targets once per mount. useLayoutEffect runs
  // before paint so the portals materialise without a one-frame flicker.
  useLayoutEffect(() => {
    setArtContainer(document.querySelector<HTMLElement>('.do-featured-art'));
    setCtasContainer(document.querySelector<HTMLElement>('.do-featured-ctas'));
  }, []);

  // Fetch timings lazily on open — no network request until the reader
  // actually wants to listen.
  useEffect(() => {
    if (!open || !article.timings) return;
    let cancelled = false;
    fetch(article.timings)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data)) setLines(data as TimingLine[]);
      })
      .catch(() => { /* silent fallback — karaoke shows description as static text */ });
    return () => { cancelled = true; };
  }, [open, article.timings]);

  // Keep playbackRate in sync with the audio element.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setDuration(e.currentTarget.duration);
  };

  const openPlayer = () => {
    setOpen(true);
    // Fire synchronously so the parent pauses auto-advance on the same
    // tick as the tap — no window where the carousel might flip to the
    // next slide between the user's tap and our mount.
    onOpenRef.current?.();
    // Kick off playback on the same user-gesture tick so Safari's
    // autoplay policy treats this as gesture-initiated. Audio element is
    // already mounted (preload="none"), so audioRef.current is live here.
    const a = audioRef.current;
    if (a) a.play().catch(() => { /* autoplay policy fallback */ });
  };

  const closePlayer = () => {
    const a = audioRef.current;
    if (a && !a.paused) a.pause();
    setOpen(false);
    // onClose will fire from the [open] effect's cleanup.
  };

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (a.paused) await a.play();
      else          a.pause();
    } catch { /* benign user-gesture fallthrough */ }
  };

  const scrubTo = (clientX: number, rect: DOMRect) => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    a.currentTime = pct * a.duration;
  };

  const changeRate = (r: number) => { setPlaybackRate(r); };
  const cycleRate = () => {
    const idx = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setPlaybackRate(next);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // CSS custom property for category accent — applied to each portal
  // wrapper (custom properties don't inherit across React portal
  // boundaries into a different DOM subtree).
  const accentStyle: React.CSSProperties = {
    ['--player-accent' as unknown as keyof React.CSSProperties]: categoryTint,
  } as React.CSSProperties;

  return (
    <>
    {/* Karaoke text — portaled into .do-featured-art. Replaces the
        narration orb entirely. At rest it's opacity:0 under the
        illustration; on .is-player-open the illustration fades out and
        the karaoke panel fades in. */}
    {artContainer && createPortal(
      <div className="do-player-karaoke" style={accentStyle}>
        {open && lines && lines.length > 0 ? (
          <KaraokeText lines={lines} currentTime={currentTime} />
        ) : open ? (
          // Timings file missing or not yet fetched — fall back to the
          // article description as a single static block. Graceful
          // degradation so the player still reads sensibly before a
          // timings file has been generated.
          <div className="do-player-karaoke-fallback">{article.description}</div>
        ) : null}
      </div>,
      artContainer
    )}

    {/* Pill + Transport — portaled into .do-featured-ctas. */}
    {ctasContainer && createPortal(
      <>
        <button
          type="button"
          className="do-player-pill"
          style={accentStyle}
          onClick={openPlayer}
          disabled={open}
          aria-label="Listen now"
          aria-expanded={open}
        >
          <span className="do-player-pill-label">Listen now</span>
          <span className="do-player-pill-play" aria-hidden="true">
            <TinyPlayGlyph size={10} />
          </span>
        </button>

        <div
          className="do-player-transport"
          style={accentStyle}
          role="group"
          aria-label="Audio transport"
        >
          <button
            type="button"
            className="do-player-play"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            tabIndex={open ? 0 : -1}
          >
            {isPlaying ? <PauseGlyph /> : <PlayGlyph />}
          </button>

          <span className="do-player-time">{formatTime(currentTime)}</span>

          <div
            className="do-player-scrubber"
            role="slider"
            tabIndex={open ? 0 : -1}
            aria-label="Audio progress"
            aria-valuemin={0}
            aria-valuemax={Math.max(1, Math.round(duration))}
            aria-valuenow={Math.round(currentTime)}
            onClick={(e) => scrubTo(e.clientX, e.currentTarget.getBoundingClientRect())}
            onKeyDown={(e) => {
              const a = audioRef.current;
              if (!a) return;
              if (e.key === 'ArrowLeft')  { e.preventDefault(); a.currentTime = Math.max(0, a.currentTime - 5); }
              if (e.key === 'ArrowRight') { e.preventDefault(); a.currentTime = Math.min(duration || 0, a.currentTime + 5); }
            }}
          >
            <div className="do-player-scrubber-track" />
            <div className="do-player-scrubber-bar"   style={{ width: `${progressPct}%` }} />
            <div className="do-player-scrubber-thumb" style={{ left:  `${progressPct}%` }} />
          </div>

          <span className="do-player-time is-right">{formatTime(duration)}</span>

          <div className="do-player-speeds do-player-speeds--desktop" role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={`do-player-speed${playbackRate === s ? ' is-active' : ''}`}
                onClick={() => changeRate(s)}
                aria-label={`Playback speed ${s}x`}
                aria-pressed={playbackRate === s}
                tabIndex={open ? 0 : -1}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            type="button"
            className="do-player-speeds--mobile do-player-speed is-active"
            onClick={cycleRate}
            aria-label={`Playback speed ${playbackRate}x — tap to cycle`}
            tabIndex={open ? 0 : -1}
          >
            {playbackRate}x
          </button>

          <button
            type="button"
            className="do-player-close"
            onClick={closePlayer}
            aria-label="Close player"
            tabIndex={open ? 0 : -1}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </>,
      ctasContainer
    )}

    {/* Audio element mounts with the component — not gated on `open` —
        so audioRef.current is live when the pill-click handler runs and
        play() can fire synchronously on the user gesture. preload="none"
        means no network activity until play() is called. Rendered inline
        (no wrapper) because all visible UI has been portaled elsewhere. */}
      <audio
        ref={audioRef}
        src={article.audio}
        crossOrigin="anonymous"
        preload="none"
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
      />
    </>
  );
}
