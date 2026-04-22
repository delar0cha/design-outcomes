import { useState } from 'react';
import SubscribeModal from './SubscribeModal';
import { formatIssueLabel } from '@lib/issue';
import SiteLogoSvg from './SiteLogoSvg';

interface Props {
  currentPath?: string;
}

export default function SiteNav({ currentPath = '/' }: Props) {
  const [subOpen,  setSubOpen]  = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const openSub = () => { setMenuOpen(false); setSubOpen(true); };

  const isActive = (path: string) =>
    currentPath === path || (path !== '/' && currentPath.startsWith(path));

  return (
    <>
      <div className="do-nav-wrap">
        <header className="do-nav">
          {/* Logo */}
          <a href="/" className="do-nav-logo">
            <span className="do-nav-mark">
              <SiteLogoSvg width={34} height={38} />
            </span>
            <span className="do-nav-wordmark">Design Outcomes</span>
          </a>

          {/* Centre nav links */}
          <nav className="do-nav-links">
            <a href="/" className={isActive('/') && !isActive('/about') && !isActive('/work') ? 'is-active' : ''}>
              Write-ups
            </a>
            <a href="/about" className={isActive('/about') ? 'is-active' : ''}>
              About
            </a>
            <button className="do-nav-sub-btn" onClick={openSub}>Subscribe</button>
          </nav>

          {/* Issue meta (right) — single span styled via .do-issue-label,
              shared verbatim with the footer so any future adjustment to
              the label's typography or format flows to both places. */}
          <div className="do-nav-meta">
            <span className="do-issue-label">{formatIssueLabel()}</span>
          </div>

          {/* Hamburger (mobile) */}
          <button
            className="do-nav-hamburger"
            onClick={() => setMenuOpen(m => !m)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen
              ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2l12 12M14 2L2 14" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                  <path d="M0 1h20M0 7h20M0 13h20" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
          </button>
        </header>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="do-mobile-menu" aria-label="Site navigation">
            <a
              href="/"
              className={`do-mobile-link${isActive('/') && !isActive('/about') && !isActive('/work') ? ' is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Write-ups
            </a>
            <a
              href="/about"
              className={`do-mobile-link${isActive('/about') ? ' is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              About
            </a>
            <button className="do-mobile-link do-mobile-sub" onClick={openSub}>
              Subscribe →
            </button>
          </nav>
        )}
      </div>

      {subOpen && <SubscribeModal onClose={() => setSubOpen(false)} />}
    </>
  );
}
