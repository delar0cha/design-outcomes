import { useState } from 'react';

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

export default function FooterSubscribeForm() {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setConfirmed(randomConfirm(name || 'Friend'));
  };

  if (confirmed) {
    return <div className="do-footer-sent">{confirmed}</div>;
  }

  return (
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
  );
}
