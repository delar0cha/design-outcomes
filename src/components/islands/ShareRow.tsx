import { useState } from 'react';

interface Props {
  title: string;
  url: string;
  why?: string;
}

export default function ShareRow({ title, url, why }: Props) {
  const [copied, setCopied] = useState(false);
  const [liHint, setLiHint] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const liText = why ? `${why}\n\n${url}` : url;
  const li  = why
    ? `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(liText)}`
    : `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  const onLinkedInClick = () => {
    if (!why) return;
    navigator.clipboard?.writeText(liText).then(() => {
      setLiHint(true);
      setTimeout(() => setLiHint(false), 4000);
    }).catch(() => {});
  };
  const bsk = `https://bsky.app/intent/compose?text=${encodeURIComponent(title + '\n\n' + url)}`;
  const fb  = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const thr = `https://www.threads.net/intent/post?text=${encodeURIComponent(title + '\n\n' + url)}`;
  const x   = `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="do-share-row">
      <span className="do-share-row-label">Share</span>
      <button type="button" className="do-share-row-copy" onClick={copy}>
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <span className="do-share-row-sep" aria-hidden="true" />
      <a
        className="do-share-row-link"
        href={li}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onLinkedInClick}
        title={why ? 'Text copied to clipboard — paste into the post if LinkedIn does not pre-fill it' : undefined}
      >
        {liHint ? 'LinkedIn (text copied — paste if needed)' : 'LinkedIn'}
      </a>
      <a className="do-share-row-link" href={bsk} target="_blank" rel="noopener noreferrer">Bluesky</a>
      <a className="do-share-row-link" href={fb}  target="_blank" rel="noopener noreferrer">Facebook</a>
      <a className="do-share-row-link" href={thr} target="_blank" rel="noopener noreferrer">Threads</a>
      <a className="do-share-row-link" href={x}   target="_blank" rel="noopener noreferrer">X</a>
    </div>
  );
}
