/**
 * Navigation Module
 * Mobile toggle, keyboard accessibility, active link observation
 */

export function initNavigation() {
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (navToggle && navMenu) {
    // Set initial aria-hidden state so screen readers know the menu is closed
    navMenu.setAttribute('aria-hidden', 'true');

    function openMenu() {
      navToggle.setAttribute('aria-expanded', 'true');
      navMenu.classList.add('is-active');
      navMenu.setAttribute('aria-hidden', 'false');
    }

    function closeMenu() {
      navToggle.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('is-active');
      navMenu.setAttribute('aria-hidden', 'true');
    }

    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      isExpanded ? closeMenu() : openMenu();
    });

    // Close menu when clicking any nav link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    // Close menu on Escape key press — return focus to toggle button
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('is-active')) {
        closeMenu();
        navToggle.focus();
      }
    });

    // Close menu if focus moves outside the nav (Tab past last item)
    navMenu.addEventListener('focusout', (e) => {
      if (navMenu.classList.contains('is-active') && !navMenu.contains(e.relatedTarget)) {
        closeMenu();
      }
    });
  }

  // Active section observer
  const sections = document.querySelectorAll('section[id]');
  if ('IntersectionObserver' in window && sections.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => sectionObserver.observe(section));
  }
}

