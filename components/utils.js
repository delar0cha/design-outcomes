// Shared parallax hook.
// heroRef  — the clipping container (overflow:hidden, position:relative)
// innerRef — the oversized inner element that shifts on scroll
// factor   — translateY = containerTop * factor (default 0.28 = subtle depth)
window.useParallax = (heroRef, innerRef, factor) => {
  factor = factor === undefined ? 0.28 : factor;
  React.useEffect(function() {
    var onScroll = function() {
      if (!innerRef.current || !heroRef.current) return;
      var top = heroRef.current.getBoundingClientRect().top;
      innerRef.current.style.transform = 'translateY(' + (top * factor) + 'px)';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return function() { window.removeEventListener('scroll', onScroll); };
  }, []);
};
