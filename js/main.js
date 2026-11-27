/**
 * Main Application Entry Point
 * Modern Editorial Developer Portfolio
 */

import { initNavigation } from './navigation.js';
import { initAnimations } from './animations.js';
import { initContact } from './contact.js';
import { initDragonScene } from './dragon/dragon-scene.js?v=10';
import { initClickFire } from './click-fire.js?v=10';

document.addEventListener('DOMContentLoaded', () => {
  // Update copyright year dynamically
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Initialize modular controllers
  initNavigation();
  initAnimations();
  initContact();
  initClickFire();

  // Performance Optimization: Defer 3D Dragon initialization for optimal Core Web Vitals (TBT < 50ms)
  let dragonInitialized = false;
  const startDragon = () => {
    if (dragonInitialized) return;
    dragonInitialized = true;
    cleanupListeners();
    initDragonScene();
  };

  const interactionEvents = ['mousemove', 'scroll', 'touchstart', 'keydown', 'click'];
  const onUserInteraction = () => startDragon();

  const cleanupListeners = () => {
    interactionEvents.forEach((evt) => window.removeEventListener(evt, onUserInteraction));
  };

  interactionEvents.forEach((evt) => {
    window.addEventListener(evt, onUserInteraction, { passive: true, once: true });
  });

  const enterBtn = document.getElementById('dragon-enter-btn');
  if (enterBtn) {
    enterBtn.addEventListener('click', startDragon, { once: true });
  }

  // Idle fallback after initial paint
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      startDragon();
    }, { timeout: 1200 });
  }
  // Guaranteed timer fallback ensures scene starts even in headless test runners without user gesture
  setTimeout(startDragon, 1200);

  window.__START_DRAGON__ = startDragon;
});

