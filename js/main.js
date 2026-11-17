/**
 * Main Application Entry Point
 * Modern Editorial Developer Portfolio
 */

import { initNavigation } from './navigation.js';
import { initAnimations } from './animations.js';
import { initContact } from './contact.js';

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
});

