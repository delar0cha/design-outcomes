import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const CONFIRM_MSGS = [
  (n: string) => `${n}, your Sundays just got a standing reservation.`,
  (n: string) => `Noted, ${n}. The good kind of noted.`,
  (n: string) => `${n} is on the list. The one worth being on.`,
  (n: string) => `Sunday is officially looking forward to meeting you, ${n}.`,
  (n: string) => `Filed under good decisions, ${n}. See you this weekend.`,
  (n: string) => `Somewhere a notebook just wrote your name in the yes column, ${n}.`,
  (n: string) => `One thoughtful email, once a week. You've made worse commitments, ${n}.`,
  (n: string) => `Your future self will thank you, ${n}. Your current self can just say you're welcome.`,
  (n: string) => `The work ships Sunday. You're on it, ${n}.`,
  (n: string) => `${n} — you're in. No noise, no sponsors. Just the work.`,
];

const randomConfirm = (fullName: string) => {
  const first = fullName.trim().split(' ')[0] || 'Friend';
  return CONFIRM_MSGS[Math.floor(Math.random() * CONFIRM_MSGS.length)](first);
};

interface Props {
  onClose: () => void;
}

export default function SubscribeModal({ onClose }: Props) {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nameRef.current) nameRef.current.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Subscription failed');
      setConfirmed(randomConfirm(name || 'Friend'));
    } catch (err: any) {
      setError(err.message || 'Something went sideways. Try again?');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div
      className="do-sub-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Subscribe"
    >
      <div className="do-sub-modal" onClick={e => e.stopPropagation()}>
        <button className="do-sub-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>

        {confirmed ? (
          <div className="do-sub-confirmed">
            <div className="do-sub-check">
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                <path d="M1 8l7 7L21 1" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="do-sub-confirmed-msg">{confirmed}</p>
            <p className="do-sub-confirmed-sub">Sunday mornings, in your inbox.</p>
            <button className="do-sub-done" onClick={onClose}>Close ↗</button>
          </div>
        ) : (
          <>
            <div className="do-sub-eyebrow">The weekly digest</div>
            <h2 className="do-sub-title">
              Design Outcomes<span className="do-sub-dot">.</span>
            </h2>
            <p className="do-sub-desc">
              Real work. Real decisions. Real thinking — from someone doing the job,
              not talking about it. One email, every Sunday morning.
            </p>
            <form className="do-sub-form" onSubmit={submit}>
              <div className="do-sub-field">
                <label className="do-sub-label" htmlFor="sub-name">Your name</label>
                <input
                  id="sub-name"
                  ref={nameRef}
                  className="do-sub-input"
                  type="text"
                  placeholder="First name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="do-sub-field">
                <label className="do-sub-label" htmlFor="sub-email">Email address</label>
                <input
                  id="sub-email"
                  className="do-sub-input"
                  type="email"
                  placeholder="you@studio.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <button className="do-sub-submit" type="submit" disabled={loading}>
                <span>{loading ? 'Sending…' : 'Subscribe'}</span>
                {!loading && (
                  <svg width="20" height="8" viewBox="0 0 20 8" fill="none">
                    <path d="M0 4h18M15 1l3 3-3 3" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                )}
              </button>
            </form>
            {error && <p className="do-sub-error">{error}</p>}
            <p className="do-sub-note">No spam. No sponsors. Unsubscribe with one click.</p>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
