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

  const filtered = useMemo(() => [...posts]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(p => {
      const catOk = cat === 'all' || p.cat === cat;
      const audOk = aud === 'Everyone' || p.audience === 'Everyone' || p.audience === aud;
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
  <svg width="34" height="38" viewBox="0 0 107.98 121.9" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="53.96" cy="60.95" rx="53.68" ry="61.18" transform="translate(-10.31 11) rotate(-10.63)" fill="#15120E"/>
    <path fill="#fff" d="M25.98,92.69v-1.08l3.57-1.43v-27.97l-3.57-1.43v-1.08h11.18v32.99h-11.18ZM52.74,75.78c0-4.51-1.11-7.82-3.32-9.91-2.22-2.09-5.25-3.14-9.11-3.14h-6.77l-.62-3.03h8.57c4.3,0,7.87.57,10.72,1.7s4.98,2.85,6.39,5.15,2.12,5.19,2.12,8.67c0,3.69-.84,6.84-2.51,9.44-1.67,2.6-3.96,4.59-6.86,5.97-2.9,1.38-6.17,2.07-9.81,2.07h-8.62l.62-3.03h7.21c2.4,0,4.49-.47,6.29-1.42s3.2-2.44,4.2-4.48c1-2.04,1.5-4.71,1.5-7.99Z"/>
    <path fill="#fff" d="M90.97,59.06c2.54,0,4.86.41,6.94,1.22,2.08.81,3.88,1.97,5.38,3.47,1.5,1.5,2.66,3.3,3.47,5.39s1.22,4.43,1.22,7-.43,4.87-1.29,6.97c-.86,2.1-2.08,3.91-3.66,5.44s-3.44,2.7-5.6,3.53-4.53,1.24-7.13,1.24-4.86-.41-6.94-1.22c-2.08-.81-3.88-1.97-5.38-3.47s-2.66-3.3-3.47-5.4c-.81-2.1-1.22-4.43-1.22-6.99s.43-4.87,1.29-6.97c.86-2.1,2.08-3.91,3.66-5.44,1.58-1.53,3.44-2.7,5.6-3.53,2.16-.83,4.53-1.24,7.13-1.24ZM90.87,90.08c1.79,0,3.37-.46,4.75-1.37,1.38-.91,2.46-2.29,3.24-4.15.78-1.85,1.17-4.17,1.17-6.94,0-3.4-.41-6.23-1.23-8.49-.82-2.27-1.95-3.97-3.4-5.11-1.44-1.14-3.11-1.71-5-1.71-1.79,0-3.37.46-4.75,1.37-1.38.91-2.46,2.29-3.24,4.14-.78,1.85-1.17,4.16-1.17,6.95,0,3.38.41,6.21,1.22,8.48.81,2.27,1.95,3.98,3.41,5.12,1.46,1.14,3.13,1.71,5,1.71Z"/>
    <path fill="#fff" d="M66.05,105.33c1.56,0,3.11-.08,4.64-.25s3.1-.46,4.69-.89c1.59-.43,3.27-1.04,5.02-1.83,1.76-.8,3.65-1.82,5.69-3.07l.86,1.21c-2.2,1.79-4.19,3.27-5.96,4.44-1.77,1.17-3.45,2.1-5.03,2.77-1.58.67-3.17,1.15-4.76,1.43-1.59.28-3.31.42-5.15.42s-3.53-.14-5.12-.42c-1.59-.28-3.18-.76-4.76-1.43-1.58-.67-3.26-1.6-5.03-2.77-1.77-1.17-3.76-2.66-5.96-4.44l.86-1.21c2.02,1.25,3.91,2.27,5.67,3.07,1.76.8,3.44,1.41,5.03,1.83,1.59.43,3.15.72,4.68.89s3.07.25,4.63.25Z"/>
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
      <p className="do-editorial-banner-body">This is a weekly editorial about design leadership as it actually happens, drawn from real conversations, real decisions, and real artifacts produced while leading a product design org at a hyper-growth-stage SaaS company. No keynote polish, no LinkedIn compression. The cross-functional Slack thread, the hiring debrief, the org design conversation, the moment in crit where the feedback is really about a structural problem three levels up. Nothing here is manufactured. The constraint is authenticity, and the rhythm is weekly.</p>
    </div>
  </div>
);

// ---------- Landing ----------
const Landing = ({ onOpen, heroLayout }) => {
  const [subOpen, setSubOpen] = useState(false);
  // Always show the 4 most-recently-dated posts in the carousel, newest first
  const featured = [...window.POSTS]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);
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
