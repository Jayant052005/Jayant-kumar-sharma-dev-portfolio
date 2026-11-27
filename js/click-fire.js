/**
 * Page-Wide Interactive Click Fire Particle System
 * Renders realistic additive flame plumes, rising glowing embers, soft ambient light,
 * and subtle dissipating smoke at exact click/tap coordinates anywhere on the website.
 * Strictly preserves existing 3D dragon behavior, scrolling, navigation, and zero inline styles.
 */

import { DragonAudio } from './dragon/dragon-audio.js';

export class ClickFireSystem {
  constructor() {
    this.canvas = document.getElementById('click-fire-canvas');
    this.ctx = null;
    this.dpr = 1;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.isReducedMotion = this.motionQuery.matches;
    this.isMobile = window.innerWidth <= 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

    this.maxParticles = this.isReducedMotion ? 70 : (this.isMobile ? 140 : 280);
    this.maxGlows = this.isReducedMotion ? 4 : (this.isMobile ? 8 : 12);

    this.particles = [];
    this.glows = [];
    this.sprites = null;

    this.rafId = null;
    this.lastFrameTime = 0;
    this.isDisposed = false;

    this._activePointer = null;
    this._lastPointerTrigger = null;
    this._ownedAudio = null;
    this._burstCount = 0;

    this._onPointerDown = this.handlePointerDown.bind(this);
    this._onPointerMove = this.handlePointerMove.bind(this);
    this._onPointerUp = this.handlePointerUp.bind(this);
    this._onPointerCancel = this.handlePointerCancel.bind(this);
    this._onClick = this.handleClick.bind(this);
    this._onResize = this.handleResize.bind(this);
    this._onMotionChange = this.handleMotionChange.bind(this);
    this._tick = this.tick.bind(this);

    this.initListeners();
    window.__CLICK_FIRE__ = this;
  }

  /* ---------------------------------------------------------
   * Lazy Initialization (Near-Zero TBT at Page Load)
   * --------------------------------------------------------- */
  ensureGraphicsReady() {
    if (this.ctx && this.sprites) return true;

    if (!this.canvas) {
      const el = document.createElement('canvas');
      el.id = 'click-fire-canvas';
      el.className = 'click-fire-canvas';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
      this.canvas = el;
    }

    this.ctx = this.canvas.getContext('2d', { alpha: true });
    if (!this.ctx) return false;

    this.handleResize();
    this.sprites = this.buildSpriteTextures();
    return true;
  }

  buildSpriteTextures() {
    return {
      glow: this.createRadialSprite(128, [
        [0.0, 'rgba(255, 210, 120, 0.72)'],
        [0.25, 'rgba(255, 115, 25, 0.42)'],
        [0.58, 'rgba(229, 37, 42, 0.16)'],
        [1.0, 'rgba(0, 0, 0, 0.0)']
      ]),
      core: this.createRadialSprite(64, [
        [0.0, 'rgba(255, 255, 240, 1.0)'],
        [0.32, 'rgba(255, 224, 110, 0.92)'],
        [0.68, 'rgba(255, 118, 20, 0.42)'],
        [1.0, 'rgba(0, 0, 0, 0.0)']
      ]),
      flame: this.createRadialSprite(64, [
        [0.0, 'rgba(255, 215, 95, 0.95)'],
        [0.35, 'rgba(255, 102, 16, 0.80)'],
        [0.72, 'rgba(229, 37, 42, 0.36)'],
        [1.0, 'rgba(0, 0, 0, 0.0)']
      ]),
      crimson: this.createRadialSprite(64, [
        [0.0, 'rgba(255, 130, 40, 0.92)'],
        [0.42, 'rgba(229, 37, 42, 0.65)'],
        [0.78, 'rgba(135, 14, 14, 0.24)'],
        [1.0, 'rgba(0, 0, 0, 0.0)']
      ]),
      ember: this.createRadialSprite(32, [
        [0.0, 'rgba(255, 255, 245, 1.0)'],
        [0.30, 'rgba(255, 182, 60, 0.88)'],
        [0.68, 'rgba(255, 70, 18, 0.28)'],
        [1.0, 'rgba(0, 0, 0, 0.0)']
      ]),
      smoke: this.createRadialSprite(96, [
        [0.0, 'rgba(58, 26, 24, 0.36)'],
        [0.45, 'rgba(32, 18, 18, 0.18)'],
        [0.80, 'rgba(18, 14, 14, 0.06)'],
        [1.0, 'rgba(0, 0, 0, 0.0)']
      ])
    };
  }

