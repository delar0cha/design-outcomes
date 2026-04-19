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
  const DUR = 8000;

  // Auto-advance: CSS animation handles the visual; timeout handles the tick
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIdx(i => (i+1) % posts.length), DUR);
    return () => clearTimeout(t);
  }, [idx, paused, posts.length]);

  const advance = (n) => setIdx(i => (i+n+posts.length) % posts.length);
  const jumpTo  = (n) => setIdx(n);

  const post = posts[idx];
  const cat = window.CATEGORIES[post.cat];

  const isFramed = heroLayout === 'framed';

  return (
    <section className={`do-featured ${isFramed?'is-framed':'is-bleed'}`} aria-label="Featured posts">
      <div className="do-featured-inner">
        {/* vertical progress bar — no numbers, CSS-animated */}
        <div className="do-progress" aria-label="Auto-advance timer">
          <div className="do-progress-track"/>
          <div
            key={`fill-${idx}`}
            className="do-progress-fill"
            style={{
              background: cat.tint,
              animationDuration: `${DUR}ms`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
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
    <a className="do-card" href={`/post/${post.slug}`} onClick={(e)=>{e.preventDefault(); onOpen(post.slug);}}>
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

// ---------- Subscribe modal confirmation messages ----------
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

// ---------- ZONE 3: Footer — delegated to shared window.SiteFooter ----------

// ---------- Top nav ----------
const NAV_SVG = (
  <svg width="34" height="34" viewBox="0 0 164.49 164.49" xmlns="http://www.w3.org/2000/svg">
    <rect width="164.49" height="164.49" rx="34.5" ry="34.5" fill="#15120E"/>
    <path fill="#fff" d="M24.43,110.94v-1.71l6.6-2.31v-49.34l-6.6-2.31v-1.71h15.42v57.39h-15.42ZM72.57,81.47c0-8.02-2.33-13.95-6.98-17.78-4.65-3.83-11.02-5.74-19.1-5.74h-11.56l-.34-4.41h13.96c7.48,0,13.7.99,18.65,2.96,4.95,1.97,8.66,4.95,11.11,8.95,2.46,4,3.68,9.02,3.68,15.08,0,6.42-1.46,11.9-4.37,16.43-2.91,4.53-6.89,7.99-11.93,10.39-5.04,2.4-10.73,3.6-17.07,3.6h-14.05l.34-4.41h12.42c5.05,0,9.47-.86,13.26-2.57,3.78-1.71,6.72-4.41,8.82-8.1,2.1-3.68,3.15-8.48,3.15-14.39Z"/>
    <path fill="#fff" d="M111.1,52.6c4.25,0,8.14.71,11.67,2.14,3.53,1.43,6.58,3.45,9.17,6.06,2.58,2.61,4.58,5.73,6,9.36,1.41,3.63,2.12,7.62,2.12,11.99s-.71,8.37-2.14,11.99c-1.43,3.63-3.46,6.77-6.08,9.42-2.63,2.66-5.72,4.7-9.27,6.15s-7.46,2.16-11.71,2.16-8.15-.71-11.69-2.14c-3.54-1.43-6.6-3.45-9.19-6.06-2.58-2.61-4.58-5.73-6-9.36-1.41-3.63-2.12-7.62-2.12-11.99s.71-8.37,2.14-11.99c1.43-3.63,3.45-6.77,6.08-9.42,2.63-2.66,5.72-4.7,9.29-6.15,3.57-1.44,7.48-2.16,11.74-2.16ZM111.36,107.43c3.91,0,7.31-.93,10.19-2.81,2.88-1.87,5.12-4.56,6.7-8.07,1.58-3.51,2.38-7.72,2.38-12.64,0-5.77-.86-10.64-2.57-14.63-1.71-3.98-4.08-7.02-7.09-9.1-3.01-2.08-6.47-3.13-10.39-3.13s-7.32.94-10.22,2.81c-2.9,1.87-5.14,4.56-6.72,8.07-1.58,3.51-2.38,7.72-2.38,12.64,0,5.74.86,10.61,2.57,14.61,1.71,4,4.08,7.04,7.11,9.12,3.03,2.08,6.5,3.13,10.41,3.13Z"/>
  </svg>
);

const TopNav = ({ onHome, section = '' }) => {
  const [subOpen, setSubOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (path) => (e) => {
    e.preventDefault();
    setMenuOpen(false);
    window.navigate(path);
  };
  const active = (s) => section === s ? 'is-active' : '';
  const openSub = () => { setMenuOpen(false); setSubOpen(true); };

  return (
    <>
      <div className="do-nav-wrap">
        <header className="do-nav">
          <a href="/" className="do-nav-logo" onClick={go('/')}>
            <span className="do-nav-mark">{NAV_SVG}</span>
            <span className="do-nav-wordmark">Design Outcomes</span>
          </a>
          <nav className="do-nav-links">
            <a href="/" className={active('writeups')} onClick={go('/')}>Write-ups</a>
            <a href="/work" className={active('work')} onClick={go('/work')}>Design Work</a>
            <a href="/about" className={active('about')} onClick={go('/about')}>About</a>
            <button className="do-nav-sub-btn" onClick={openSub}>Subscribe</button>
          </nav>
          <div className="do-nav-meta">
            <span className="do-nav-issue">Issue 01</span>
            <span className="do-nav-dot"/>
            <span>Week of Apr 13</span>
          </div>
          <button
            className="do-nav-hamburger"
            onClick={() => setMenuOpen(m => !m)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen
              ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              : <svg width="20" height="14" viewBox="0 0 20 14" fill="none"><path d="M0 1h20M0 7h20M0 13h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            }
          </button>
        </header>

        {menuOpen && (
          <nav className="do-mobile-menu" aria-label="Site navigation">
            <a href="/" className={`do-mobile-link${section==='writeups'?' is-active':''}`} onClick={go('/')}>Write-ups</a>
            <a href="/work" className={`do-mobile-link${section==='work'?' is-active':''}`} onClick={go('/work')}>Design Work</a>
            <a href="/about" className={`do-mobile-link${section==='about'?' is-active':''}`} onClick={go('/about')}>About</a>
            <button className="do-mobile-link do-mobile-sub" onClick={openSub}>Subscribe →</button>
          </nav>
        )}
      </div>
      {subOpen && <SubscribeModal onClose={() => setSubOpen(false)} />}
    </>
  );
};

// ---------- Editorial statement banner (homepage only) ----------
const EditorialBanner = () => (
  <div className="do-editorial-banner">
    <div className="do-editorial-banner-inner">
      <span className="do-editorial-banner-label">Design Outcomes</span>
      <p className="do-editorial-banner-body">Design Outcomes is a weekly editorial site about design leadership as it actually happens, drawn from real conversations, real decisions, and real artifacts produced while leading a 30-person design organization at a growth-stage SaaS company. No keynote polish, no LinkedIn compression. The cross-functional Slack thread, the hiring debrief, the org design conversation, the moment in crit where the feedback is really about a structural problem three levels up. Nothing here is manufactured. The constraint is authenticity, and the rhythm is weekly.</p>
    </div>
  </div>
);

// ---------- Landing ----------
const Landing = ({ onOpen, heroLayout }) => {
  const [subOpen, setSubOpen] = useState(false);
  const featured = window.FEATURED_SLUGS.map(s => window.POSTS.find(p=>p.slug===s)).filter(Boolean);
  return (
    <main className="do-page">
      <TopNav onHome={()=>{}} section="writeups"/>
      <EditorialBanner/>
      <Featured posts={featured} onOpen={onOpen} heroLayout={heroLayout}/>
      <Grid posts={window.POSTS} onOpen={onOpen}/>
      <window.SiteFooter/>
      {subOpen && <SubscribeModal onClose={() => setSubOpen(false)} />}
    </main>
  );
};

window.Landing = Landing;
window.TopNav = TopNav;
window.CategoryTag = CategoryTag;
window.fmtDate = fmtDate;
