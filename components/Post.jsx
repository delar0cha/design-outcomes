// Individual post page. Full-bleed illustration → meta → title → body → related.
const { useState, useEffect, useRef } = React;

// ── Platform icons ──
const IconLinkedIn = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.063 2.063 0 110-4.126 2.063 2.063 0 010 4.126zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);
const IconInstagram = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const IconBluesky = () => (
  <svg width="16" height="14" viewBox="0 0 568 501" fill="currentColor" aria-hidden="true">
    <path d="M123.121 33.664C188.06 81.48 257.369 176.656 284 220.793c26.631-44.137 95.94-139.313 160.879-187.129C491.866-6.428 568-23.014 568 63.996c0 16.804-9.63 141.219-15.288 161.458-19.658 70.226-91.243 88.142-154.898 77.321 111.357 18.949 139.721 81.741 78.522 144.533-116.204 119.301-166.956-29.918-180.022-68.12-2.387-7.006-3.501-10.281-3.518-7.496-.016-2.785-1.131.49-3.518 7.496-13.066 38.202-63.818 187.421-180.022 68.12-61.199-62.792-32.835-125.584 78.522-144.533-63.655 10.821-135.24-7.095-154.898-77.321C13.63 205.215 4 80.8 4 63.996c0-87.01 73.734-70.424 119.121-30.332z"/>
  </svg>
);
const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IconChevron = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconSpinner = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{animation:'do-spin 0.7s linear infinite', flexShrink:0}} aria-hidden="true">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

// ── Canvas capture: serialise the hero SVG → 1200×630 PNG blob ──
const captureHero = async () => {
  const svgEl = document.querySelector('.do-post-hero-svg');
  if (!svgEl) return null;
  try {
    const serializer = new XMLSerializer();
    // Serialise DOM SVG (already has xmlns from JSX render)
    let src = serializer.serializeToString(svgEl);
    // Ensure xmlns is present
    if (!src.includes('xmlns='))
      src = src.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    // Replace any CSS-only width/height with explicit pixel values.
    // The viewBox is "0 0 1200 800" and preserveAspectRatio="xMidYMid slice",
    // so setting 1200×630 crops the illustration to a standard OG image size.
    src = src.replace(/^(<svg\b)([^>]*)>/, (_, tag, attrs) => {
      const cleaned = attrs
        .replace(/\s+width="[^"]*"/g, '')
        .replace(/\s+height="[^"]*"/g, '');
      return `${tag}${cleaned} width="1200" height="630">`;
    });
    const svgBlob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl  = URL.createObjectURL(svgBlob);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = svgUrl; });
    URL.revokeObjectURL(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 630;
    canvas.getContext('2d').drawImage(img, 0, 0, 1200, 630);
    return new Promise(res => canvas.toBlob(res, 'image/png'));
  } catch (e) { return null; }
};

