import { useState, useMemo } from 'react';
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

export default function PostGrid({ posts }: Props) {
  const [cat, setCat] = useState('all');
  const [aud, setAud] = useState('Everyone');

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
              {categoryList.map(([id, name]) => (
                <button
                  key={id}
                  className={`do-chip${cat === id ? ' is-on' : ''}`}
                  onClick={() => setCat(id)}
                >
                  {name}
                </button>
              ))}
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
