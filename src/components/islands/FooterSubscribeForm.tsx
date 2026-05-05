import { useEffect, useRef, useState } from 'react';

const CONFIRM_MSGS = [
  (n: string) => `You're in, ${n}. Sunday mornings just got a little better.`,
  (n: string) => `One thoughtful email, once a week. You've made worse commitments, ${n}.`,
  (n: string) => `Your future self will thank you, ${n}. Your current self can just say you're welcome.`,
  (n: string) => `The work ships Sunday. You're on it, ${n}.`,
  (n: string) => `${n} — you're in. No noise, no sponsors. Just the work.`,
];

const randomConfirm = (fullName: string) => {
  const first = fullName.trim().split(' ')[0] || 'Friend';
  return CONFIRM_MSGS[Math.floor(Math.random() * CONFIRM_MSGS.length)](first);
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormError = { title: string; body: string };

export default function FooterSubscribeForm() {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [error, setError]         = useState<FormError | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!error) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setError(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [error]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError({
        title: 'EMAIL NEEDED.',
        body: 'Drop your address so the Sunday digest can find its way to you.',
      });
      emailRef.current?.focus();
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError({
        title: "EMAIL DOESN'T LOOK RIGHT.",
        body: "Double-check the address — we couldn't quite parse that one.",
      });
      emailRef.current?.focus();
      return;
    }
    setError(null);
    setConfirmed(randomConfirm(name || 'Friend'));
  };

  if (confirmed) {
    return <div className="do-footer-sent">{confirmed}</div>;
  }

  return (
    <form className="do-footer-sub-form" onSubmit={submit} noValidate>
      <input
        className="do-footer-sub-input"
        type="text"
        placeholder="First name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <div className="do-form-field">
        <input
          ref={emailRef}
          className="do-footer-sub-input"
          type="email"
          required
          placeholder="you@studio.com"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'do-footer-sub-tip' : undefined}
        />
        <div
          id="do-footer-sub-tip"
          role="alert"
          className={`do-form-tip${error ? ' is-on' : ''}`}
          aria-hidden={!error}
        >
          <div className="do-form-tip-pointer" />
          <div className="do-form-tip-title">{error?.title ?? ' '}</div>
          <div className="do-form-tip-rule" />
          <div className="do-form-tip-body">{error?.body ?? ' '}</div>
        </div>
      </div>
      <button className="do-footer-sub-btn" type="submit">Subscribe →</button>
    </form>
  );
}
