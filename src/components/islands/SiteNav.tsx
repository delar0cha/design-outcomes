import { useState } from 'react';
import SubscribeModal from './SubscribeModal';
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

  // "/" is active for the Articles tab when we're not under any other section.
  const articlesActive =
    isActive('/') &&
    !isActive('/about') &&
    !isActive('/work') &&
    !isActive('/field-notes');

  return (
    <>
      <div className="do-nav-wrap">
        <header className="do-nav">
          {/* Logo (left) */}
          <a href="/" className="do-nav-logo">
            <span className="do-nav-mark">
              <SiteLogoSvg width={34} height={38} />
            </span>
            <span className="do-nav-wordmark">Design Outcomes</span>
          </a>

          {/* Centre nav links — three editorial sections only. Subscribe
              moved out of this group and lives as the right-side CTA. */}
          <nav className="do-nav-links">
            <a href="/" className={articlesActive ? 'is-active' : ''}>
              Articles
            </a>
            <a href="/field-notes" className={isActive('/field-notes') ? 'is-active' : ''}>
              Field Notes
            </a>
            <a href="/about" className={isActive('/about') ? 'is-active' : ''}>
              About
            </a>
          </nav>

          {/* Subscribe CTA (right). Persistent dark-fill pill across every
              page so the primary action is always one tap away. The
              previous header issue/latest metadata block is gone — it now
              lives inside the homepage carousel per slide. */}
          <button className="do-nav-sub-btn" onClick={openSub}>Subscribe</button>

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
              className={`do-mobile-link${articlesActive ? ' is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Articles
            </a>
            <a
              href="/field-notes"
              className={`do-mobile-link${isActive('/field-notes') ? ' is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Field Notes
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
