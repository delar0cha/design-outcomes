import { useState } from 'react';

interface Props {
  title: string;
  url: string;
}

export default function ShareRow({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const li  = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
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
      <a className="do-share-row-link" href={li}  target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a className="do-share-row-link" href={bsk} target="_blank" rel="noopener noreferrer">Bluesky</a>
      <a className="do-share-row-link" href={fb}  target="_blank" rel="noopener noreferrer">Facebook</a>
      <a className="do-share-row-link" href={thr} target="_blank" rel="noopener noreferrer">Threads</a>
      <a className="do-share-row-link" href={x}   target="_blank" rel="noopener noreferrer">X</a>
    </div>
  );
}
