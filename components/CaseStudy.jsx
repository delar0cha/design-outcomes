// Case study page — hero → back → chips → title → share → body → share → slides.
const { useState, useEffect, useRef } = React;

// ── Flat share row ──
const CsShareRow = ({ title, url, topBar }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const li  = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const bsk = `https://bsky.app/intent/compose?text=${encodeURIComponent(title + '\n\n' + url)}`;
  const x   = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const fb  = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const thr = `https://www.threads.net/intent/post?text=${encodeURIComponent(title + '\n\n' + url)}`;
  return (
    <div className={`do-share-row${topBar ? ' do-share-row--top' : ''}`}>
      <span className="do-share-row-label">Share</span>
      <button className="do-share-row-copy" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
      <span className="do-share-row-sep" aria-hidden="true"/>
      <a className="do-share-row-link" href={li}  target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a className="do-share-row-link" href={bsk} target="_blank" rel="noopener noreferrer">Bluesky</a>
      <a className="do-share-row-link" href={x}   target="_blank" rel="noopener noreferrer">X</a>
      <a className="do-share-row-link" href={fb}  target="_blank" rel="noopener noreferrer">Facebook</a>
      <a className="do-share-row-link" href={thr} target="_blank" rel="noopener noreferrer">Threads</a>
    </div>
  );
};

const CaseStudy = ({ slug, onHome }) => {
  const cs = (window.CASE_STUDIES || []).find(c => c.slug === slug);
  const heroRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    if (!cs) return;
    const url = `${window.location.origin}/work/${cs.slug}`;
    const image = cs.slides?.[0]?.src
      ? `https://ldlr.design/${cs.slides[0].src.replace(/^\//, '')}`
      : 'https://ldlr.design/images/work-header.png';
    window.setMeta({ title: cs.title, description: cs.summary, image, url });
    return () => window.setMeta({
      title:       'Design Outcomes — Leonardo De La Rocha',
      description: 'Weekly design leadership writing by Leonardo De La Rocha, VP Product Design.',
      image:       'https://ldlr.design/images/work-header.png',
      url:         'https://ldlr.design/',
    });
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      if (!innerRef.current || !heroRef.current) return;
      const top = heroRef.current.getBoundingClientRect().top;
      innerRef.current.style.transform = `translateY(${top * 0.28}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [cs]);

  if (!cs) {
    return (
      <main className="do-page">
        <window.TopNav onHome={onHome} section="work"/>
        <div style={{padding:'120px 40px', textAlign:'center'}}>
          <h1>Not found.</h1>
          <a href="/work" onClick={(e)=>{e.preventDefault(); window.navigate('/work');}}>← Back to Design Work</a>
        </div>
      </main>
    );
  }

  const cat = window.PROJECT_CATS[cs.cat];
  const goWork = (e) => {
    e.preventDefault();
    window.navigate('/work');
  };

  const shareUrl = `${window.location.origin}/work/${cs.slug}`;

  return (
    <main className="do-page do-cs-page">
      <window.TopNav onHome={onHome} section="work"/>

      {/* ── Hero ── */}
      <div className="do-cs-hero" ref={heroRef}>
        <div className="do-cs-hero-inner" ref={innerRef}>
          <window.Illustration recipe={cs.illustration} className="do-cs-hero-svg"/>
        </div>
        <div className="do-cs-hero-fade"/>
      </div>

      {/* ── Article ── */}
      <article className="do-cs-article">

        {/* Back link */}
        <a className="do-cs-back" href="/work" onClick={goWork}>
          ← Design Work
        </a>

        {/* Chips */}
        <div className="do-cs-chips">
          <span className="do-cs-chip" style={{color: cat.tint}}>{cat.name}</span>
          <span className="do-cs-chip-sep">·</span>
          <span className="do-cs-chip">{cs.company}</span>
          <span className="do-cs-chip-sep">·</span>
          <span className="do-cs-chip">{cs.year}</span>
        </div>

        {/* Title + subtitle */}
        <h1 className="do-cs-title">{cs.title}</h1>
        {cs.subtitle && <p className="do-cs-subtitle">{cs.subtitle}</p>}

        {/* Summary */}
        {cs.summary && <p className="do-cs-summary">{cs.summary}</p>}

        {/* Top share row */}
        <CsShareRow title={cs.title} url={shareUrl} topBar/>

        {/* Divider */}
        <div className="do-cs-rule"/>

        {/* Body */}
        <div className="do-cs-body">
          {cs.body.map((block, i) => {
            if (block.type === 'h')     return <h2 key={i} className="do-cs-h2">{block.text}</h2>;
            if (block.type === 'p')     return <p  key={i}>{block.text}</p>;
            if (block.type === 'quote') return (
              <blockquote key={i}>
                <span className="do-quote-mark" aria-hidden="true">"</span>
                <span>{block.text}</span>
              </blockquote>
            );
            if (block.type === 'img')  return (
              <figure key={i} className="do-cs-figure">
                <img src={block.src} alt={block.caption || ''} className="do-cs-img" loading="lazy"/>
                {block.caption && <figcaption className="do-cs-figcaption">{block.caption}</figcaption>}
              </figure>
            );
            return null;
          })}
        </div>

        {/* Bottom share row */}
        <CsShareRow title={cs.title} url={shareUrl}/>

        {/* End rule */}
        <div className="do-cs-rule" style={{marginTop:'64px'}}/>

        {/* Slide deck */}
        {cs.slides && cs.slides.length > 0 && (
          <section className="do-cs-slides">
            <div className="do-eyebrow">Selected slides</div>
            <h2 className="do-cs-slides-head">From the 2026 Design Vision deck.</h2>
            <div className="do-cs-slides-grid">
              {cs.slides.map((slide, i) => (
                <figure key={i} className="do-cs-slide">
                  <img src={slide.src} alt={slide.caption} className="do-cs-slide-img" loading="lazy"/>
                  {slide.caption && <figcaption className="do-cs-slide-caption">{slide.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

      </article>

      <div style={{padding:'0 48px'}}><div className="do-footer-rule" style={{margin:'0'}}/></div>
    </main>
  );
};

window.CaseStudy = CaseStudy;
