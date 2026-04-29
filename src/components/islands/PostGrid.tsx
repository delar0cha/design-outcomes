import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import Illustration from './Illustration';
import type { PostSummary } from '@lib/types';
import type { CategoryMeta } from '@lib/types';
import { CATEGORIES, AUDIENCES } from '@lib/categories';
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

function PostCard({ post }: { post: PostSummary }) {
  const recipe = post.coverImage
    ? { kind: 'photo' as const, src: post.coverImage }
    : { kind: 'bars' as const, palette: ['#E8E0D0', '#2F4858', '#15120E'] as [string, string, string], seed: 1 };

  return (
    <a className="do-card" href={`/post/${post.slug}`}>
      <div className="do-card-thumb">
        <Illustration recipe={recipe} className="do-card-svg" />
      </div>
      <div className="do-card-body">
        <div className="do-card-top">
          <CategoryTag catId={post.category} />
          <span className="do-card-date">{fmtDate(post.publishedAt)}</span>
        </div>
        <h3 className="do-card-title"><span>{post.title}</span></h3>
        <p className="do-card-excerpt">{post.description}</p>
      </div>
    </a>
  );
}

function CategoryChipWithTooltip({
  meta, isOn, onClick,
}: { meta: CategoryMeta; isOn: boolean; onClick: () => void }) {
  const [show, setShow] = useState(false);
  const [tipStyle, setTipStyle] = useState<React.CSSProperties>({ position: 'fixed', left: -9999, top: -9999, width: 280 });
  const [pointerLeft, setPointerLeft] = useState<number>(140);
  const showTimer = useRef<number | null>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipId = `do-cat-tip-${meta.id}`;

  const open = () => {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    showTimer.current = window.setTimeout(() => setShow(true), 250);
  };
  const close = () => {
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    setShow(false);
  };

  useEffect(() => () => {
    if (showTimer.current) window.clearTimeout(showTimer.current);
  }, []);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show]);

  useLayoutEffect(() => {
    if (!show) return;
    const place = () => {
      if (!chipRef.current || !tipRef.current) return;
      const chip = chipRef.current.getBoundingClientRect();
      const tipW = 280;
      const tipH = tipRef.current.getBoundingClientRect().height;
      const center = chip.left + chip.width / 2;
      let left = center - tipW / 2;
      if (left < 8) left = 8;
      if (left + tipW > window.innerWidth - 8) left = window.innerWidth - 8 - tipW;
      const top = chip.top - tipH - 12;
      setTipStyle({ position: 'fixed', left, top, width: tipW });
      setPointerLeft(center - left);
    };
    place();
    const onScroll = () => place();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [show]);

  return (
    <span className="do-chip-wrap">
      <button
        ref={chipRef}
        className={`do-chip${isOn ? ' is-on' : ''}`}
        onClick={onClick}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        aria-describedby={show ? tipId : undefined}
      >
        {meta.name}
      </button>
      <div
        ref={tipRef}
        id={tipId}
        role="tooltip"
        className={`do-cat-tip${show ? ' is-on' : ''}`}
        style={tipStyle}
        aria-hidden={!show}
      >
        <div className="do-cat-tip-title">{meta.sub}</div>
        <div className="do-cat-tip-rule" style={{ background: meta.tint }} />
        <div className="do-cat-tip-body">{meta.description}</div>
        <div className="do-cat-tip-pointer" style={{ left: pointerLeft }} />
      </div>
    </span>
  );
}

function MobileExplainer({ catId }: { catId: string | null }) {
  const [renderCat, setRenderCat] = useState<string | null>(catId);
  const [open, setOpen] = useState<boolean>(catId !== null);

  useEffect(() => {
    if (catId !== null) {
      setRenderCat(catId);
      setOpen(true);
    } else if (renderCat !== null) {
      setOpen(false);
      const t = window.setTimeout(() => setRenderCat(null), 320);
      return () => window.clearTimeout(t);
    }
  }, [catId]);

  if (renderCat === null) return null;
  const c = CATEGORIES[renderCat];
  if (!c) return null;

  return (
    <div
      className={`do-cat-panel${open ? ' is-open' : ' is-closing'}`}
      role="region"
      aria-live="polite"
      aria-label="Category description"
    >
      <div className="do-cat-panel-inner" key={renderCat}>
        <div className="do-cat-panel-title">{c.sub}</div>
        <div className="do-cat-panel-rule" style={{ background: c.tint }} />
        <div className="do-cat-panel-body">{c.description}</div>
      </div>
    </div>
  );
}

export default function PostGrid({ posts }: Props) {
  const [cat, setCat] = useState('all');
  const [aud, setAud] = useState('Everyone');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const filtered = useMemo(() =>
    [...posts]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .filter(p => {
        const catOk = cat === 'all' || p.category === cat;
        const audOk = aud === 'Everyone' || p.audience === 'Everyone' || p.audience === aud;
        return catOk && audOk;
      }),
    [cat, aud, posts]
  );

  const categoryList: Array<[string, string]> = [
    ['all', 'All pieces'],
    ...Object.values(CATEGORIES).map(c => [c.id, c.name] as [string, string]),
  ];

  return (
    <section className="do-grid-section" aria-label="All pieces">
      <header className="do-grid-header">
        <div className="do-grid-head-left">
          <div className="do-eyebrow">The index</div>
          <h2 className="do-grid-title">Everything, organized by how you read.</h2>
        </div>
        <div className="do-grid-head-right">
          <div className="do-filter-block">
            <div className="do-filter-label">Category</div>
            <div className="do-filter-chips">
              {categoryList.map(([id, name]) => {
                const meta = CATEGORIES[id];
                if (!meta || isMobile) {
                  return (
                    <button
                      key={id}
                      className={`do-chip${cat === id ? ' is-on' : ''}`}
                      onClick={() => setCat(id)}
                    >
                      {name}
                    </button>
                  );
                }
                return (
                  <CategoryChipWithTooltip
                    key={id}
                    meta={meta}
                    isOn={cat === id}
                    onClick={() => setCat(id)}
                  />
                );
              })}
            </div>
          </div>
          <div className="do-filter-block">
            <div className="do-filter-label">Audience</div>
            <div className="do-filter-chips">
              {AUDIENCES.map(a => (
                <button
                  key={a}
                  className={`do-chip${aud === a ? ' is-on' : ''}`}
                  onClick={() => setAud(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {isMobile && (
        <MobileExplainer catId={cat !== 'all' ? cat : null} />
      )}

      <div className="do-grid">
        {filtered.map(p => <PostCard key={p.slug} post={p} />)}
        {filtered.length === 0 && (
          <div className="do-empty">
            Nothing here under that filter yet. Try widening it.
          </div>
        )}
      </div>
    </section>
  );
}
