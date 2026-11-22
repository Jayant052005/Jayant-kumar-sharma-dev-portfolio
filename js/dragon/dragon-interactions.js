/**
 * Dragon Mouse & Pointer Interaction System (Phase 7)
 * Implements smooth pointer tracking, camera parallax, clamped head look-at tracking,
 * touch support, and accessible controls for roar and fire breathing.
 */

import * as THREE from '../libs/three.module.js';

export class DragonInteractions {
  constructor(sceneInstance) {
    this.scene = sceneInstance;
    this.container = sceneInstance.container || document.getElementById('hero');

    // Normalized coordinates [-1, 1]
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;

    // Configuration
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.parallaxStrengthX = this.isReducedMotion ? 0 : 0.45;
    this.parallaxStrengthY = this.isReducedMotion ? 0 : 0.25;

    // Maximum head tracking angles (clamped to prevent extreme rotation or unnatural mesh twisting)
    this.maxYaw = 18 * (Math.PI / 180);   // +/- 18 degrees
    this.maxPitch = 12 * (Math.PI / 180); // +/- 12 degrees
    this.currentHeadYaw = 0;
    this.currentHeadPitch = 0;

    // Parallax result vector
    this.parallaxOffset = new THREE.Vector3();

    // Event listeners references for disposal
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onMouseLeave = this.onMouseLeave.bind(this);
    this._onTouchMove = this.onTouchMove.bind(this);
    this._onTouchEnd = this.onTouchEnd.bind(this);

    this.initEventListeners();
    this.initAccessibleControls();

    window.__DRAGON_INTERACTIONS__ = this;
  }

  /* ---------------------------------------------------------
   * Pointer & Touch Tracking
   * --------------------------------------------------------- */
  initEventListeners() {
    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    window.addEventListener('mouseleave', this._onMouseLeave, { passive: true });

    // Touch events for mobile/tablet
    if (this.container) {
      this.container.addEventListener('touchstart', this._onTouchMove, { passive: true });
      this.container.addEventListener('touchmove', this._onTouchMove, { passive: true });
      this.container.addEventListener('touchend', this._onTouchEnd, { passive: true });
    }
  }

  onMouseMove(e) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Convert to normalized coordinates [-1, 1] relative to viewport center
    this.targetX = ((e.clientX / width) - 0.5) * 2.0;
    this.targetY = -((e.clientY / height) - 0.5) * 2.0;
  }

  onMouseLeave() {
    // Smoothly return to neutral center pose
    this.targetX = 0;
    this.targetY = 0;
  }

  onTouchMove(e) {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.targetX = ((touch.clientX / width) - 0.5) * 2.0;
    this.targetY = -((touch.clientY / height) - 0.5) * 2.0;
  }

  onTouchEnd() {
    this.targetX = 0;
    this.targetY = 0;
  }

  /* ---------------------------------------------------------
   * Accessible HUD Controls
   * --------------------------------------------------------- */
  initAccessibleControls() {
    const roarBtn = document.getElementById('dragon-roar-btn');
    if (roarBtn) {
      roarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.scene.triggerRoar();
      });
      roarBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.scene.triggerRoar();
        }
      });
    }

    const fireBtn = document.getElementById('dragon-fire-btn');
    if (fireBtn) {
      fireBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.scene.triggerFire();
      });
      fireBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.scene.triggerFire();
        }
      });
    }
  }

  /* ---------------------------------------------------------
   * Per-Frame Update (Smooth Interpolation & Clamped Head Tracking)
   * --------------------------------------------------------- */
  update(delta) {
    // 1. Smooth interpolation with exponential damping (zero sudden jumps)
    const lerpFactor = 1.0 - Math.exp(-5.5 * delta);
    this.currentX += (this.targetX - this.currentX) * lerpFactor;
    this.currentY += (this.targetY - this.currentY) * lerpFactor;

    // 2. Compute Camera Parallax Offset
    this.parallaxOffset.set(
      this.currentX * this.parallaxStrengthX,
      this.currentY * this.parallaxStrengthY,
      0
    );

    // 3. Clamped Head Tracking (compliments Take 001 without breaking skeleton)
    if (this.scene && this.scene.headBone) {
      const targetYaw = -this.currentX * this.maxYaw;
      const targetPitch = this.currentY * this.maxPitch;

      this.currentHeadYaw += (targetYaw - this.currentHeadYaw) * lerpFactor;
      this.currentHeadPitch += (targetPitch - this.currentHeadPitch) * lerpFactor;

      // Apply subtle orientation tilt to dragon head bone
      this.scene.headBone.rotation.y += this.currentHeadYaw * 0.45;
      this.scene.headBone.rotation.x += this.currentHeadPitch * 0.35;
    }
  }

  getParallaxOffset() {
    return this.parallaxOffset;
  }

  dispose() {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseleave', this._onMouseLeave);
    if (this.container) {
      this.container.removeEventListener('touchstart', this._onTouchMove);
      this.container.removeEventListener('touchmove', this._onTouchMove);
      this.container.removeEventListener('touchend', this._onTouchEnd);
    }
  }
}
