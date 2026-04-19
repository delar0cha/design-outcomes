// About page — static hero image + three sections
const { useEffect, useRef } = React;

const About = ({ onHome }) => {
  const heroRef  = useRef(null);
  const innerRef = useRef(null);

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

  return (
    <main className="do-page do-about-page">
      <window.TopNav onHome={onHome} section="about"/>

      {/* ── Hero ── */}
      <div className="do-about-hero" ref={heroRef}>
        <div className="do-cs-hero-inner" ref={innerRef} style={{ background: '#1A1610' }}>
          <img
            src="/images/about-hero.jpg"
            alt=""
            aria-hidden="true"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
          />
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
