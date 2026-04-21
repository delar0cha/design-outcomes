import { useState, useEffect, useRef } from 'react';
import Illustration from './Illustration';
import ShareRow from './ShareRow';
import type { CaseStudyMeta } from '@lib/types';
import { PROJECT_CATS } from '@lib/caseStudies';

interface Props {
  cs: CaseStudyMeta;
  siteOrigin: string;
}

export default function CaseStudyPage({ cs, siteOrigin }: Props) {
  const heroRef  = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

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

  const cat      = PROJECT_CATS[cs.cat];
  const shareUrl = `${siteOrigin}/work/${cs.slug}`;

  return (
    <>
      {/* Hero */}
      <div className="do-cs-hero" ref={heroRef}>
        <div className="do-cs-hero-inner" ref={innerRef}>
          <Illustration recipe={cs.illustration} className="do-cs-hero-svg" />
        </div>
        <div className="do-cs-hero-fade" />
      </div>

      {/* Article */}
      <article className="do-cs-article">
        {/* Back link */}
        <a className="do-cs-back" href="/work">← Design Work</a>

        {/* Chips */}
        <div className="do-cs-chips">
          <span className="do-cs-chip" style={{ color: cat?.tint }}>{cat?.name}</span>
          <span className="do-cs-chip-sep">·</span>
          <span className="do-cs-chip">{cs.company}</span>
          <span className="do-cs-chip-sep">·</span>
          <span className="do-cs-chip">{cs.year}</span>
        </div>

        {/* Title + subtitle */}
        <h1 className="do-cs-title">{cs.title}</h1>
        {cs.subtitle && <p className="do-cs-subtitle">{cs.subtitle}</p>}

        {/* Summary */}
        {cs.summary && <p className="do-cs-summary">{cs.summary}</p>}

        {/* Share (top) */}
        <ShareRow title={cs.title} url={shareUrl} topBar />

        {/* Divider */}
        <div className="do-cs-rule" />

        {/* Body */}
        <div className="do-cs-body">
          {cs.body.map((block, i) => {
            if (block.type === 'h')
              return <h2 key={i} className="do-cs-h2">{block.text}</h2>;
            if (block.type === 'p')
              return <p key={i}>{block.text}</p>;
            if (block.type === 'quote')
              return (
                <blockquote key={i}>
                  <span className="do-quote-mark" aria-hidden="true">"</span>
                  <span>{block.text}</span>
                </blockquote>
              );
            if (block.type === 'img')
              return (
                <figure key={i} className="do-cs-figure">
                  <img
                    src={block.src}
                    alt={block.caption ?? ''}
                    className="do-cs-img"
                    loading="lazy"
                  />
                  {block.caption && (
                    <figcaption className="do-cs-figcaption">{block.caption}</figcaption>
                  )}
                </figure>
              );
            return null;
          })}
        </div>

        {/* Share (bottom) */}
        <ShareRow title={cs.title} url={shareUrl} />

        <div className="do-cs-rule" style={{ marginTop: '64px' }} />

        {/* Slide deck */}
        {cs.slides && cs.slides.length > 0 && (
          <section className="do-cs-slides">
            <div className="do-eyebrow">Selected slides</div>
            <h2 className="do-cs-slides-head">From the 2026 Design Vision deck.</h2>
            <div className="do-cs-slides-grid">
              {cs.slides.map((slide, i) => (
                <figure key={i} className="do-cs-slide">
                  <img
                    src={slide.src}
                    alt={slide.caption}
                    className="do-cs-slide-img"
                    loading="lazy"
                  />
                  {slide.caption && (
                    <figcaption className="do-cs-slide-caption">{slide.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
