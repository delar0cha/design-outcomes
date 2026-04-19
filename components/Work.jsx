// Design Work landing page — portfolio grid with category filters
const { useState, useEffect, useRef } = React;

const WorkCard = ({ project: p }) => {
  const cat = window.PROJECT_CATS[p.cat];
  const isLive = p.status === 'live';
  return (
    <div className={`do-wk-card${isLive ? ' is-live' : ''}`}>
      {isLive
        ? <a className="do-wk-card-thumb" href={`/work/${p.slug}`} onClick={(e)=>{e.preventDefault(); window.navigate(`/work/${p.slug}`);}}>
            <window.Illustration recipe={p.illustration} className="do-wk-card-svg"/>
          </a>
        : <div className="do-wk-card-thumb">
            <window.Illustration recipe={p.illustration} className="do-wk-card-svg"/>
          </div>}
      <div className="do-wk-card-body">
        <div className="do-wk-card-top">
          <span className="do-wk-cat" style={{color: cat.tint}}>{cat.name}</span>
          <span className="do-wk-year">{p.year}</span>
        </div>
        <div className="do-wk-card-co">{p.company}</div>
        <h3 className="do-wk-card-title">{p.title}</h3>
        <p className="do-wk-card-excerpt">{p.excerpt}</p>
        <div className="do-wk-card-cta">
          {isLive
            ? <a className="do-wk-read" href={`/work/${p.slug}`} onClick={(e)=>{e.preventDefault(); window.navigate(`/work/${p.slug}`);}}>View case study →</a>
            : <span className="do-wk-soon">Case study in progress</span>}
        </div>
      </div>
    </div>
  );
};

const Work = ({ onHome }) => {
  const [filter, setFilter] = useState('all');
  const heroRef = useRef(null);
  const imgRef  = useRef(null);

  // Parallax: image scrolls at 30% of page speed
  useEffect(() => {
    const onScroll = () => {
      if (!imgRef.current || !heroRef.current) return;
      const top = heroRef.current.getBoundingClientRect().top;
      imgRef.current.style.transform = `translateY(${top * 0.28}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const cats = Object.values(window.PROJECT_CATS);
  const visible = filter === 'all'
    ? window.PROJECTS
    : window.PROJECTS.filter(p => p.cat === filter);

  return (
    <main className="do-page do-wk-page">
      <window.TopNav onHome={onHome} section="work"/>

      {/* ── Hero ── */}
      <div className="do-wk-hero" ref={heroRef}>
        <img
          ref={imgRef}
          src="/images/work-header.png"
          alt="Leonardo De La Rocha"
          className="do-wk-hero-img"
        />
        <div className="do-wk-hero-vignette"/>
      </div>

      {/* ── Page sub-header ── */}
      <header className="do-wk-header">
        <div className="do-wk-header-inner">
          <div className="do-eyebrow">Selected work</div>
          <p className="do-wk-sub">Thirty years of design — brand identity, product systems, creative direction, and hands-on making. By Leonardo De La Rocha: Dad, Mental Health Champion, Mentor, Design Leader, and Advisor.</p>
        </div>
      </header>

      {/* ── Filter bar ── */}
      <div className="do-wk-filters">
        <div className="do-wk-filters-inner">
          <button
            className={`do-wk-filter${filter === 'all' ? ' is-on' : ''}`}
            onClick={() => setFilter('all')}>
            All work
          </button>
          {cats.map(c => (
            <button
              key={c.id}
              className={`do-wk-filter${filter === c.id ? ' is-on' : ''}`}
              onClick={() => setFilter(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Project grid ── */}
      <div className="do-wk-grid-wrap">
        <div className="do-wk-grid">
          {visible.map(p => <WorkCard key={p.slug} project={p}/>)}
        </div>
      </div>

      <window.SiteFooter/>
    </main>
  );
};

window.Work = Work;
