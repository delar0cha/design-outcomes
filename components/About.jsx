// About page — dark isometric hero + three sections
const { useState, useEffect, useRef } = React;

const ORB_POSITIONS = [[3,1],[5,1],[1,3],[7,2],[4,4],[2,4]];

const About = ({ onHome }) => {
  // ── Grid constants up here so useEffect closures capture them ──
  const TW = 240, TH = 120, H = 3, UH = 60;
  const OX = 560,  OY = 90;
  const GAP_C = 4, GAP_R = 2;
  const SVG_W = 1600, SVG_H = 900;
  const sx = (c, r) => (c - r) * (TW / 2) + OX;
  const sy = (c, r) => (c + r) * (TH / 2) + OY;

  // ── Refs & State ──
  const heroRef  = useRef(null);
  const innerRef = useRef(null);
  const rafRef   = useRef(null);
  const lightRef = useRef({ x: 0.5, y: 0.417, tx: 0.5, ty: 0.417 });
  const svgRef   = useRef(null);
  const orbRef   = useRef(ORB_POSITIONS.map(() => ({ dx: 0, dy: 0 })));
  const isMobile = useRef(typeof window !== 'undefined' && window.matchMedia('(hover:none)').matches);
  const [lightPos,   setLightPos]   = useState({ x: 0.5, y: 0.417 });
  const [orbOffsets, setOrbOffsets] = useState(ORB_POSITIONS.map(() => ({ dx: 0, dy: 0 })));

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

  // Light + orb animation
  useEffect(() => {
    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = (ts) => {
      const L = lightRef.current;
      if (isMobile.current) {
        const t = ts * 0.00035;
        L.tx = 0.5   + Math.sin(t)       * 0.3;
        L.ty = 0.417 + Math.sin(t * 0.7) * 0.2;
      }
      L.x = lerp(L.x, L.tx, 0.055);
      L.y = lerp(L.y, L.ty, 0.055);

      // Light in SVG px
      const lsx = L.x * SVG_W;
      const lsy = L.y * SVG_H;

      // Orb drift: ambient Lissajous + gentle cursor attraction
      const newOrbs = orbRef.current.map((orb, i) => {
        const [c, r] = ORB_POSITIONS[i];
        const phase  = i * 1.3;
        const period = 4 + i * 0.4;                               // 4–6 s
        const t      = (ts * 0.001) / period;
        const ambDx  = Math.sin(t * Math.PI * 2 + phase)              * 5;
        const ambDy  = Math.cos(t * Math.PI * 2 * 0.71 + phase * 0.9) * 5;

        const orbSX = sx(c, r);
        const orbSY = sy(c, r) - H * UH;
        const cdx   = lsx - orbSX;
        const cdy   = lsy - orbSY;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy) + 1;
        const pull  = Math.min(280 / cdist, 3);

        return {
          dx: lerp(orb.dx, ambDx + (cdx / cdist) * pull, 0.04),
          dy: lerp(orb.dy, ambDy + (cdy / cdist) * pull, 0.04),
        };
      });
      orbRef.current = newOrbs;

      setLightPos({ x: L.x, y: L.y });
      setOrbOffsets([...newOrbs]);
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

  // ── Palette (unchanged) ──────────────────────────────────────────────────
  const C = {
    bg:        '#1A1610',
    topLit:    '#EDE0B8',
    topDark:   '#282018',
    leftLit:   '#B09060',
    leftDark:  '#181410',
    rightLit:  '#786848',
    rightDark: '#100E0A',
  };

  const lh = (hexA, hexB, t) => {
    const a = parseInt(hexA.slice(1), 16);
    const b = parseInt(hexB.slice(1), 16);
    const r  = Math.round(((a>>16)&0xff) + (((b>>16)&0xff)-((a>>16)&0xff))*t);
    const g  = Math.round(((a>>8) &0xff) + (((b>>8) &0xff)-((a>>8) &0xff))*t);
    const bl = Math.round( (a     &0xff) + ( (b     &0xff)- (a     &0xff))*t);
    return `rgb(${r},${g},${bl})`;
  };

  // ── Build + sort blocks ─────────────────────────────────────────────────
  // Extended grid: r down to -4 fills top-right corner; c up to 11 fills right edge.
  // Visibility filter keeps only blocks that intersect the SVG viewport (+buffer).
  const C_START = -2, C_END = 11;
  const R_START = -4, R_END =  9;
  const PAD = 120;  // buffer in SVG units

  const blocks = [];
  for (let r = R_START; r <= R_END; r++) {
    for (let c = C_START; c <= C_END; c++) {
      if (c === GAP_C && r === GAP_R) continue;
      const x = sx(c, r), y = sy(c, r);
      if (x + TW / 2 < -PAD || x - TW / 2 > SVG_W + PAD) continue;
      if (y + TH    < -PAD || y - H * UH > SVG_H + PAD)  continue;
      blocks.push({ c, r });
    }
  }
  blocks.sort((a, b) => (a.c + a.r) - (b.c + b.r) || a.c - b.c);

  // Light in SVG px for face lighting
  const lightSVGX = lightPos.x * SVG_W;
  const lightSVGY = lightPos.y * SVG_H;
  const maxD = Math.sqrt(SVG_W * SVG_W + SVG_H * SVG_H) * 0.5;

  const pts = (verts) => verts.map(v => v.join(',')).join(' ');

  const blockElems = blocks.map(({ c, r }) => {
    const hPx = H * UH;
    const x   = sx(c, r);
    const y   = sy(c, r);

    const dist = Math.sqrt((x - lightSVGX) ** 2 + (y - hPx + TH / 2 - lightSVGY) ** 2);
    const lit  = Math.pow(Math.max(0, 1 - dist / maxD), 2);

    const fTop   = lh(C.topDark,   C.topLit,   lit);
    const fLeft  = lh(C.leftDark,  C.leftLit,  lit * 0.85);
    const fRight = lh(C.rightDark, C.rightLit, lit * 0.7);

    const topFace = [
      [x,          y - hPx           ],
      [x + TW / 2, y - hPx + TH / 2 ],
      [x,          y - hPx + TH      ],
      [x - TW / 2, y - hPx + TH / 2 ],
    ];
    const leftFace = [
      [x - TW / 2, y - hPx + TH / 2],
      [x,          y - hPx + TH     ],
      [x,          y + TH           ],
      [x - TW / 2, y + TH / 2       ],
    ];
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

  // ── Gap glow (rendered before blocks so front blocks overlay it naturally) ──
  const gapX  = sx(GAP_C, GAP_R);
  const gapCY = sy(GAP_C, GAP_R) - H * UH + TH / 2;  // center of gap top face

  // ── Glowing orbs ────────────────────────────────────────────────────────
  const orbElems = ORB_POSITIONS.map(([c, r], i) => {
    const bx  = sx(c, r);
    const by  = sy(c, r) - H * UH;
    const off = orbOffsets[i] || { dx: 0, dy: 0 };
    return (
      <circle
        key={`orb-${c}-${r}`}
        cx={bx + off.dx}
        cy={by - 4 + off.dy}
        r={30}
        fill="url(#orbGrad)"
      />
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
            <defs>
              {/* Warm lantern glow for the center gap */}
              <radialGradient id="gapGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#F5F0E8" stopOpacity="0.92"/>
                <stop offset="30%"  stopColor="#F5F0E8" stopOpacity="0.55"/>
                <stop offset="65%"  stopColor="#F5F0E8" stopOpacity="0.18"/>
                <stop offset="100%" stopColor="#F5F0E8" stopOpacity="0"/>
              </radialGradient>
              {/* Soft white orb glow */}
              <radialGradient id="orbGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.95"/>
                <stop offset="28%"  stopColor="#FFFFFF" stopOpacity="0.75"/>
                <stop offset="58%"  stopColor="#F5F0E8" stopOpacity="0.28"/>
                <stop offset="100%" stopColor="#F5F0E8" stopOpacity="0"/>
              </radialGradient>
            </defs>

            <rect width={SVG_W} height={SVG_H} fill={C.bg}/>
            <ellipse cx={gapX} cy={gapCY} rx={TW * 0.82} ry={TH * 0.82} fill="url(#gapGlow)"/>
            {blockElems}
            {orbElems}
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
