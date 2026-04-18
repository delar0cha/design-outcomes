// About page — isometric hero + three sections
const { useState, useEffect, useRef } = React;

const About = ({ onHome }) => {
  const heroRef  = useRef(null);
  const innerRef = useRef(null);
  const rafRef   = useRef(null);
  const lightRef = useRef({ x: 0.45, y: 0.4, tx: 0.45, ty: 0.4 });
  const svgRef   = useRef(null);
  const [lightPos, setLightPos] = useState({ x: 0.45, y: 0.4 });
  const isMobile = useRef(typeof window !== 'undefined' && window.matchMedia('(hover:none)').matches);

  // Parallax
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

  // Light animation + cursor tracking
  useEffect(() => {
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = (ts) => {
      const L = lightRef.current;
      if (isMobile.current) {
        const t = ts * 0.00035;
        L.tx = 0.5 + Math.sin(t)       * 0.3;
        L.ty = 0.4 + Math.sin(t * 0.7) * 0.2;
      }
      L.x = lerp(L.x, L.tx, 0.055);
      L.y = lerp(L.y, L.ty, 0.055);
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

  // ── Isometric grid ──────────────────────────────────────────────────────
  // 32:9 container → viewBox 1600×450 (half the height of previous 16:9)
  // TW:TH = 220:44 = 5:1 — flatter tile for compressed vertical space
  // TW chosen so the 8×6 grid spans the full 1600px width edge-to-edge
  const COLS = 8, ROWS = 6;
  const TW   = 220;  // tile diamond width
  const TH   = 44;   // tile diamond height (5:1 ratio, compressed)
  const UH   = 22;   // screen px per block height unit

  const SVG_W = 1600;
  const SVG_H = 450;

  // Origin: symmetrically centers the grid horizontally in the viewBox
  // Grid spans OX±660 (left) to OX+880 (right) → OX=690 gives ±30px margin
  const OX = 690;
  const OY = 115;   // vertical centering: topmost vertex ≈27px, bottom ≈423px

  const sx = (c, r) => (c - r) * (TW / 2) + OX;
  const sy = (c, r) => (c + r) * (TH / 2) + OY;

  // Heights: 0 = gap, 1–4 = block height in units
  const HEIGHTS = [
    [2, 3, 4, 1, 2, 3, 1, 2],
    [3, 0, 2, 4, 2, 0, 3, 1],
    [1, 3, 1, 2, 3, 2, 0, 4],
    [4, 1, 3, 0, 1, 4, 2, 1],
    [2, 0, 1, 3, 2, 1, 4, 0],
    [1, 2, 0, 2, 1, 3, 0, 2],
  ];

  // ~15% of active blocks get warm gold accent faces
  const GOLD = new Set(['4-0', '1-1', '7-2', '2-3', '5-4', '0-5']);

  // Warm earthy palette — background (#8C8377) is the darkest tone anywhere
  const C = {
    bg:        '#8C8377',
    topLit:    '#F5F0E8',
    topDark:   '#D8D3CC',
    leftLit:   '#D4C4B4',
    leftDark:  '#C4B5A0',
    rightLit:  '#B8A892',
    rightDark: '#A89279',
    gLLit:     '#DDB96A',
    gLDark:    '#C9A84C',
    gRLit:     '#CCAA6E',
    gRDark:    '#B8975A',
  };

  // Lerp two hex colors → rgb() string (no SVG gradients, flat fill per polygon)
  const lh = (hexA, hexB, t) => {
    const a = parseInt(hexA.slice(1), 16);
    const b = parseInt(hexB.slice(1), 16);
    const r  = Math.round(((a>>16)&0xff) + (((b>>16)&0xff)-((a>>16)&0xff))*t);
    const g  = Math.round(((a>>8) &0xff) + (((b>>8) &0xff)-((a>>8) &0xff))*t);
    const bl = Math.round( (a     &0xff) + ( (b     &0xff)- (a     &0xff))*t);
    return `rgb(${r},${g},${bl})`;
  };

  // Build + sort blocks back-to-front (painter's algorithm: low col+row = back)
  const blocks = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (HEIGHTS[r][c] > 0) blocks.push({ c, r, h: HEIGHTS[r][c] });
  blocks.sort((a, b) => (a.c + a.r) - (b.c + b.r) || a.c - b.c);

  // Light in grid coords
  const lx   = lightPos.x * COLS;
  const ly   = lightPos.y * ROWS;
  const maxD = Math.sqrt(COLS * COLS + ROWS * ROWS);

  const pts = (verts) => verts.map(v => v.join(',')).join(' ');

  const blockElems = blocks.map(({ c, r, h }) => {
    const hPx = h * UH;
    const x   = sx(c, r);
    const y   = sy(c, r);
    const isG = GOLD.has(`${c}-${r}`);

    const dist = Math.sqrt((c + 0.5 - lx) ** 2 + (r + 0.5 - ly) ** 2);
    const lit  = Math.max(0, 1 - dist / (maxD * 0.52));

    const fTop   = lh(C.topDark,  C.topLit,  lit);
    const fLeft  = isG ? lh(C.gLDark, C.gLLit, lit * 0.8) : lh(C.leftDark, C.leftLit, lit * 0.8);
    const fRight = isG ? lh(C.gRDark, C.gRLit, lit * 0.7) : lh(C.rightDark, C.rightLit, lit * 0.7);

    // Top face diamond (lifted hPx above ground)
    const topFace = [
      [x,          y - hPx           ],
      [x + TW / 2, y - hPx + TH / 2 ],
      [x,          y - hPx + TH      ],
      [x - TW / 2, y - hPx + TH / 2 ],
    ];
    // Left face: top-face left+bottom vertices → ground left+bottom
    const leftFace = [
      [x - TW / 2, y - hPx + TH / 2],
      [x,          y - hPx + TH     ],
      [x,          y + TH           ],
      [x - TW / 2, y + TH / 2       ],
    ];
    // Right face: top-face bottom+right vertices → ground bottom+right
    const rightFace = [
      [x,          y - hPx + TH     ],
      [x + TW / 2, y - hPx + TH / 2],
      [x + TW / 2, y + TH / 2       ],
      [x,          y + TH           ],
    ];

    return (
      <g key={`${c}-${r}`}>
        <polygon points={pts(rightFace)} fill={fRight}/>
        <polygon points={pts(leftFace)}  fill={fLeft}/>
        <polygon points={pts(topFace)}   fill={fTop}/>
      </g>
    );
  });

  return (
    <main className="do-page do-about-page">
      <window.TopNav onHome={onHome} section="about"/>

      {/* ── Hero ── */}
      <div className="do-about-hero" ref={heroRef}>
        <div className="do-cs-hero-inner" ref={innerRef} style={{ background: C.bg }}>
          <svg
            ref={svgRef}
            width="100%" height="100%"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <rect width={SVG_W} height={SVG_H} fill={C.bg}/>
            {blockElems}
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
