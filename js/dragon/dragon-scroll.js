/**
 * Dragon Scroll Interaction Controller (Phase 8)
 * Implements smooth cinematic camera movement, dragon repositioning,
 * and section transitions tied to scroll progress.
 * Strictly preserves normal browser scrolling (never hijacks scroll).
 */

import * as THREE from '../libs/three.module.js';

export class DragonScrollController {
  constructor(sceneInstance) {
    this.scene = sceneInstance;
    this.heroEl = document.getElementById('hero');

    // Scroll progress normalized [0.0, 1.0]
    this.targetProgress = 0.0;
    this.smoothProgress = 0.0;

    // Reduced motion preference check
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.motionFactor = this.isReducedMotion ? 0.15 : 1.0;

    // Offsets to be applied to camera and dragon pivot
    this.cameraOffset = new THREE.Vector3();
    this.dragonPosOffset = new THREE.Vector3();
    this.dragonRotOffset = new THREE.Euler(0, 0, 0, 'YXZ');

    this._onScroll = this.onScroll.bind(this);
    this.initScrollListener();

    window.__DRAGON_SCROLL__ = this;
  }

  /* ---------------------------------------------------------
   * Passive Native Scroll Listener (100% Non-Hijacking)
   * --------------------------------------------------------- */
  initScrollListener() {
    window.addEventListener('scroll', this._onScroll, { passive: true });
    this.updateScrollProgress();
  }

  onScroll() {
    this.updateScrollProgress();
  }

  updateScrollProgress() {
    if (!this.heroEl) {
      this.targetProgress = 0.0;
      return;
    }

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const heroHeight = this.heroEl.offsetHeight || window.innerHeight;

    // Progress goes from 0.0 at very top to 1.0 as hero scrolls out
    const progress = Math.min(1.0, Math.max(0.0, scrollY / (heroHeight * 0.95)));
    this.targetProgress = progress;
  }

  /* ---------------------------------------------------------
   * Per-Frame Damped Update (Smooth Cinematic Interpolation)
   * --------------------------------------------------------- */
  update(delta) {
    // 1. Smooth exponential damping (zero sudden jumps during fast mouse wheeling)
    const lerpFactor = 1.0 - Math.exp(-6.5 * delta);
    this.smoothProgress += (this.targetProgress - this.smoothProgress) * lerpFactor;

    const p = this.smoothProgress * this.motionFactor;

    // 2. Camera Cinematic Movement:
    // As visitor scrolls down, camera elevates and pulls back slightly
    this.cameraOffset.set(
      p * 0.45,  // subtle rightward shift
      p * 0.85,  // elevation
      p * 2.20   // dolly pullback
    );

    // 3. Dragon Repositioning:
    // Dragon takes flight, lifting up towards the sky into the mist
    this.dragonPosOffset.set(
      p * 0.35,  // gentle horizontal drift
      p * 0.75,  // ascension
      p * -0.50  // push back into 3D space
    );

    // 4. Dragon Orientation Transformation:
    // Dynamic soaring pose
    this.dragonRotOffset.set(
      p * -0.16, // pitch slightly upward
      p * 0.32,  // yaw slightly toward viewer
      p * 0.10   // roll banked turn
    );
  }

  getCameraOffset() {
    return this.cameraOffset;
  }

  getDragonPosOffset() {
    return this.dragonPosOffset;
  }

  getDragonRotOffset() {
    return this.dragonRotOffset;
  }

  getScrollProgress() {
    return this.smoothProgress;
  }

  dispose() {
    window.removeEventListener('scroll', this._onScroll);
  }
}
