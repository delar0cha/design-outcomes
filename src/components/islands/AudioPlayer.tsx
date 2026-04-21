import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Caption rendered below the inline audio player. Exported so the wording
 * can be tuned without touching component logic.
 */
export const AUDIO_CAPTION = "Narrated by the author, Leonardo De La Rocha.";

interface Props {
  /** Public MP3 URL. */
  audio: string;
  /** Post slug — used as the localStorage key for playback-position resume. */
  slug: string;
  /**
   * Sticky mini-player entrance/exit style.
   * 'smooth' (default) fades + micro-slides; 'snap' shows/hides instantly.
   * The snap mode powers the /audio-demo-snap preview page.
   */
  stickyMode?: 'smooth' | 'snap';
}

const SPEEDS = [1, 1.25, 1.5, 2] as const;
const POS_KEY = (slug: string) => `do:audio:pos:${slug}`;
const LISTEN_SLOT_ID = 'do-listen-btn-slot';

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlayGlyph({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
      <polygon points="2,1 9,5 2,9" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
      <rect x="2" y="1" width="2" height="8" fill="currentColor" />
      <rect x="6" y="1" width="2" height="8" fill="currentColor" />
    </svg>
  );
}

export default function AudioPlayer({ audio, slug, stickyMode = 'smooth' }: Props) {
  const [open, setOpen]               = useState(false);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [rate, setRate]               = useState<number>(1);
  const [isSticky, setIsSticky]       = useState(false);
  const [mounted, setMounted]         = useState(false);
  // Measured height of the site's sticky top nav. The sticky mini-player
  // docks just under it, so we read the actual DOM rather than hard-coding —
  // the nav is ~65px today but any future change in its padding/size should
  // flow through automatically.
  const [navHeight, setNavHeight]     = useState(65);

  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const inlineRef     = useRef<HTMLDivElement   | null>(null);
  // Set when the user opens the player via the Listen button, cleared once the
  // audio starts playing. Keeps auto-play tethered to the original user gesture
  // so it passes Chrome/Safari autoplay policy.
  const shouldAutoplay = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // Measure the nav once on mount, and again on resize (nav height can shift
  // between breakpoints if its internal padding/hamburger sizing changes).
  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector('.do-nav-wrap');
      if (nav) setNavHeight(Math.round(nav.getBoundingClientRect().height));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Save position on unmount so navigation away preserves the resume point.
  useEffect(() => {
    return () => {
      if (audioRef.current && audioRef.current.currentTime > 0) {
        try { localStorage.setItem(POS_KEY(slug), String(audioRef.current.currentTime)); } catch {}
      }
    };
  }, [slug]);

  // IntersectionObserver decides when the sticky mini-player should appear.
  // rootMargin top offset shrinks the viewport by the nav height so the
  // inline player reads as "gone" the moment it slides under the nav.
  useEffect(() => {
    if (!open || !inlineRef.current) return;
    const el = inlineRef.current;
    const obs = new IntersectionObserver(
      ([entry]) => {
        const aboveViewport = entry.boundingClientRect.top < 0;
        setIsSticky(!entry.isIntersecting && aboveViewport);
      },
      { threshold: 0, rootMargin: `-${navHeight}px 0px 0px 0px` },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [open, navHeight]);

  // Keyboard shortcuts — only active while the player is open.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seek(-15);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seek(15);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => { /* autoplay / user-gesture errors are fine */ });
    else          a.pause();
  };

  const seek = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta));
  };

  const scrubTo = (clientX: number, rect: DOMRect) => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    a.currentTime = pct * a.duration;
  };

  const changeRate = (r: number) => {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  };

  const toggleOpen = () => {
    if (open) {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      setOpen(false);
      setIsSticky(false);
    } else {
      shouldAutoplay.current = true;
      setOpen(true);
    }
  };

  // Restore saved position once the audio element mounts and metadata arrives.
  // If the user just opened the player via the Listen button, kick off
  // playback right after the seek so the experience feels instant.
  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const a = e.currentTarget;
    setDuration(a.duration);
    try {
      const saved = localStorage.getItem(POS_KEY(slug));
      if (saved) {
        const n = parseFloat(saved);
        if (!isNaN(n) && n < a.duration) a.currentTime = n;
      }
    } catch { /* localStorage may be unavailable */ }
    if (shouldAutoplay.current) {
      shouldAutoplay.current = false;
      a.play().catch(() => { /* autoplay policy blocked us — user can still click play */ });
    }
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Listen button (portaled into the byline-right slot) ─────────────────
  // Disabled while the player is open. The only close path in that state is
  // the X button in the inline player; once the user closes, the byline
  // button re-enables for the next open.
  const listenLabel = open ? 'Playing…' : 'Listen now';
  const listenButton = (
    <button
      type="button"
      className="do-listen-btn"
      onClick={toggleOpen}
      disabled={open}
      aria-label={listenLabel}
      aria-expanded={open}
    >
      <span className="do-listen-btn-label">{listenLabel}</span>
      <span className="do-listen-btn-play" aria-hidden="true">
        <PlayGlyph size={8} />
      </span>
    </button>
  );

  // ── Sticky mini-player (portaled to document.body) ──────────────────────
  const miniPlayer = (
    <div
      className={[
        'do-audio-sticky',
        stickyMode === 'snap' ? 'is-snap' : '',
        isSticky ? 'is-visible' : '',
      ].filter(Boolean).join(' ')}
      style={{ top: `${navHeight}px` }}
      aria-hidden={!isSticky}
    >
      <div className="do-audio-sticky-inner">
        <button
          type="button"
          className="do-audio-play is-mini"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          tabIndex={isSticky ? 0 : -1}
        >
          {isPlaying ? <PauseGlyph /> : <PlayGlyph />}
        </button>
        <div
          className="do-audio-scrubber is-mini"
          role="progressbar"
          aria-label="Audio progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPct)}
        >
          <div className="do-audio-scrubber-bar" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="do-audio-time">{formatTime(currentTime)}</span>
      </div>
    </div>
  );

  const listenSlot = mounted ? document.getElementById(LISTEN_SLOT_ID) : null;

  return (
    <>
      {listenSlot && createPortal(listenButton, listenSlot)}

      {open && (
        <>
          <div ref={inlineRef} className="do-audio-player">
            <div className="do-audio-player-inner">
              <button
                type="button"
                className="do-audio-play"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <PauseGlyph size={12} /> : <PlayGlyph size={12} />}
              </button>
              <span className="do-audio-time">{formatTime(currentTime)}</span>
              <div
                className="do-audio-scrubber"
                role="slider"
                tabIndex={0}
                aria-label="Audio progress"
                aria-valuemin={0}
                aria-valuemax={Math.max(1, Math.round(duration))}
                aria-valuenow={Math.round(currentTime)}
                onClick={(e) => scrubTo(e.clientX, e.currentTarget.getBoundingClientRect())}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft')  { e.preventDefault(); seek(-5); }
                  if (e.key === 'ArrowRight') { e.preventDefault(); seek( 5); }
                }}
              >
                <div className="do-audio-scrubber-bar" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="do-audio-time">{formatTime(duration)}</span>
              <div className="do-audio-speeds" role="group" aria-label="Playback speed">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`do-audio-speed${rate === s ? ' is-active' : ''}`}
                    onClick={() => changeRate(s)}
                    aria-label={`Playback speed ${s}x`}
                    aria-pressed={rate === s}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="do-audio-close"
                onClick={toggleOpen}
                aria-label="Close player"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
          <p className="do-audio-caption">{AUDIO_CAPTION}</p>

          <audio
            ref={audioRef}
            src={audio}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              if (audioRef.current) {
                try { localStorage.setItem(POS_KEY(slug), String(audioRef.current.currentTime)); } catch {}
              }
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => {
              setIsPlaying(false);
              try { localStorage.removeItem(POS_KEY(slug)); } catch {}
            }}
          />

          {mounted && createPortal(miniPlayer, document.body)}
        </>
      )}
    </>
  );
}
