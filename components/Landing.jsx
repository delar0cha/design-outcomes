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

// ---------- Subscribe confirmation messages ----------
const CONFIRM_MSGS = [
  n => `${n}, your Sundays just got a standing reservation.`,
  n => `Noted, ${n}. The good kind of noted.`,
  n => `${n} is on the list. The one worth being on.`,
  n => `Sunday is officially looking forward to meeting you, ${n}.`,
  n => `Filed under good decisions, ${n}. See you this weekend.`,
  n => `Somewhere a notebook just wrote your name in the yes column, ${n}.`,
  n => `One thoughtful email, once a week. You've made worse commitments, ${n}.`,
  n => `Your future self will thank you, ${n}. Your current self can just say you're welcome.`,
  n => `The work ships Sunday. You're on it, ${n}.`,
  n => `${n} — you're in. No noise, no sponsors. Just the work.`,
];

const randomConfirm = (fullName) => {
  const first = fullName.trim().split(' ')[0] || 'Hey';
  return CONFIRM_MSGS[Math.floor(Math.random() * CONFIRM_MSGS.length)](first);
};

// ---------- Subscribe modal (portal to body) ----------
const SubscribeModal = ({ onClose }) => {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [confirmed, setConfirmed] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    if (nameRef.current) nameRef.current.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Subscription failed');
      setConfirmed(randomConfirm(name || 'Friend'));
    } catch (err) {
      setError(err.message || 'Something went sideways. Try again?');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="do-sub-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Subscribe">
      <div className="do-sub-modal" onClick={e => e.stopPropagation()}>
        <button className="do-sub-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        </button>

        {confirmed ? (
          <div className="do-sub-confirmed">
            <div className="do-sub-check">
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                <path d="M1 8l7 7L21 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="do-sub-confirmed-msg">{confirmed}</p>
            <p className="do-sub-confirmed-sub">Sunday mornings, in your inbox.</p>
            <button className="do-sub-done" onClick={onClose}>Close ↗</button>
          </div>
        ) : (
          <>
            <div className="do-sub-eyebrow">The weekly digest</div>
            <h2 className="do-sub-title">Design Outcomes<span className="do-sub-dot">.</span></h2>
            <p className="do-sub-desc">Real work. Real decisions. Real thinking — from someone doing the job, not talking about it. One email, every Sunday morning.</p>
            <form className="do-sub-form" onSubmit={submit}>
              <div className="do-sub-field">
                <label className="do-sub-label" htmlFor="sub-name">Your name</label>
                <input
                  id="sub-name"
                  ref={nameRef}
                  className="do-sub-input"
                  type="text"
                  placeholder="First name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="do-sub-field">
                <label className="do-sub-label" htmlFor="sub-email">Email address</label>
                <input
                  id="sub-email"
                  className="do-sub-input"
                  type="email"
                  placeholder="you@studio.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <button className="do-sub-submit" type="submit" disabled={loading}>
                <span>{loading ? 'Sending…' : 'Subscribe'}</span>
                {!loading && (
                  <svg width="20" height="8" viewBox="0 0 20 8" fill="none">
                    <path d="M0 4h18M15 1l3 3-3 3" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                )}
              </button>
            </form>
            {error && <p className="do-sub-error">{error}</p>}
            <p className="do-sub-note">No spam. No sponsors. Unsubscribe with one click.</p>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

// ---------- ZONE 1: Featured carousel ----------
const Featured = ({ posts, onOpen, heroLayout }) => {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
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
        <div className="do-progress" aria-label="Auto-advance timer">
          <div className="do-progress-track"/>
          <div className="do-progress-fill" style={{height:`${progress*100}%`, background:cat.tint}}/>
          <div className="do-progress-label">
            <span>{String(idx+1).padStart(2,'0')}</span>
            <span className="do-progress-sep">/</span>
            <span>{String(posts.length).padStart(2,'0')}</span>
          </div>
        </div>

        <div className="do-featured-art" key={'art-'+idx}>
          <Illustration recipe={post.illustration} className="do-featured-svg" />
        </div>

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
const Card = ({ post, onOpen }) => (
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
const Footer = ({ onSubscribe }) => {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [confirmed, setConfirmed] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setConfirmed(randomConfirm(name || 'Friend'));
  };

  return (
    <footer className="do-footer">
      <div className="do-footer-grid">
        <div className="do-footer-about">
          <div className="do-footer-logo">Design Outcomes<span>.</span></div>
          <p>A weekly-updated portfolio of design leadership in practice — real work, real decisions, real thinking. Written by Leonardo De La Rocha, VP Product Design. No sponsors. No popovers. Just the work.</p>
        </div>
        <div className="do-footer-sub">
          <div className="do-footer-label">The weekly digest</div>
          {confirmed ? (
            <div className="do-footer-sent">{confirmed}</div>
          ) : (
            <form className="do-footer-sub-form" onSubmit={submit}>
              <input
                className="do-footer-sub-input"
                type="text"
                placeholder="First name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <div className="do-footer-form">
                <input type="email" required placeholder="you@studio.com" value={email} onChange={e=>setEmail(e.target.value)}/>
                <button type="submit">Subscribe →</button>
              </div>
            </form>
          )}
          <p className="do-footer-note">One email, Sunday. One link you will actually open. Unsubscribe with one click.</p>
        </div>
        <div className="do-footer-links">
          <div className="do-footer-label">Elsewhere</div>
          <ul>
            <li><a href="https://www.linkedin.com/in/leonardodelarocha/" target="_blank" rel="noopener">LinkedIn → in/leonardodelarocha</a></li>
            <li><a href="#">RSS feed</a></li>
            <li><button className="do-footer-sub-link" onClick={onSubscribe}>Subscribe to the digest →</button></li>
          </ul>
        </div>
      </div>
      <div className="do-footer-rule"/>
      <div className="do-footer-base">
        <span>© 2026 Leonardo De La Rocha. Set in Newsreader &amp; Instrument Sans.</span>
        <span>Issue 48 — week of April 12, 2026</span>
      </div>
    </footer>
  );
};

// ---------- Top nav ----------
const TopNav = ({ onHome }) => {
  const [subOpen, setSubOpen] = useState(false);

  return (
    <>
      <header className="do-nav">
        <a href="#/" className="do-nav-logo" onClick={(e)=>{e.preventDefault(); onHome();}}>
          <span className="do-nav-mark">
        <svg width="34" height="34" viewBox="0 0 164.49 164.49" xmlns="http://www.w3.org/2000/svg">
          <rect width="164.49" height="164.49" rx="34.5" ry="34.5" fill="#15120E"/>
          <path fill="#fff" d="M41.94,110.4c7.51.27,15.03.39,22.81.07,10.45-.44,19.35-7.8,23.17-15.88,4.95-10.48,3.2-21.25-3.56-30.29,4.45-3.74,9.45-5.76,15.19-5.92,8.81,14.08,9.4,31.24,1.11,45.73-7.71,13.47-22.31,22.31-38.94,22.26l-35.45-.09V38.12s36.52.16,36.52.16c3.96.02,8.25.8,12.43,1.8-5.73,4.52-10.1,8.43-14.79,13.84l-18.48.12v56.36Z"/>
          <path fill="#fff" d="M101.67,110.68c13.03-1.13,23.6-10.41,26.14-22.43,2.84-13.4-4.05-25.87-14.9-31.3-12.55-6.28-26.73-2.48-34.67,7.42-8.52,10.62-8.53,24.75.04,35.88-4.34,3.47-9.01,5.39-14.92,6.15-11.86-17.89-8.88-41.29,6.23-55.91,15.39-14.89,39.5-16.57,56.83-3.67,16.96,12.63,22.76,35.81,13.28,54.83s-31.3,29.22-52.75,22.62c5.91-4.15,10.54-8.01,14.72-13.58Z"/>
        </svg>
      </span>
          <span className="do-nav-wordmark">Design Outcomes</span>
        </a>
        <nav className="do-nav-links">
          <a href="#/" onClick={(e)=>{e.preventDefault(); onHome();}}>Index</a>
          <a href="#/" onClick={(e)=>{e.preventDefault(); onHome();}}>Archive</a>
          <a href="#/about" onClick={(e)=>{e.preventDefault(); window.location.hash='#/about'; window.scrollTo({top:0,behavior:'instant'});}}>About</a>
          <button className="do-nav-sub-btn" onClick={() => setSubOpen(true)}>Subscribe</button>
        </nav>
        <div className="do-nav-meta">
          <span className="do-nav-issue">Issue 48</span>
          <span className="do-nav-dot"/>
          <span>Week of Apr 12</span>
        </div>
      </header>
      {subOpen && <SubscribeModal onClose={() => setSubOpen(false)} />}
    </>
  );
};

// ---------- Landing ----------
const Landing = ({ onOpen, heroLayout }) => {
  const [subOpen, setSubOpen] = useState(false);
  const featured = window.FEATURED_SLUGS.map(s => window.POSTS.find(p=>p.slug===s)).filter(Boolean);
  return (
    <main className="do-page">
      <TopNav onHome={()=>{}}/>
      <Featured posts={featured} onOpen={onOpen} heroLayout={heroLayout}/>
      <Grid posts={window.POSTS} onOpen={onOpen}/>
      <Footer onSubscribe={() => setSubOpen(true)}/>
      {subOpen && <SubscribeModal onClose={() => setSubOpen(false)} />}
    </main>
  );
};

window.Landing = Landing;
window.TopNav = TopNav;
window.CategoryTag = CategoryTag;
window.fmtDate = fmtDate;
