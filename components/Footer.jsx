// Shared site footer — subscribe form, links, copyright.
// Self-contained: manages its own form state. No props required.
const { useState } = React;

const CONFIRM_MSGS = [
  n => `You're in, ${n}. Sunday mornings just got a little better.`,
  n => `One thoughtful email, once a week. You've made worse commitments, ${n}.`,
  n => `Your future self will thank you, ${n}. Your current self can just say you're welcome.`,
  n => `The work ships Sunday. You're on it, ${n}.`,
  n => `${n} — you're in. No noise, no sponsors. Just the work.`,
];

const randomConfirm = (fullName) => {
  const first = fullName.trim().split(' ')[0] || 'Hey';
  return CONFIRM_MSGS[Math.floor(Math.random() * CONFIRM_MSGS.length)](first);
};

const SiteFooter = () => {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [confirmed, setConfirmed] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setConfirmed(randomConfirm(name || 'Friend'));
  };

  return (
    <footer className="do-footer">
      <div className="do-footer-grid">
        <div className="do-footer-about">
          <div className="do-footer-logo">Design Outcomes<span>.</span></div>
          <p>A weekly-updated portfolio of design leadership in practice — real work, real decisions, real thinking. Written by Leonardo De La Rocha, VP Product Design. No sponsors. No popovers. Just the work.</p>
        </div>
        <div className="do-footer-sub">
          <div className="do-footer-label">The weekly digest</div>
          {confirmed ? (
            <div className="do-footer-sent">{confirmed}</div>
          ) : (
            <form className="do-footer-sub-form" onSubmit={submit}>
              <input
                className="do-footer-sub-input"
                type="text"
                placeholder="First name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <input
                className="do-footer-sub-input"
                type="email"
                required
                placeholder="you@studio.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <button className="do-footer-sub-btn" type="submit">Subscribe →</button>
            </form>
          )}
          <p className="do-footer-note">One email, Sunday. One link you will actually open. Unsubscribe with one click.</p>
        </div>
        <div className="do-footer-links">
          <div className="do-footer-label">Elsewhere</div>
          <ul>
            <li><a href="https://delarocha.myportfolio.com" target="_blank" rel="noopener">delarocha.myportfolio.com →</a></li>
            <li><a href="https://linkedin.com/in/delarocha" target="_blank" rel="noopener">linkedin.com/in/delarocha →</a></li>
            <li><a href="https://instagram.com/delar0cha" target="_blank" rel="noopener">instagram.com/delar0cha →</a></li>
          </ul>
        </div>
      </div>
      <div className="do-footer-rule"/>
      <div className="do-footer-base">
        <span>© 2026 Leonardo De La Rocha · ldlr.design · Set in Newsreader &amp; Instrument Sans.</span>
        <span>Issue 01 — week of April 13, 2026</span>
      </div>
    </footer>
  );
};

window.SiteFooter = SiteFooter;
