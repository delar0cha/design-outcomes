// Case study page — hero → back → chips → title → body → slides.
const { useState } = React;

const CaseStudy = ({ slug, onHome }) => {
  const cs = (window.CASE_STUDIES || []).find(c => c.slug === slug);

  if (!cs) {
    return (
      <main className="do-page">
        <window.TopNav onHome={onHome} section="work"/>
        <div style={{padding:'120px 40px', textAlign:'center'}}>
          <h1>Not found.</h1>
          <a href="#/work" onClick={(e)=>{e.preventDefault(); window.location.hash='/work'; window.scrollTo({top:0,behavior:'instant'});}}>← Back to Design Work</a>
        </div>
      </main>
    );
  }

  const cat = window.PROJECT_CATS[cs.cat];
  const goWork = (e) => {
    e.preventDefault();
    window.location.hash = '/work';
    window.scrollTo({top:0, behavior:'instant'});
  };

  return (
    <main className="do-page do-cs-page">
      <window.TopNav onHome={onHome} section="work"/>

      {/* ── Hero ── */}
      <div className="do-cs-hero">
        <window.Illustration recipe={cs.illustration} className="do-cs-hero-svg"/>
        <div className="do-cs-hero-fade"/>
      </div>

      {/* ── Article ── */}
      <article className="do-cs-article">

        {/* Back link */}
        <a className="do-cs-back" href="#/work" onClick={goWork}>
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
            return null;
          })}
        </div>

        {/* End rule */}
        <div className="do-cs-rule" style={{marginTop:'64px'}}/>

        {/* Selected slides */}
        <section className="do-cs-slides">
          <div className="do-eyebrow">Selected slides</div>
          <h2 className="do-cs-slides-head">From the 2026 Design Vision deck.</h2>
          <div className="do-cs-slides-grid">
            {Array.from({length:4}).map((_,i) => (
              <div key={i} className="do-cs-slide-placeholder">
                <div className="do-cs-slide-inner"/>
              </div>
            ))}
          </div>
          <p className="do-cs-slides-note">Slide images coming soon.</p>
        </section>

      </article>

      <div style={{padding:'0 48px'}}><div className="do-footer-rule" style={{margin:'0'}}/></div>
    </main>
  );
};

window.CaseStudy = CaseStudy;
