// Individual post page. Full-bleed illustration → meta → title → body → related.
const Post = ({ slug, onOpen, onHome }) => {
  const post = window.POSTS.find(p => p.slug === slug);
  if (!post) {
    return (
      <main className="do-page">
        <window.TopNav onHome={onHome}/>
        <div style={{padding:'120px 40px', textAlign:'center'}}>
          <h1>Not found.</h1>
          <a href="#/" onClick={(e)=>{e.preventDefault(); onHome();}}>Back to the index →</a>
        </div>
      </main>
    );
  }
  const cat = window.CATEGORIES[post.cat];

  // Related: same category, then adjacent (exclude self), up to 3.
  const related = (() => {
    const sameCat = window.POSTS.filter(p => p.cat===post.cat && p.slug !== post.slug);
    const adjacent = window.POSTS.filter(p => p.cat !== post.cat && p.audience === post.audience);
    return [...sameCat, ...adjacent].slice(0,3);
  })();

  return (
    <main className="do-page do-post-page">
      <window.TopNav onHome={onHome}/>

      {/* full-bleed illustration */}
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
          <div className="do-post-byline-avatar" aria-hidden="true">LD</div>
          <div>
            <div className="do-post-byline-name">Leonardo De La Rocha</div>
            <div className="do-post-byline-sub">VP Product Design · Published {window.fmtDate(post.date)}</div>
          </div>
          <div className="do-post-byline-right">
            <button className="do-post-ghost">Save</button>
            <button className="do-post-ghost">Share</button>
          </div>
        </div>

        <div className="do-post-body">
          {post.body.map((block, i) => {
            if (block.type==='p') return <p key={i}>{block.text}</p>;
            if (block.type==='h') return <h2 key={i}>{block.text}</h2>;
            if (block.type==='quote') return (
              <blockquote key={i}>
                <span className="do-quote-mark" aria-hidden="true">“</span>
                <span>{block.text}</span>
              </blockquote>
            );
            return null;
          })}
          {/* If body is a stub, show a tasteful note */}
          {post.body.length <= 1 && (
            <div className="do-stub">
              <div className="do-stub-rule"/>
              <p>The rest of this piece will ship in the live build. Sample content for the page template is shown on <a href="#/post/managers-are-not-the-customer" onClick={(e)=>{e.preventDefault(); onOpen('managers-are-not-the-customer');}}>“Your manager is not the customer.”</a></p>
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
