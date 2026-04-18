// About page — isometric hero + three sections
const { useState, useEffect, useRef } = React;

const About = ({ onHome }) => {
  const heroRef  = useRef(null);
  const innerRef = useRef(null);
  const rafRef   = useRef(null);
  const lightRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const driftRef = useRef(0);
  const svgRef   = useRef(null);
  const [lightPos, setLightPos] = useState({ x: 0.5, y: 0.5 });
  const isMobile = useRef(typeof window !== 'undefined' && window.matchMedia('(hover:none)').matches);

  // ── Parallax ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (!innerRef.current || !heroRef.current) return;
      const top = heroRef.current.getBoundingClientRect().top;
      innerRef.current.style.transform = `translateY(${top * 0.28}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Cursor light + mobile drift ───────────────────────────────────────────
  useEffect(() => {
    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = (ts) => {
      const L = lightRef.current;
      if (isMobile.current) {
        driftRef.current = ts * 0.0004;
        L.tx = 0.5 + Math.sin(driftRef.current) * 0.28;
        L.ty = 0.5 + Math.sin(driftRef.current * 0.7) * 0.18;
      }
      L.x = lerp(L.x, L.tx, 0.06);
      L.y = lerp(L.y, L.ty, 0.06);
      setLightPos({ x: L.x, y: L.y });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onMove = (e) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      lightRef.current.tx = (e.clientX - rect.left) / rect.width;
      lightRef.current.ty = (e.clientY - rect.top)  / rect.height;
    };
    if (!isMobile.current) window.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  // ── Isometric grid geometry ───────────────────────────────────────────────
  const COLS = 8, ROWS = 6;
  // Isometric unit: tile width = 2u, height = u, depth drawn as u
  const U = 36; // half-tile unit in px
  const TW = U * 2, TH = U; // tile face width/height in iso projection
  const svgW = (COLS + ROWS) * U * 2;
  const svgH = (COLS + ROWS) * U + U * 8; // extra room for tallest blocks

  // Heights for each cell (in units)
  const HEIGHTS = [
    [2,3,1,4,2,3,1,2],
    [3,1,4,2,3,1,4,3],
    [1,4,2,3,1,4,2,1],
    [4,2,3,1,4,2,3,4],
    [2,3,1,4,2,3,1,2],
    [1,2,3,1,3,1,2,1],
  ];

  // Palette
  const TOP   = '#3D6070'; // light face (top)
  const LEFT  = '#2F4858'; // left face
  const RIGHT = '#1A3040'; // right face (darkest)
  const GLOW_TOP   = '#6AAFC0';
  const GLOW_LEFT  = '#4D8A9A';
  const GLOW_RIGHT = '#2F6070';
  const SAGE_TOP   = '#4A5D3A';
  const SAGE_LEFT  = '#3A4A2A';
  const SAGE_RIGHT = '#2A3A1A';
  const BG = '#0F1F28';

  // Convert grid col/row to isometric screen coords (top-left of tile top face)
  const isoX = (c, r) => (c - r) * U + svgW / 2 - U;
  const isoY = (c, r) => (c + r) * (TH / 2);

  // Build blocks back-to-front (painter's algorithm: high r first, then high c)
  const blocks = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    for (let c = COLS - 1; c >= 0; c--) {
      const h = HEIGHTS[r][c] * U;
      const x = isoX(c, r);
      const y = isoY(c, r);

      // Distance from light source (in grid space)
      const lx = lightPos.x * COLS;
      const ly = lightPos.y * ROWS;
      const dist = Math.sqrt((c - lx) ** 2 + (r - ly) ** 2);
      const glow = Math.max(0, 1 - dist / (COLS * 0.7));

      // Central block gets sage accent
      const isCentral = c === 3 && r === 2;
      const tTop   = isCentral ? SAGE_TOP   : TOP;
      const tLeft  = isCentral ? SAGE_LEFT  : LEFT;
      const tRight = isCentral ? SAGE_RIGHT : RIGHT;

      // Interpolate toward glow colors based on proximity
      const blendHex = (base, target, t) => {
        const b = parseInt(base.slice(1), 16);
        const g = parseInt(target.slice(1), 16);
        const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
        const gr = (g >> 16) & 0xff, gg = (g >> 8) & 0xff, gb = g & 0xff;
        const rr = Math.round(br + (gr - br) * t);
        const rg = Math.round(bg + (gg - bg) * t);
        const rb = Math.round(bb + (gb - bb) * t);
        return `rgb(${rr},${rg},${rb})`;
      };

      const fTop   = blendHex(tTop,   GLOW_TOP,   glow * 0.7);
      const fLeft  = blendHex(tLeft,  GLOW_LEFT,  glow * 0.5);
      const fRight = blendHex(tRight, GLOW_RIGHT, glow * 0.4);

      // Central glow block: cream highlight on top at peak glow
      const topFill = (isCentral && lightPos.x > 0.35 && lightPos.x < 0.65)
        ? blendHex(fTop, '#F5F0E8', glow * 0.5)
        : fTop;

      // Top face diamond
      const top = [
        [x,      y     ],
        [x + TW, y + TH/2],
        [x,      y + TH ],
        [x - TW, y + TH/2],
      ].map(p => p.join(',')).join(' ');

      // Left face parallelogram
      const left = [
        [x - TW, y + TH/2],
        [x,      y + TH  ],
        [x,      y + TH + h],
        [x - TW, y + TH/2 + h],
      ].map(p => p.join(',')).join(' ');

      // Right face parallelogram
      const right = [
        [x,      y + TH  ],
        [x + TW, y + TH/2],
        [x + TW, y + TH/2 + h],
        [x,      y + TH + h],
      ].map(p => p.join(',')).join(' ');

      blocks.push(
        <g key={`${c}-${r}`}>
          <polygon points={right} fill={fRight}/>
          <polygon points={left}  fill={fLeft}/>
          <polygon points={top}   fill={topFill}/>
        </g>
      );
    }
  }

  // Radial glow overlay
  const glowCx = isoX(lightPos.x * COLS, lightPos.y * ROWS);
  const glowCy = isoY(lightPos.x * COLS, lightPos.y * ROWS) + U * 2;
  const glowR  = svgW * 0.55;

  return (
    <main className="do-page do-about-page">
      <window.TopNav onHome={onHome} section="about"/>

      {/* ── Hero ── */}
      <div className="do-cs-hero" ref={heroRef}>
        <div className="do-cs-hero-inner" ref={innerRef} style={{ background: BG }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <rect width={svgW} height={svgH} fill={BG}/>
            <defs>
              <radialGradient id="iso-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#B0D8E8" stopOpacity="0.22"/>
                <stop offset="100%" stopColor="#B0D8E8" stopOpacity="0"/>
              </radialGradient>
            </defs>
            {blocks}
            {/* Floating light glow */}
            <ellipse
              cx={glowCx}
              cy={glowCy}
              rx={glowR}
              ry={glowR * 0.45}
              fill="url(#iso-glow)"
              style={{ pointerEvents: 'none' }}
            />
          </svg>
        </div>
        <div className="do-cs-hero-fade"/>
      </div>

      <div className="do-about">

        {/* ── Section 1 ── */}
        <section className="do-about-section">
          <div className="do-about-section-inner">
            <div className="do-about-label">The publication</div>
            <h1 className="do-about-headline">What this is, and why it exists</h1>
            <div className="do-about-body">
              <p>Design Outcomes is a weekly editorial site about design leadership in practice. Not the conference keynote version. Not the LinkedIn post version. The version that lives in the actual texture of the work: the cross-functional Slack thread, the hiring debrief, the org design conversation, the moment in a crit where you realize the feedback you are about to give is really about a structural problem three levels up.</p>
              <p>Every piece published here comes from real work. The articles are drawn from actual conversations, actual decisions, and actual artifacts produced during the course of leading a design organization at a growth-stage SaaS company. Nothing is manufactured for the site. The constraint is authenticity, and the rhythm is weekly.</p>
              <p>The content is organized into recurring formats: <strong>The Reframe</strong> examines common design leadership assumptions through real-world examples. <strong>Crit Notes</strong> shares anonymized design feedback with the reasoning made visible. <strong>The Decision</strong> unpacks real product and organizational decisions, showing what was weighed and what was chosen. <strong>Maker's Log</strong> documents hands-on illustration, branding, and lettering work with process visibility. <strong>Toolbox</strong> offers reusable frameworks, scorecards, and methods. <strong>Reading List</strong> curates weekly links with personal commentary. And <strong>State of the Craft</strong> is a monthly synthesis of themes across recent posts.</p>
              <p>The audience is design leaders, product leaders, senior ICs, and anyone who believes that the craft of leadership deserves the same rigor and attention we give to the craft of design itself.</p>
            </div>
          </div>
        </section>

        <div className="do-about-rule"/>

        {/* ── Section 2 ── */}
        <section className="do-about-section">
          <div className="do-about-section-inner">
            <div className="do-about-label">The author</div>
            <h2 className="do-about-headline">Leonardo De La Rocha</h2>
            <div className="do-about-body">
              <p>I am an engineer turned designer turned design executive with roughly 30 years of experience, starting with graffiti in Denver and winding through roles at Yahoo, Facebook, Intuit, Spotify, and now SimplePractice, where I serve as VP of Product Design.</p>
              <p>At SimplePractice, I lead the design organization across multiple product pillars for the leading electronic health record platform serving independent behavioral health clinicians. The company serves over 250,000 practitioners with an all-in-one practice management solution, and the design work spans clinical care, revenue cycle management, mobile, and an emerging AI/UX practice.</p>
              <p>Before SimplePractice, I was Sr. Director and Head of Design for Spotify Advertising, where I led a 64-person design organization across research, product design, content design, and design program management. Before that, I was Head of Intuit's Design System and Accessibility efforts, working across TurboTax, QuickBooks, ProConnect, and Mint. At Facebook, I served as Creative Director overseeing Studio X (Facebook's in-house creative agency for business products) and as Product Design Manager for the advertising platform, where my team was called "Outcomes," a name I have always loved for how directly it names what design should produce.</p>
              <p>My design philosophy is rooted in a few principles I have carried across every role. Help people grow and succeed: integrate training and best practices so users excel, not just complete tasks. Balance efficiency and effectiveness: optimize for time savings without losing sight of what people are actually trying to accomplish. Bring clarity to complexity: simplify inherently complex tools without sacrificing their essential value. Be accurate and predictable: deliver reliable, consistent results that organizations can depend on.</p>
              <p>Outside of my primary role, I do freelance branding and illustration work as an ongoing maker practice, maintaining a direct connection to craft that I consider essential to leading designers well. I am a mentor on ADPList, providing portfolio reviews and career guidance to designers globally. I speak regularly on design leadership, AI's impact on design organizations, and ethical design practices, most recently keynoting Upscale Conf on how new AI input modalities are reshaping design orgs.</p>
              <p>I believe that design is a form of tuned awareness, that leadership is posture rather than title, and that the best way to build trust with a team is to show your work. This site is me showing mine.</p>
            </div>
          </div>
        </section>

        <div className="do-about-rule"/>

        {/* ── Section 3 ── */}
        <section className="do-about-section">
          <div className="do-about-section-inner">
            <div className="do-about-label">Contact</div>
            <h2 className="do-about-headline">Where to find me</h2>
            <div className="do-about-connect">
              <a className="do-about-connect-item" href="https://linkedin.com/in/delarocha" target="_blank" rel="noopener">
                <span className="do-about-connect-label">LinkedIn</span>
                <span className="do-about-connect-val">linkedin.com/in/delarocha →</span>
              </a>
              <div className="do-about-connect-item">
                <span className="do-about-connect-label">Site</span>
                <span className="do-about-connect-val">ldlr.design</span>
              </div>
              <p className="do-about-connect-note">For inquiries, collaborations, or just to say hello, reach out via LinkedIn. I read everything.</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
};

window.About = About;