const downloadBlob = (blob, slug) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug}.png`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
};

// ── Share dropdown ──
const ShareButton = ({ post }) => {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(null); // 'linkedin' | 'instagram' | 'bluesky'
  const [copied, setCopied]   = useState(false);
  const wrapRef = useRef(null);

  const pageUrl = `${window.location.origin}${window.location.pathname}#/post/${post.slug}`;

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onKey  = e => { if (e.key === 'Escape') setOpen(false); };
    const onDown = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  const shareLinkedIn = async () => {
    // Open share window right away; capture + download image alongside
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
      '_blank', 'width=620,height=540,noopener,noreferrer'
    );
    setLoading('linkedin');
    const img = await captureHero();
    setLoading(null); setOpen(false);
    if (img) downloadBlob(img, post.slug);
  };

  const shareBluesky = async () => {
    const text = `${post.title}\n\n${pageUrl}`;
    window.open(
      `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`,
      '_blank', 'width=620,height=540,noopener,noreferrer'
    );
    setLoading('bluesky');
    const img = await captureHero();
    setLoading(null); setOpen(false);
    if (img) downloadBlob(img, post.slug);
  };

  const shareInstagram = async () => {
    setLoading('instagram');
    const img = await captureHero();
    setLoading(null);

    if (img) {
      const file = new File([img], `${post.slug}.png`, { type: 'image/png' });
      // Mobile: Web Share API with image (iOS Safari, Android Chrome)
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: post.title, url: pageUrl });
          setOpen(false); return;
        } catch (e) { /* user cancelled — fall through to download */ }
      }
      // Desktop: download the image
      downloadBlob(img, post.slug);
    }
    // Also copy the URL
    if (navigator.clipboard) navigator.clipboard.writeText(pageUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 2600);
  };

  const isLoading = !!loading;
  const hint = {
    linkedin:  loading === 'linkedin'  ? 'Rendering image…' : 'Opens post · image downloads to attach',
    instagram: loading === 'instagram' ? 'Rendering image…' : copied ? 'Image downloaded · link copied' : 'Shares image via device',
    bluesky:   loading === 'bluesky'   ? 'Rendering image…' : 'Opens compose · image downloads to attach',
  };

  return (
    <div className="do-share-wrap" ref={wrapRef}>
      <button
        className={`do-share-btn${open ? ' is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <IconShare/>
        Share
        <span className={`do-share-chevron${open ? ' is-open' : ''}`}><IconChevron/></span>
      </button>

      {open && (
        <div className="do-share-menu" role="menu">
          <button className="do-share-item" onClick={shareLinkedIn} disabled={isLoading} role="menuitem">
            {loading === 'linkedin' ? <IconSpinner/> : <IconLinkedIn/>}
            <span className="do-share-item-text">
              LinkedIn
              <span className="do-share-hint">{hint.linkedin}</span>
            </span>
          </button>
          <button className="do-share-item" onClick={shareInstagram} disabled={isLoading} role="menuitem">
            {loading === 'instagram' ? <IconSpinner/> : <IconInstagram/>}
            <span className="do-share-item-text">
              {copied ? 'Done!' : 'Instagram'}
              <span className="do-share-hint">{hint.instagram}</span>
            </span>
          </button>
          <button className="do-share-item" onClick={shareBluesky} disabled={isLoading} role="menuitem">
            {loading === 'bluesky' ? <IconSpinner/> : <IconBluesky/>}
            <span className="do-share-item-text">
              Bluesky
              <span className="do-share-hint">{hint.bluesky}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

// ── Post page ──
const Post = ({ slug, onOpen, onHome }) => {
  const post = window.POSTS.find(p => p.slug === slug);
  if (!post) {
    return (
      <main className="do-page">
        <window.TopNav onHome={onHome} section="writeups"/>
        <div style={{padding:'120px 40px', textAlign:'center'}}>
          <h1>Not found.</h1>
          <a href="#/" onClick={(e)=>{e.preventDefault(); onHome();}}>Back to the index →</a>
        </div>
      </main>
    );
  }
  const cat = window.CATEGORIES[post.cat];

  const related = (() => {
    const sameCat  = window.POSTS.filter(p => p.cat===post.cat && p.slug !== post.slug);
    const adjacent = window.POSTS.filter(p => p.cat !== post.cat && p.audience === post.audience);
    return [...sameCat, ...adjacent].slice(0,3);
  })();

  return (
    <main className="do-page do-post-page">
      <window.TopNav onHome={onHome} section="writeups"/>

      <div className="do-post-hero">
        <window.Illustration recipe={post.illustration} className="do-post-hero-svg"/>
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
          <div className="do-post-byline-right">
            <ShareButton post={post}/>
          </div>
        </div>

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
              <p>The rest of this piece will ship in the live build. In the meantime, read <a href="#/post/building-design-outcomes" onClick={(e)=>{e.preventDefault(); onOpen('building-design-outcomes');}}>"Building Design Outcomes"</a>, which lays out how the site was made.</p>
            </div>
          )}
        </div>

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
            <a key={p.slug} className="do-card" href={`#/post/${p.slug}`} onClick={(e)=>{e.preventDefault(); onOpen(p.slug);}}>
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

      <div style={{padding:'0 48px'}}><div className="do-footer-rule" style={{margin:'0'}}/></div>
    </main>
  );
};

window.Post = Post;
