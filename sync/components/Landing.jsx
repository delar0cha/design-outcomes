// Landing page: Featured carousel (Zone 1), Grid (Zone 2), Footer (Zone 3).
const { useState, useEffect, useRef, useMemo } = React;

const CategoryTag = ({ catId, size='sm' }) => {
  const c = window.CATEGORIES[catId];
  if (!c) return null;
  const pad = size==='lg' ? '8px 12px' : '5px 9px';
  const fs  = size==='lg' ? 12 : 11;
  return (
    <span className="do-tag" style={{padding:pad, fontSize:fs}}>
      <span className="do-tag-mono" style={{background:c.tint}}>{c.monogram}</span>
      <span className="do-tag-name">{c.name}</span>
    </span>
  );
};

const fmtDate = iso => {
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('en-US',{month:'short', day:'numeric', year:'numeric'});
};

// ---------- ZONE 1: Featured carousel ----------
const Featured = ({ posts, onOpen, heroLayout }) => {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const DUR = 8000;
  const startRef = useRef(performance.now());
  const rafRef = useRef(0);

  useEffect(() => {
    startRef.current = performance.now();
    setProgress(0);
    const tick = (t) => {
      if (paused) { startRef.current = t - progress*DUR; rafRef.current = requestAnimationFrame(tick); return; }
      const p = Math.min(1, (t - startRef.current)/DUR);
      setProgress(p);
      if (p >= 1) { setIdx(i => (i+1) % posts.length); startRef.current = t; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, posts.length, idx]);

  const advance = (n) => { setIdx(i => (i+n+posts.length) % posts.length); startRef.current = performance.now(); setProgress(0); };
  const jumpTo  = (n) => { setIdx(n); startRef.current = performance.now(); setProgress(0); };

  const post = posts[idx];
  const cat = window.CATEGORIES[post.cat];

  const isFramed = heroLayout === 'framed';

  return (
    <section className={`do-featured ${isFramed?'is-framed':'is-bleed'}`} aria-label="Featured posts">
      <div className="do-featured-inner">
        {/* vertical progress bar */}
        <div className="do-progress" aria-label="Auto-advance timer">
          <div className="do-progress-track"/>
          <div className="do-progress-fill" style={{height:`${progress*100}%`, background:cat.tint}}/>
          <div className="do-progress-label">
            <span>{String(idx+1).padStart(2,'0')}</span>
            <span className="do-progress-sep">/</span>
            <span>{String(posts.length).padStart(2,'0')}</span>
          </div>
        </div>

        {/* illustration */}
        <div className="do-featured-art" key={'art-'+idx}>
          <Illustration recipe={post.illustration} className="do-featured-svg" />
        </div>

        {/* text block */}
        <div className="do-featured-text" key={'txt-'+idx}>
          <div className="do-featured-meta">
            <CategoryTag catId={post.cat} size="lg"/>
            <span className="do-featured-read">{post.read} read · {fmtDate(post.date)}</span>
          </div>
          <h1 className="do-featured-title">{post.title}</h1>
          <p className="do-featured-excerpt">{post.excerpt}</p>
          <button className="do-featured-cta" onClick={()=>onOpen(post.slug)}>
            <span>Read the piece</span>
            <svg width="28" height="10" viewBox="0 0 28 10" fill="none"><path d="M0 5h26M22 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
        </div>

        {/* controls */}
        <div className="do-featured-controls">
          <button className="do-ctrl" onClick={()=>advance(-1)} aria-label="Previous">
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
          </button>
          <button className="do-ctrl" onClick={()=>setPaused(p=>!p)} aria-label={paused?'Play':'Pause'}>
            {paused
              ? <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 2v10l9-5z" fill="currentColor"/></svg>
              : <svg width="14" height="14" viewBox="0 0 14 14"><rect x="3" y="2" width="3" height="10" fill="currentColor"/><rect x="8" y="2" width="3" height="10" fill="currentColor"/></svg>}
          </button>
          <button className="do-ctrl" onClick={()=>advance(1)} aria-label="Next">
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
          </button>
          <div className="do-dots">
            {posts.map((_,i)=>(
              <button key={i} className={'do-dot '+(i===idx?'is-on':'')} onClick={()=>jumpTo(i)} aria-label={`Featured ${i+1}`}/>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ---------- ZONE 2: Grid ----------
const Card = ({ post, onOpen }) => {
  const c = window.CATEGORIES[post.cat];
  return (
    <a className="do-card" href={`#/post/${post.slug}`} onClick={(e)=>{e.preventDefault(); onOpen(post.slug);}}>
      <div className="do-card-thumb">
        <Illustration recipe={post.illustration} className="do-card-svg"/>
      </div>
      <div className="do-card-body">
        <div className="do-card-top">
          <CategoryTag catId={post.cat}/>
          <span className="do-card-date">{fmtDate(post.date)}</span>
        </div>
        <h3 className="do-card-title"><span>{post.title}</span></h3>
        <p className="do-card-excerpt">{post.excerpt}</p>
      </div>
    </a>
  );
};

const Grid = ({ posts, onOpen }) => {
  const [cat, setCat] = useState('all');
  const [aud, setAud] = useState('Everyone');

  const filtered = useMemo(()=> posts.filter(p => {
    const catOk = cat==='all' || p.cat===cat;
    const audOk = aud==='Everyone' || p.audience==='Everyone' || p.audience===aud;
    return catOk && audOk;
  }), [cat, aud, posts]);

  const categoriesList = [['all','All pieces'], ...Object.values(window.CATEGORIES).map(c=>[c.id, c.name])];

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
              {categoriesList.map(([id,name])=>(
                <button key={id} className={'do-chip '+(cat===id?'is-on':'')} onClick={()=>setCat(id)}>{name}</button>
              ))}
            </div>
          </div>
          <div className="do-filter-block">
            <div className="do-filter-label">Audience</div>
            <div className="do-filter-chips">
              {window.AUDIENCES.map(a=>(
                <button key={a} className={'do-chip '+(aud===a?'is-on':'')} onClick={()=>setAud(a)}>{a}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="do-grid">
        {filtered.map(p => <Card key={p.slug} post={p} onOpen={onOpen}/>)}
        {filtered.length===0 && (
          <div className="do-empty">Nothing here under that filter yet. Try widening it.</div>
        )}
      </div>
    </section>
  );
};

// ---------- ZONE 3: Footer ----------
const Footer = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const submit = (e) => { e.preventDefault(); if (email.includes('@')) setSent(true); };
  return (
    <footer className="do-footer">
      <div className="do-footer-grid">
        <div className="do-footer-about">
          <div className="do-footer-logo">Design Outcomes<span>.</span></div>
          <p>A weekly-updated portfolio of design leadership in practice — real work, real decisions, real thinking. Written by Leonardo De La Rocha, VP Product Design. No sponsors. No popovers. Just the work.</p>
        </div>
        <div className="do-footer-sub">
          <div className="do-footer-label">The weekly digest</div>
          {sent ? (
            <div className="do-footer-sent">In. Check your inbox Sunday morning.</div>
          ) : (
            <form className="do-footer-form" onSubmit={submit}>
              <input type="email" required placeholder="you@studio.com" value={email} onChange={e=>setEmail(e.target.value)}/>
              <button type="submit">Subscribe →</button>
            </form>
          )}
          <p className="do-footer-note">One email, Sunday. One link you will actually open. Unsubscribe with one click.</p>
        </div>
        <div className="do-footer-links">
          <div className="do-footer-label">Elsewhere</div>
          <ul>
            <li><a href="#">LinkedIn → in/ldlrocha</a></li>
            <li><a href="#">RSS feed</a></li>
            <li><a href="#">Say hello — leo@ldlr.design</a></li>
          </ul>
        </div>
      </div>
      <div className="do-footer-rule"/>
      <div className="do-footer-base">
        <span>© 2026 Leonardo De La Rocha · ldlr.design · Set in Newsreader & Instrument Sans.</span>
        <span>Issue 01 — week of April 13, 2026</span>
      </div>
    </footer>
  );
};

// ---------- Top nav ----------
const TopNav = ({ onHome }) => (
  <header className="do-nav">
    <a href="#/" className="do-nav-logo" onClick={(e)=>{e.preventDefault(); onHome();}}>
      <span className="do-nav-mark">DO</span>
      <span className="do-nav-wordmark">Design Outcomes</span>
    </a>
    <nav className="do-nav-links">
      <a href="#/">Index</a>
      <a href="#/">Archive</a>
      <a href="#/">About</a>
      <a href="#/">Subscribe</a>
    </nav>
    <div className="do-nav-meta">
      <span className="do-nav-issue">Issue 01</span>
      <span className="do-nav-dot"/>
      <span>Week of Apr 13</span>
    </div>
  </header>
);

// ---------- Landing ----------
const Landing = ({ onOpen, heroLayout }) => {
  const featured = window.FEATURED_SLUGS.map(s => window.POSTS.find(p=>p.slug===s)).filter(Boolean);
  return (
    <main className="do-page">
      <TopNav onHome={()=>{}}/>
      <Featured posts={featured} onOpen={onOpen} heroLayout={heroLayout}/>
      <Grid posts={window.POSTS} onOpen={onOpen}/>
      <Footer/>
    </main>
  );
};

window.Landing = Landing;
window.TopNav = TopNav;
window.CategoryTag = CategoryTag;
window.fmtDate = fmtDate;
