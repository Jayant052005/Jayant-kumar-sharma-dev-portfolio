/**
 * Animations Module
 * Intersection Observer scroll reveals with reduced-motion support
 */

export function initAnimations() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    return;
  }

  // Progressive enhancement: activate scroll-reveal CSS rules only when JS is confirmed
  document.documentElement.classList.add('js-reveal');

  const revealElements = document.querySelectorAll('.reveal-init');
  if (!('IntersectionObserver' in window) || revealElements.length === 0) {
    revealElements.forEach(el => el.classList.add('reveal-visible'));
    return;
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
  });

  revealElements.forEach(el => revealObserver.observe(el));
}