  createRadialSprite(size, stops) {
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const octx = offscreen.getContext('2d');
    const half = size * 0.5;
    const grad = octx.createRadialGradient(half, half, 0, half, half, half);

    for (let i = 0; i < stops.length; i++) {
      grad.addColorStop(stops[i][0], stops[i][1]);
    }

    octx.fillStyle = grad;
    octx.fillRect(0, 0, size, size);
    return offscreen;
  }

  /* ---------------------------------------------------------
   * Passive Input Listeners (Desktop + Mobile, Zero Interference)
   * --------------------------------------------------------- */
  initListeners() {
    window.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('pointerup', this._onPointerUp, { passive: true });
    window.addEventListener('pointercancel', this._onPointerCancel, { passive: true });
    document.addEventListener('click', this._onClick, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });

    if (typeof this.motionQuery.addEventListener === 'function') {
      this.motionQuery.addEventListener('change', this._onMotionChange);
    }
  }

  handleMotionChange(e) {
    this.isReducedMotion = e.matches;
    this.maxParticles = this.isReducedMotion ? 70 : (this.isMobile ? 140 : 280);
    this.maxGlows = this.isReducedMotion ? 4 : (this.isMobile ? 8 : 12);
  }

  handleResize() {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.isMobile = this.viewportWidth <= 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    this.maxParticles = this.isReducedMotion ? 70 : (this.isMobile ? 140 : 280);

    if (!this.canvas || !this.ctx) return;

    const maxDpr = this.isMobile ? 1.5 : 2.0;
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    // Resize internal canvas pixel buffer via intrinsic attributes (never inline style)
    this.canvas.width = Math.max(1, Math.floor(this.viewportWidth * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.viewportHeight * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  handlePointerDown(e) {
    if (this.isDisposed) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Clear prior click dedup so fast consecutive pointer clicks always register
    this._lastPointerTrigger = null;
    this._activePointer = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      moved: false
    };
  }

  handlePointerMove(e) {
    if (!this._activePointer || e.pointerId !== this._activePointer.id) return;
    const dx = e.clientX - this._activePointer.x;
    const dy = e.clientY - this._activePointer.y;
    // Ignore touch scrolling / drag gestures exceeding 10px movement threshold
    if (dx * dx + dy * dy > 100) {
      this._activePointer.moved = true;
    }
  }

  handlePointerCancel(e) {
    if (this._activePointer && e.pointerId === this._activePointer.id) {
      this._activePointer = null;
    }
  }

  handlePointerUp(e) {
    if (this.isDisposed) return;
    if (!this._activePointer || e.pointerId !== this._activePointer.id) return;

    const down = this._activePointer;
    this._activePointer = null;

    if (down.moved) return;
    if (performance.now() - down.time > 650) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const x = e.clientX;
    const y = e.clientY;
    this._lastPointerTrigger = { time: performance.now(), x, y };
    this.triggerAt(x, y, e.target);
  }

  handleClick(e) {
    if (this.isDisposed) return;

    // Skip programmatic .click() / keyboard activations without pointer coordinates
    if (e.clientX === 0 && e.clientY === 0 && e.detail === 0) {
      return;
    }

    // Deduplicate click event paired with the pointerup that already spawned this burst
    if (this._lastPointerTrigger) {
      const dt = performance.now() - this._lastPointerTrigger.time;
      const dx = e.clientX - this._lastPointerTrigger.x;
      const dy = e.clientY - this._lastPointerTrigger.y;
      this._lastPointerTrigger = null;
      if (dt < 450 && (dx * dx + dy * dy) < 324) {
        return;
      }
    }

    this.triggerAt(e.clientX, e.clientY, e.target);
  }

  /* ---------------------------------------------------------
   * Burst Spawning & Audio Synchronization
   * --------------------------------------------------------- */
  triggerAt(clientX, clientY, target = null) {
    const isFixedTarget = Boolean(
      target &&
      typeof target.closest === 'function' &&
      target.closest('.site-header, .dragon-intro-overlay, .dragon-hud-btn, .dragon-loading-indicator')
    );

    this.spawnBurst(clientX, clientY, {
      fixed: isFixedTarget,
      playSound: this.shouldPlayClickAudio(target)
    });
  }

  shouldPlayClickAudio(target) {
    if (!target || typeof target.closest !== 'function') return true;
    // Roar button must keep roar exclusive; sound button handles mute/unmute transitions cleanly
    if (target.closest('#dragon-roar-btn, #dragon-sound-btn')) {
      return false;
    }
    // Coordinate with existing Hero Dragon Fire Breath so audio doesn't double-layer on a single click
    const scene = window.__DRAGON_SCENE__;
    if (scene && (scene.state === 'FLYING' || scene.state === 'RECOVERING')) {
      if (target.closest('#dragon-fire-btn')) {
        return false;
      }
      const overlay = document.getElementById('dragon-intro-overlay');
      const overlayDismissed = !overlay || overlay.classList.contains('is-dismissed');
      if (
        overlayDismissed &&
        target.closest('#hero') &&
        !target.closest('a, button, input, textarea')
      ) {
        return false;
      }
    }
    return true;
  }

  getAudioManager() {
    if (window.__DRAGON_AUDIO__) return window.__DRAGON_AUDIO__;
    if (!this._ownedAudio) {
      this._ownedAudio = new DragonAudio();
    }
    return this._ownedAudio;
  }

  spawnBurst(clientX, clientY, options = {}) {
    if (this.isDisposed) return;
    if (!this.ensureGraphicsReady()) return;

    const isFixed = Boolean(options.fixed);
    const originX = isFixed ? clientX : clientX + window.scrollX;
    const originY = isFixed ? clientY : clientY + window.scrollY;

    this._burstCount += 1;

    // 1. Soft Ambient Glow Flash
    if (this.glows.length >= this.maxGlows) {
      this.glows.shift();
    }
    this.glows.push({
      x: originX,
      y: originY,
      fixed: isFixed,
      age: 0,
      maxLife: this.isReducedMotion ? 0.9 : 1.35,
      baseRadius: this.isMobile ? 64 : 88,
      seed: Math.random() * Math.PI * 2
    });

    // 2. Particle Composition (Flame Core, Plumes, Rising Embers, Subtle Smoke)
    if (this.isReducedMotion) {
      this.emitGroup(originX, originY, isFixed, 'core', 2);
      this.emitGroup(originX, originY, isFixed, 'flame', 3);
      this.emitGroup(originX, originY, isFixed, 'ember', 4);
    } else if (this.isMobile) {
      this.emitGroup(originX, originY, isFixed, 'smoke', 2);
      this.emitGroup(originX, originY, isFixed, 'core', 3);
      this.emitGroup(originX, originY, isFixed, 'flame', 8);
      this.emitGroup(originX, originY, isFixed, 'ember', 9);
    } else {
      this.emitGroup(originX, originY, isFixed, 'smoke', 4);
      this.emitGroup(originX, originY, isFixed, 'core', 4);
      this.emitGroup(originX, originY, isFixed, 'flame', 14);
      this.emitGroup(originX, originY, isFixed, 'ember', 16);
    }

    // Enforce global active particle budget to safeguard steady 60 FPS under rapid clicking
    while (this.particles.length > this.maxParticles) {
      this.particles.shift();
    }

    // Synchronized Fire Crackling Segment Audio
    if (options.playSound !== false) {
      const audio = this.getAudioManager();
      if (audio && typeof audio.playClickFire === 'function') {
        audio.playClickFire();
      }
    }

    this.startLoop();
  }

  emitGroup(x, y, fixed, kind, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = (Math.random() * 0.7 + 0.3);

      if (kind === 'core') {
        this.particles.push({
          kind: 'core',
          spriteKey: 'core',
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          fixed,
          vx: Math.cos(angle) * 28 * spread,
          vy: Math.sin(angle) * 18 * spread - 25,
          buoyancy: -85,
          drag: 4.0,
          age: 0,
          maxLife: 0.55 + Math.random() * 0.35,
          sizeStart: 18 + Math.random() * 12,
          sizePeak: 36 + Math.random() * 14,
          sizeEnd: 4,
          alphaPeak: 0.92,
          swayAmp: 6,
          swayFreq: 5.0 + Math.random() * 4.0,
          seed: Math.random() * Math.PI * 2
        });
      } else if (kind === 'flame') {
        const useCrimson = Math.random() > 0.58;
        this.particles.push({
          kind: 'flame',
          spriteKey: useCrimson ? 'crimson' : 'flame',
          x: x + (Math.random() - 0.5) * 14,
          y: y + (Math.random() - 0.5) * 10,
          fixed,
          vx: Math.cos(angle) * 65 * spread,
          vy: Math.sin(angle) * 35 * spread - (35 + Math.random() * 35),
          buoyancy: -(95 + Math.random() * 65),
          drag: 3.2,
          age: 0,
          maxLife: 0.95 + Math.random() * 0.75,
          sizeStart: 14 + Math.random() * 10,
          sizePeak: 30 + Math.random() * 16,
          sizeEnd: 3,
          alphaPeak: 0.78,
          swayAmp: 12 + Math.random() * 12,
          swayFreq: 3.5 + Math.random() * 3.5,
          seed: Math.random() * Math.PI * 2
        });
      } else if (kind === 'ember') {
        this.particles.push({
          kind: 'ember',
          spriteKey: 'ember',
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          fixed,
          vx: Math.cos(angle) * (40 + Math.random() * 75),
          vy: Math.sin(angle) * 45 - (55 + Math.random() * 60),
          buoyancy: -(60 + Math.random() * 65),
          drag: 1.6,
          age: 0,
          maxLife: 1.50 + Math.random() * 0.85,
          sizeStart: 4 + Math.random() * 6,
          sizePeak: 6 + Math.random() * 6,
          sizeEnd: 1.0,
          alphaPeak: 0.95,
          swayAmp: 16 + Math.random() * 18,
          swayFreq: 3.0 + Math.random() * 4.0,
          flickerSpeed: 14 + Math.random() * 12,
          seed: Math.random() * Math.PI * 2
        });
      } else {
        // Subtle rising charcoal-red smoke puff
        this.particles.push({
          kind: 'smoke',
          spriteKey: 'smoke',
          x: x + (Math.random() - 0.5) * 16,
          y: y - 4 + (Math.random() - 0.5) * 10,
          fixed,
          vx: (Math.random() - 0.5) * 26,
          vy: -(24 + Math.random() * 24),
          buoyancy: -22,
          drag: 1.4,
          age: 0,
          maxLife: 1.60 + Math.random() * 0.80,
          sizeStart: 20 + Math.random() * 10,
          sizePeak: 50 + Math.random() * 22,
          sizeEnd: 62 + Math.random() * 22,
          alphaPeak: 0.16,
          swayAmp: 14 + Math.random() * 10,
          swayFreq: 1.8 + Math.random() * 1.5,
          seed: Math.random() * Math.PI * 2
        });
      }
    }
  }

  /* ---------------------------------------------------------
   * Single Shared Animation Loop (Auto-Sleeps When Empty)
   * --------------------------------------------------------- */
  startLoop() {
    if (this.rafId !== null || this.isDisposed) return;
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this._tick);
  }

  tick(now) {
    if (this.isDisposed) return;

    const delta = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) * 0.001));
    this.lastFrameTime = now;

    this.updateAndRender(delta);

    if (this.particles.length > 0 || this.glows.length > 0) {
      this.rafId = requestAnimationFrame(this._tick);
    } else {
      // Nothing burning: clear cleanly and sleep until next click
      this.ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
      this.rafId = null;
    }
  }

  updateAndRender(delta) {
    const ctx = this.ctx;
    if (!ctx || !this.sprites) return;

    ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);

    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    // 1. Update & Draw Smoke Pass (Normal Blending Underneath Flames)
    ctx.globalCompositeOperation = 'source-over';
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;
      const t = p.age / p.maxLife;

      if (t >= 1.0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration (drag + upward buoyancy + curl sway)
      const damp = Math.exp(-p.drag * delta);
      p.vx *= damp;
      p.vy = p.vy * damp + p.buoyancy * delta;

      p.x += p.vx * delta + Math.sin(p.age * p.swayFreq + p.seed) * p.swayAmp * delta;
      p.y += p.vy * delta;

      if (p.kind !== 'smoke') continue;

      const screenX = p.fixed ? p.x : p.x - scrollX;
      const screenY = p.fixed ? p.y : p.y - scrollY;
      if (screenX < -100 || screenX > this.viewportWidth + 100 || screenY < -100 || screenY > this.viewportHeight + 100) {
        continue;
      }

      const alpha = t < 0.25
        ? p.alphaPeak * (t / 0.25)
        : p.alphaPeak * Math.pow(1 - (t - 0.25) / 0.75, 1.5);
      const size = p.sizeStart + (p.sizeEnd - p.sizeStart) * Math.pow(t, 0.7);

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.drawImage(this.sprites.smoke, screenX - size * 0.5, screenY - size * 0.5, size, size);
    }

    // 2. Additive Pass for Soft Fire Glow + Flames + Sparks
    ctx.globalCompositeOperation = 'lighter';

    for (let i = this.glows.length - 1; i >= 0; i--) {
      const g = this.glows[i];
      g.age += delta;
      const t = g.age / g.maxLife;
      if (t >= 1.0) {
        this.glows.splice(i, 1);
        continue;
      }

      const screenX = g.fixed ? g.x : g.x - scrollX;
      const screenY = g.fixed ? g.y : g.y - scrollY;
      if (screenX < -180 || screenX > this.viewportWidth + 180 || screenY < -180 || screenY > this.viewportHeight + 180) {
        continue;
      }

      const expand = t < 0.14 ? (0.45 + 0.55 * (t / 0.14)) : (1.0 - 0.25 * (t - 0.14));
      const flicker = 0.88 + 0.12 * Math.sin(g.age * 24 + g.seed);
      const alpha = (t < 0.1 ? t / 0.1 : Math.pow(1 - (t - 0.1) / 0.9, 1.6)) * 0.46 * flicker;
      const diameter = g.baseRadius * 2.1 * expand;

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.drawImage(this.sprites.glow, screenX - diameter * 0.5, screenY - diameter * 0.5, diameter, diameter);
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.kind === 'smoke') continue;

      const t = p.age / p.maxLife;
      const screenX = p.fixed ? p.x : p.x - scrollX;
      const screenY = p.fixed ? p.y : p.y - scrollY;

      if (screenX < -80 || screenX > this.viewportWidth + 80 || screenY < -80 || screenY > this.viewportHeight + 80) {
        continue;
      }

      // Expand rapidly on ignition, then shrink gracefully to vanish
      let size;
      if (t < 0.18) {
        const up = t / 0.18;
        size = p.sizeStart + (p.sizePeak - p.sizeStart) * up;
      } else {
        const down = (t - 0.18) / 0.82;
        size = p.sizePeak + (p.sizeEnd - p.sizePeak) * Math.pow(down, 1.25);
      }

      let alpha = t < 0.12
        ? p.alphaPeak * (0.4 + 0.6 * (t / 0.12))
        : p.alphaPeak * Math.pow(1 - (t - 0.12) / 0.88, 1.55);

      if (p.kind === 'ember' && p.flickerSpeed) {
        alpha *= 0.65 + 0.35 * Math.sin(p.age * p.flickerSpeed + p.seed);
      }

      const sprite = this.sprites[p.spriteKey] || this.sprites.flame;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      if (p.kind === 'flame') {
        const w = size * 0.78;
        const h = size * (1.35 + 0.2 * Math.sin(p.age * 16 + p.seed));
        ctx.drawImage(sprite, screenX - w * 0.5, screenY - h * 0.6, w, h);
      } else if (p.kind === 'core') {
        const w = size * 0.86;
        const h = size * 1.18;
        ctx.drawImage(sprite, screenX - w * 0.5, screenY - h * 0.55, w, h);
      } else if (p.kind === 'ember') {
        const speed = Math.hypot(p.vx, p.vy);
        const h = size * (1.0 + Math.min(1.4, speed / 95));
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(Math.atan2(p.vx, -p.vy) * 0.6);
        ctx.drawImage(sprite, -size * 0.5, -h * 0.5, size, h);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, screenX - size * 0.5, screenY - size * 0.5, size, size);
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------------------------------------------------
   * Status Telemetry & Complete Disposal
   * --------------------------------------------------------- */
  getStats() {
    return {
      activeParticles: this.particles.length,
      activeGlows: this.glows.length,
      totalBurstsSpawned: this._burstCount,
      isLoopRunning: this.rafId !== null,
      maxParticles: this.maxParticles,
      isReducedMotion: this.isReducedMotion,
      isMobile: this.isMobile
    };
  }

  dispose() {
    this.isDisposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    window.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerCancel);
    document.removeEventListener('click', this._onClick);
    window.removeEventListener('resize', this._onResize);

    if (typeof this.motionQuery.removeEventListener === 'function') {
      this.motionQuery.removeEventListener('change', this._onMotionChange);
    }

    this.particles.length = 0;
    this.glows.length = 0;
    this.sprites = null;

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    }

    if (this._ownedAudio) {
      this._ownedAudio.dispose();
      this._ownedAudio = null;
    }

    delete window.__CLICK_FIRE__;
  }
}

export function initClickFire() {
  return new ClickFireSystem();
}
