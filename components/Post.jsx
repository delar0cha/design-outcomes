// Individual post page. Full-bleed illustration → meta → title → body → share → related.
const { useState, useEffect, useRef } = React;


// ── Flat share row ──
const ShareRow = ({ title, url, topBar }) => {
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

// ── Post page ──
const Post = ({ slug, onOpen, onHome }) => {
  const post = window.POSTS.find(p => p.slug === slug);
  const heroRef  = useRef(null);
  const innerRef = useRef(null);
  window.useParallax(heroRef, innerRef);

  useEffect(() => {
    if (!post) return;
    const url = `${window.location.origin}/post/${post.slug}`;
    window.setMeta({
      title:       post.title,
      description: post.excerpt,
      image:       'https://ldlr.design/images/work-header.png',
      url,
    });
    return () => window.setMeta({
      title:       'Design Outcomes — Leonardo De La Rocha',
      description: 'Weekly design leadership writing by Leonardo De La Rocha, VP Product Design.',
      image:       'https://ldlr.design/images/work-header.png',
      url:         'https://ldlr.design/',
    });
  }, [slug]);

  if (!post) {
    return (
      <main className="do-page">
        <window.TopNav onHome={onHome} section="writeups"/>
        <div style={{padding:'120px 40px', textAlign:'center'}}>
          <h1>Not found.</h1>
          <a href="/" onClick={(e)=>{e.preventDefault(); onHome();}}>Back to the index →</a>
        </div>
      </main>
    );
  }
  const cat = window.CATEGORIES[post.cat];

  const related = (() => {
    const others  = window.POSTS.filter(p => p.slug !== post.slug);
    const sameCat = others.filter(p => p.cat === post.cat);
    const rest    = others.filter(p => p.cat !== post.cat);
    return [...sameCat, ...rest].slice(0, 3);
  })();

  const pageUrl = `${window.location.origin}/post/${post.slug}`;

  return (
    <main className="do-page do-post-page">
      <window.TopNav onHome={onHome} section="writeups"/>

      <div className="do-post-hero" ref={heroRef}>
        <div className="do-post-hero-inner" ref={innerRef}>
          <window.Illustration recipe={post.illustration} className="do-post-hero-svg"/>
        </div>
        <div className="do-post-hero-fade"/>
      </div>

      <article className="do-post">
        <div className="do-post-meta">
          <window.CategoryTag catId={post.cat} size="lg"/>
          <span className="do-post-sep">·</span>
          <span>{post.read} read</span>
        </div>

        <h1 className="do-post-title">{post.title}</h1>
        <p className="do-post-why"><span className="do-post-why-label">Why this matters — </span>{post.why}</p>

        <div className="do-post-byline">
          <div className="do-post-byline-avatar" aria-hidden="true">LR</div>
          <div>
            <div className="do-post-byline-name">Leonardo De La Rocha</div>
            <div className="do-post-byline-sub">VP Product Design · Published {window.fmtDate(post.date)}</div>
          </div>
        </div>

        <ShareRow title={post.title} url={pageUrl} topBar/>

        <div className="do-post-body">
          {post.body.map((block, i) => {
            if (block.type==='p') return <p key={i}>{block.text}</p>;
            if (block.type==='h') return <h2 key={i}>{block.text}</h2>;
            if (block.type==='quote') return (
              <blockquote key={i}>
                <span className="do-quote-mark" aria-hidden="true">"</span>
                <span>{block.text}</span>
              </blockquote>
            );
            return null;
          })}
          {post.body.length <= 1 && (
            <div className="do-stub">
              <div className="do-stub-rule"/>
              <p>The rest of this piece will ship in the live build. In the meantime, read <a href="/post/building-design-outcomes" onClick={(e)=>{e.preventDefault(); onOpen('building-design-outcomes');}}>"Building Design Outcomes"</a>, which lays out how the site was made.</p>
            </div>
          )}
        </div>

        <ShareRow title={post.title} url={pageUrl}/>

        <div className="do-post-end">
          <div className="do-post-end-rule"/>
          <div className="do-post-end-row">
            <span>Filed under</span>
            <window.CategoryTag catId={post.cat}/>
            <span className="do-post-end-sub">— {cat.sub}</span>
          </div>
        </div>
      </article>

      <section className="do-related">
        <div className="do-related-head">
          <div className="do-eyebrow">Read next</div>
          <h2>Three more pieces, chosen for you.</h2>
        </div>
        <div className="do-related-grid">
          {related.map(p => (
            <a key={p.slug} className="do-card" href={`/post/${p.slug}`} onClick={(e)=>{e.preventDefault(); onOpen(p.slug);}}>
              <div className="do-card-thumb"><window.Illustration recipe={p.illustration} className="do-card-svg"/></div>
              <div className="do-card-body">
                <div className="do-card-top">
                  <window.CategoryTag catId={p.cat}/>
                  <span className="do-card-date">{window.fmtDate(p.date)}</span>
                </div>
                <h3 className="do-card-title"><span>{p.title}</span></h3>
                <p className="do-card-excerpt">{p.excerpt}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <window.SiteFooter/>
    </main>
  );
};

window.Post = Post;
