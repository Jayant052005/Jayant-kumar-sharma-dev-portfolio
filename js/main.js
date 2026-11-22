/**
 * Main Application Entry Point
 * Modern Editorial Developer Portfolio
 */

import { initNavigation } from './navigation.js';
import { initAnimations } from './animations.js';
import { initContact } from './contact.js';
import { initDragonScene } from './dragon/dragon-scene.js?v=10';

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

  // Initialize 3D Dragon Integration (Phase 2 & 3)
  initDragonScene();
});

