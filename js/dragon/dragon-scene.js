/**
 * Dragon Scene Manager (Phase 2 & 3 Integration)
 * Initializes Three.js scene, camera, lighting, GLB loader, and animation loop.
 */

import * as THREE from '../libs/three.module.js';
import { DragonLoader } from './dragon-loader.js?v=3';
import { DragonAnimationController } from './dragon-animation.js';
import { DragonEffects } from './dragon-effects.js';
import { DragonAudio } from './dragon-audio.js';
import { DragonInteractions } from './dragon-interactions.js';
import { DragonScrollController } from './dragon-scroll.js';
import { DragonUI } from './dragon-ui.js';

export const DragonState = {
  IDLE: 'IDLE',
  FLYING: 'FLYING',
  ROARING: 'ROARING',
  FIRE_BREATHING: 'FIRE_BREATHING',
  RECOVERING: 'RECOVERING'
};

export class DragonScene {
  constructor() {
    this.container = document.getElementById('dragon-canvas-container');
    if (!this.container) return;

    // Check WebGL availability
    if (!this.isWebGLAvailable()) {
      console.warn('WebGL is unavailable on this device; disabling 3D dragon.');
      this.container.classList.add('webgl-failed');
      this.hideLoadingIndicator();
      return;
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.dragonPivot = null;
    this.basePivotPos = null;
    this.basePivotRot = null;
    this.dragonBones = null;
    this.headBone = null;
    this.headCluster = [];
    this.jawBone = null;
    this.jawChinBone = null;
    this.mouthSnoutBone = null;

    // Animation state machine & procedural jaw rig
    this.state = DragonState.FLYING;
    this.stateTimer = 0;
    this.stateDuration = 0;
    this.actionCooldown = 0;
    this.currentJawOpen = 0.0;
    this.targetJawOpen = 0.0;
    this.currentHeadPitchElev = 0.0;
    this.targetHeadPitchElev = 0.0;
    this.fireTotalDuration = 2.4;
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.currentCameraTarget = new THREE.Vector3(0, 0, 0);
    this.targetCameraPos = new THREE.Vector3(0, 0.5, 9.5);
    this.currentCameraPos = new THREE.Vector3(0, 0.5, 9.5);
    this._headWorldPos = new THREE.Vector3();
    this._tempVec = new THREE.Vector3();
    this._tempLookAt = new THREE.Vector3();
    this._tempCamPos = new THREE.Vector3();
    this._isHeadTrackingInitialized = false;
    this.animationController = null;
    this.isTabVisible = true;
    this.isHeroVisible = true;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isDisposed = false;
    this.textTrackingElements = [];

    this.initScene();
    this.initLights();
    this.effects = new DragonEffects(this.scene, this.camera);
    this.audio = new DragonAudio();
    this.interactions = new DragonInteractions(this);
    this.scrollController = new DragonScrollController(this);
    this.ui = new DragonUI(this);
    this.initTextTracking();
    this.loadDragon();
    this.initEvents();
    this.animate();

    window.__DRAGON_SCENE__ = this;
    window.THREE = THREE;
  }

  isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    // Transparent background so existing website dark theme and gradients show through
    this.scene.background = null;

    // Dimensions from hero canvas container
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Camera setup
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.updateCameraForViewport();

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: window.devicePixelRatio < 2,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    // Performance Optimization (Phase 10): Limit DPR to 1.5 on mobile/touch, 2.0 on desktop
    const isMobileDevice = width <= 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    const maxDpr = isMobileDevice ? 1.5 : 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  getResponsiveCameraConfig() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / height;

    let distance = 8.4;
    let xOffset = 0.35;
    let yOffset = -0.2;
    let fov = 45;

    if (width <= 480) {
      // Mobile Portrait (e.g. 360x800, 390x844)
      distance = 11.2;
      xOffset = 0.0;
      yOffset = -0.1;
      fov = 50;
    } else if (width <= 768) {
      // Tablet Portrait / Large Mobile (e.g. 768x1024)
      distance = 9.8;
      xOffset = 0.2;
      yOffset = -0.15;
      fov = 48;
    } else if (width <= 1024) {
      // Tablet Landscape / Small Laptop (e.g. 1024x768)
      distance = 9.0;
      xOffset = 0.25;
      yOffset = -0.2;
      fov = 46;
    } else if (width <= 1400) {
      // Laptop (e.g. 1280x720, 1366x768)
      distance = 8.6;
      xOffset = 0.35;
      yOffset = -0.2;
      fov = 45;
    } else {
      // Desktop (e.g. 1920x1080)
      distance = 8.2;
      xOffset = 0.35;
      yOffset = -0.2;
      fov = 45;
    }

    return { distance, xOffset, yOffset, fov, aspect, width, height };
  }

  updateCameraForViewport() {
    const config = this.getResponsiveCameraConfig();
    this.camera.fov = config.fov;
    this.camera.aspect = config.aspect;
    this.camera.updateProjectionMatrix();
  }

  initLights() {
    // 1. Ambient darkness (low light to keep crevices pitch black like the reference)
    const ambientLight = new THREE.AmbientLight(0x220505, 1.4);
    this.scene.add(ambientLight);

    // 2. Dramatic Crimson Key Light
    const keyLight = new THREE.DirectionalLight(0xe5252a, 4.0);
    keyLight.position.set(8, 12, 6);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // 3. Counter Fill Light (Dark violet/charcoal for realistic depth)
    const fillLight = new THREE.DirectionalLight(0x1a1530, 1.4);
    fillLight.position.set(-8, -4, -4);
    this.scene.add(fillLight);

    // 4. Rim Backlight for edge definition
    const rimLight = new THREE.DirectionalLight(0xff3333, 2.5);
    rimLight.position.set(2, 6, -10);
    this.scene.add(rimLight);

    // 5. Front-Left Sculpting Light for Head, Face, Eyes, Horns and Whiskers
    const frontHeadLight = new THREE.DirectionalLight(0xff4444, 2.8);
    frontHeadLight.position.set(-6, 8, 8);
    this.scene.add(frontHeadLight);
  }

  initTextTracking() {
    this.textTrackingElements = Array.from(
      document.querySelectorAll('.hero-tagline, .hero-title, .hero-description, .hero-actions')
    );
  }

  loadDragon() {
    const loader = new DragonLoader({
      modelPath: 'assets/dragon/models/chinese_dragon.glb',
      onProgress: (percent, loaded, total) => {
        const label = document.getElementById('dragon-loading-label');
        if (label) {
          label.textContent = `Awakening Dragon (${percent}%)`;
        }
      },
      onLoad: (result) => {
        this.dragonPivot = result.model;
        this.basePivotPos = result.model.position.clone();
        this.basePivotRot = result.model.rotation.clone();
        this.dragonBones = result.bones || [];
        this.scene.add(this.dragonPivot);

        // Identify primary head bone and head cluster bones (horns, snout, eyes, whiskers)
        this.headBone = this.dragonBones.find(b => b.name === 'drgon_025') || null;
        this.jawBone = this.dragonBones.find(b => b.name === 'drgon_064') || null;
        this.jawChinBone = this.dragonBones.find(b => b.name === 'drgon_065') || null;
        this.mouthSnoutBone = this.dragonBones.find(b => b.name === 'drgon_054') || null;

        if (this.headBone) {
          this.headCluster = this.dragonBones.filter(b => {
            return b === this.headBone ||
                   b.parent === this.headBone ||
                   (b.parent && b.parent.parent === this.headBone);
          });
        }

        // Initialize Animation Controller with Take 001
        this.animationController = new DragonAnimationController(result.rawScene, result.animations);

        // Attach visual effects (Phase 5: red eye glow + jaw reference for flame emitter)
        if (this.effects) {
          this.effects.attachEyeGlow(this.headBone, this.dragonPivot, this.jawBone);
        }

        // Hide loading indicator with smooth fade
        this.hideLoadingIndicator();
        window.__DRAGON_READY__ = true;
        console.log('✅ Chinese Dragon 3D Model and Animation successfully initialized in portfolio scene.');
      },
      onError: (err) => {
        console.error('Failed to load dragon model:', err);
        this.container.classList.add('webgl-failed');
        this.hideLoadingIndicator();
      }
    });

    loader.load();
  }

  hideLoadingIndicator() {
    const indicator = document.getElementById('dragon-loading-indicator');
    if (indicator) {
      indicator.classList.add('is-hidden');
    }
  }

  initEvents() {
    // Window resize tracking hero container bounds (Phase 10: DPR recalculation on resize)
    this._onResize = () => {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = width / height;
      this.updateCameraForViewport();
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      const isMobile = width <= 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
      const maxDpr = isMobile ? 1.5 : 2.0;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    };
    window.addEventListener('resize', this._onResize);

    // Page Visibility API (pause rendering loop and mixer ticks when tab is backgrounded)
    this._onVisibilityChange = () => {
      this.isTabVisible = !document.hidden;
      if (this.isTabVisible && this.isHeroVisible) {
        this.clock.start();
        if (this.animationController) this.animationController.resume();
      } else {
        this.clock.stop();
        if (this.animationController) this.animationController.pause();
      }
    };
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    // Hero Visibility Observer: Confine dragon to hero section (0% GPU bleed into About Me or lower)
    this.heroEl = document.getElementById('hero');
    if (this.heroEl && 'IntersectionObserver' in window) {
      this.heroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          this.isHeroVisible = entry.isIntersecting;
          if (this.isHeroVisible && this.isTabVisible) {
            this.clock.start();
            if (this.animationController) this.animationController.resume();
          } else {
            if (this.animationController) this.animationController.pause();
          }
        });
      }, { threshold: 0.01 });
      this.heroObserver.observe(this.heroEl);
    }

    // Interactive fire effect on hero click (excluding navigation/button clicks)
    if (this.heroEl) {
      this._onHeroClick = (e) => {
        if (e.target.closest('a, button, input, textarea')) return;
        this.triggerFire();
      };
      this.heroEl.addEventListener('click', this._onHeroClick);

      // Double-click to trigger dragon roar
      this._onHeroDblClick = (e) => {
        if (e.target.closest('a, button, input, textarea')) return;
        this.triggerRoar();
      };
      this.heroEl.addEventListener('dblclick', this._onHeroDblClick);
    }
  }

  triggerFire(duration = 2.4) {
    if (this.state === DragonState.ROARING || this.state === DragonState.FIRE_BREATHING) {
      return;
    }

    this.fireTotalDuration = Math.max(1.8, Math.min(3.5, duration));
    this.state = DragonState.FIRE_BREATHING;
    this.stateTimer = 0;

    // Trigger visual flame stream and camera shake
    if (this.effects) {
      this.effects.triggerFire(this.fireTotalDuration);
      this.effects.setEyeGlowIntensity(2.2);
      setTimeout(() => {
        if (this.effects) this.effects.setEyeGlowIntensity(1.0);
      }, (this.fireTotalDuration + 0.3) * 1000);
    }

    // Synchronize fire crackling and flame burst audio with smooth fade
    if (this.audio) {
      this.audio.play('fire_blast', { volume: 0.55 });
      this.audio.play('fire_crackling', { loop: true, fadeIn: 0.25, volume: 0.45 });

      // Smooth fade-out when fire breathing finishes
      setTimeout(() => {
        if (this.audio) {
          this.audio.stopWithFade('fire_crackling', 0.4);
        }
      }, Math.max(100, (this.fireTotalDuration - 0.45) * 1000));
    }
  }

  triggerRoar() {
    if (this.state === DragonState.ROARING || this.state === DragonState.FIRE_BREATHING) {
      return;
    }

    this.state = DragonState.ROARING;
    this.stateTimer = 0;

    // Synchronize roar audio as mouth begins opening (~200ms)
    setTimeout(() => {
      if (this.audio && this.state === DragonState.ROARING) {
        this.audio.play('roar', { volume: 1.0 });
      }
    }, 200);

    if (this.effects) {
      this.effects.triggerCameraShake(0.22, 1.2);
      this.effects.setEyeGlowIntensity(2.6);
      setTimeout(() => {
        if (this.effects) this.effects.setEyeGlowIntensity(1.0);
      }, 2400);
    }
  }

  triggerGrowl() {
    if (this.audio) {
      this.audio.play('growl');
    }
    if (this.effects) {
      this.effects.setEyeGlowIntensity(1.6);
      setTimeout(() => {
        if (this.effects) this.effects.setEyeGlowIntensity(1.0);
      }, 1200);
    }
  }

  triggerCameraShake(intensity = 0.15, duration = 0.5) {
    if (this.effects) {
      this.effects.triggerCameraShake(intensity, duration);
    }
  }

  /* ---------------------------------------------------------
   * Continuous Organic Movement & Procedural Breathing
   * --------------------------------------------------------- */
  updateContinuousMovement(delta) {
    if (this.isReducedMotion) return;
    const time = this.clock.getElapsedTime();

    // Gentle chest & body breathing cycle
    if (this.dragonPivot && this.basePivotPos) {
      const breath = Math.sin(time * 1.6) * 0.025;
      this.dragonPivot.position.y += breath;
    }
  }

  /* ---------------------------------------------------------
   * Jaw Rig Animation & Action State Machine
   * --------------------------------------------------------- */
  updateAnimationStates(delta) {
    if (this.actionCooldown > 0) {
      this.actionCooldown -= delta;
    }

    switch (this.state) {
      case DragonState.ROARING: {
        this.stateTimer += delta;
        const t = this.stateTimer;
        const totalDur = 3.45; // Match 3.45s roar audio

        // Phase 1: Mouth opening (400-700ms) & Head raising
        if (t < 0.5) {
          const p = t / 0.5;
          const ease = 1 - Math.pow(1 - p, 3);
          this.targetJawOpen = ease * 0.85;
          this.targetHeadPitchElev = ease * 0.24; // ~14 degrees pitch up
        }
        // Phase 2: Mouth holding (800-1200ms) & organic roar vibration
        else if (t < 2.85) {
          const tremor = Math.sin(t * 30.0) * 0.04 + Math.sin(t * 16.0) * 0.02;
          this.targetJawOpen = 0.85 + tremor;
          this.targetHeadPitchElev = 0.24 + Math.sin(t * 8.0) * 0.02;
        }
        // Phase 3: Mouth closing (400-600ms) & Head returning
        else if (t < totalDur) {
          const p = (t - 2.85) / (totalDur - 2.85);
          const ease = p * p;
          this.targetJawOpen = 0.85 * (1 - ease);
          this.targetHeadPitchElev = 0.24 * (1 - ease);
        }
        // Phase 4: Transition to recovering
        else {
          this.state = DragonState.RECOVERING;
          this.stateTimer = 0;
          this.stateDuration = 0.4;
          this.targetJawOpen = 0;
          this.targetHeadPitchElev = 0;
        }
        break;
      }

      case DragonState.FIRE_BREATHING: {
        this.stateTimer += delta;
        const t = this.stateTimer;
        const totalDur = this.fireTotalDuration || 2.4;

        // Phase 1: Mouth opens wider than roar (0.0s - 0.5s)
        if (t < 0.5) {
          const p = t / 0.5;
          const ease = 1 - Math.pow(1 - p, 3);
          this.targetJawOpen = ease * 1.05; // Full open for fire stream
          this.targetHeadPitchElev = ease * 0.28;
        }
        // Phase 2: Fire breath stream (0.5s to totalDur - 0.5s)
        else if (t < totalDur - 0.5) {
          const flameFlicker = Math.sin(t * 22.0) * 0.03;
          this.targetJawOpen = 1.05 + flameFlicker;
          this.targetHeadPitchElev = 0.28;
        }
        // Phase 3: Mouth closing smoothly (400-600ms)
        else if (t < totalDur) {
          const p = (t - (totalDur - 0.5)) / 0.5;
          const ease = p * p;
          this.targetJawOpen = 1.05 * (1 - ease);
          this.targetHeadPitchElev = 0.28 * (1 - ease);
        }
        // Phase 4: Recovering
        else {
          this.state = DragonState.RECOVERING;
          this.stateTimer = 0;
          this.stateDuration = 0.4;
          this.targetJawOpen = 0;
          this.targetHeadPitchElev = 0;
        }
        break;
      }

      case DragonState.RECOVERING: {
        this.stateTimer += delta;
        if (this.stateTimer >= this.stateDuration) {
          this.state = DragonState.FLYING;
          this.stateTimer = 0;
          this.actionCooldown = 1.2; // 1.2s cooldown prevents repetitive robotic triggers
        }
        break;
      }

      default: {
        // Idle/Flying: mouth naturally closed
        this.targetJawOpen = 0;
        this.targetHeadPitchElev = 0;
        break;
      }
    }

    // Smooth exponential damping
    const lerpFactor = 1.0 - Math.exp(-14.0 * delta);
    this.currentJawOpen += (this.targetJawOpen - this.currentJawOpen) * lerpFactor;
    this.currentHeadPitchElev += (this.targetHeadPitchElev - this.currentHeadPitchElev) * lerpFactor;

    // Apply jaw rotation strictly along the bilateral hinge axis (local Y axis)
    // Rotating around the local Y axis maintains 100% bilateral facial symmetry across Y = 0
    if (this.jawBone) {
      this.jawBone.rotation.y += this.currentJawOpen * 0.38;
    }

    // Apply head elevation along the bilateral pitch axis without lateral tilting
    if (this.headBone && this.currentHeadPitchElev > 0.001) {
      this.headBone.rotation.y += this.currentHeadPitchElev * 0.15;
    }
  }

  updateTextBehindOcclusion() {
    if (!this.dragonBones || this.dragonBones.length === 0 || !this.camera) return;
    if (!this.textTrackingElements || this.textTrackingElements.length === 0) return;

    const camera = this.camera;
    const tempVec = this._occlusionTempVec || (this._occlusionTempVec = new THREE.Vector3());
    const screenVec = this._occlusionScreenVec || (this._occlusionScreenVec = new THREE.Vector3());
    const step = 4; // Sample every 4th bone along the 273-bone spine for performance
    const boneCount = this.dragonBones.length;

    const elementsData = [];
    for (let i = 0; i < this.textTrackingElements.length; i++) {
      const el = this.textTrackingElements[i];
      elementsData.push({
        el,
        rect: el.getBoundingClientRect(),
        isBehind: false
      });
    }

    const rect = this.container.getBoundingClientRect();
    const halfWidth = rect.width * 0.5;
    const halfHeight = rect.height * 0.5;
    const padding = 20; // 20px dragon body radius

    for (let i = 0; i < boneCount; i += step) {
      const bone = this.dragonBones[i];
      bone.getWorldPosition(tempVec);

      // Project into NDC [-1, 1]
      screenVec.copy(tempVec).project(camera);

      // Skip if outside viewport or behind camera
      if (screenVec.z > 1 || screenVec.z < -1) continue;

      // Convert to viewport pixel coordinates relative to viewport
      const px = screenVec.x * halfWidth + halfWidth + rect.left;
      const py = -screenVec.y * halfHeight + halfHeight + rect.top;

      // Check overlap against text elements
      for (let j = 0; j < elementsData.length; j++) {
        const item = elementsData[j];
        const r = item.rect;
        if (
          px >= r.left - padding &&
          px <= r.right + padding &&
          py >= r.top - padding &&
          py <= r.bottom + padding
        ) {
          item.isBehind = true;
        }
      }
    }

    // Toggle .is-behind-dragon purely via external CSS (strictly zero inline styles)
    for (let j = 0; j < elementsData.length; j++) {
      const item = elementsData[j];
      if (item.isBehind) {
        if (!item.el.classList.contains('is-behind-dragon')) {
          item.el.classList.add('is-behind-dragon');
        }
      } else {
        if (item.el.classList.contains('is-behind-dragon')) {
          item.el.classList.remove('is-behind-dragon');
        }
      }
    }
  }

  updateHeadTracking(delta) {
    if (!this.headCluster || this.headCluster.length === 0 || !this.camera) return;

    // 1. Calculate center of mass of the head cluster in world space
    const headWorld = this._headWorldPos.set(0, 0, 0);
    const temp = this._tempVec;
    const count = this.headCluster.length;
    for (let i = 0; i < count; i++) {
      this.headCluster[i].getWorldPosition(temp);
      headWorld.add(temp);
    }
    headWorld.divideScalar(count);

    // 2. Responsive parameters
    const config = this.getResponsiveCameraConfig();

    // 3. Compute desired camera target (lookAt point) and position
    const targetLookAt = this._tempLookAt;
    targetLookAt.copy(headWorld);
    targetLookAt.x += config.xOffset;
    targetLookAt.y += config.yOffset;

    if (this.interactions) {
      const parallax = this.interactions.getParallaxOffset();
      targetLookAt.x += parallax.x;
      targetLookAt.y += parallax.y;
    }

    if (this.scrollController) {
      const scrollCam = this.scrollController.getCameraOffset();
      targetLookAt.x += scrollCam.x * 0.4;
      targetLookAt.y += scrollCam.y * 0.4;
    }

    const targetCamPos = this._tempCamPos;
    targetCamPos.set(
      targetLookAt.x + (this.scrollController ? this.scrollController.getCameraOffset().x * 0.6 : 0),
      targetLookAt.y + 0.25 + (this.scrollController ? this.scrollController.getCameraOffset().y * 0.6 : 0),
      targetLookAt.z + config.distance + (this.scrollController ? this.scrollController.getCameraOffset().z : 0)
    );

    // 4. Safe Zone Enforcement (8-12% horizontal and vertical screen padding)
    const cam = this.camera;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < count; i++) {
      this.headCluster[i].getWorldPosition(temp);
      temp.project(cam);
      if (temp.x < minX) minX = temp.x;
      if (temp.x > maxX) maxX = temp.x;
      if (temp.y < minY) minY = temp.y;
      if (temp.y > maxY) maxY = temp.y;
    }

    // Safe boundaries in NDC: [-0.80, 0.80] horizontally, [-0.80, 0.76] vertically (protecting navbar)
    const safeMinX = -0.80;
    const safeMaxX = 0.80;
    const safeMinY = -0.80;
    const safeMaxY = 0.76;

    if (minX < safeMinX) {
      const shift = (safeMinX - minX) * (config.distance * 0.4);
      targetLookAt.x -= shift;
      targetCamPos.x = targetLookAt.x;
    }
    if (maxX > safeMaxX) {
      const shift = (maxX - safeMaxX) * (config.distance * 0.4);
      targetLookAt.x += shift;
      targetCamPos.x = targetLookAt.x;
    }
    if (minY < safeMinY) {
      const shift = (safeMinY - minY) * (config.distance * 0.4);
      targetLookAt.y -= shift;
      targetCamPos.y = targetLookAt.y + 0.25;
    }
    if (maxY > safeMaxY) {
      const shift = (maxY - safeMaxY) * (config.distance * 0.4);
      targetLookAt.y += shift;
      targetCamPos.y = targetLookAt.y + 0.25;
    }

    // 5. Smooth Damped Interpolation (zero sudden jumps)
    if (!this._isHeadTrackingInitialized) {
      this.currentCameraPos.copy(targetCamPos);
      this.currentCameraTarget.copy(targetLookAt);
      this._isHeadTrackingInitialized = true;
    } else {
      const lerpFactor = 1.0 - Math.exp(-6.0 * delta);
      this.currentCameraPos.lerp(targetCamPos, lerpFactor);
      this.currentCameraTarget.lerp(targetLookAt, lerpFactor);
    }

    this.camera.position.copy(this.currentCameraPos);
    this.camera.lookAt(this.currentCameraTarget);
    this.camera.updateMatrixWorld(true);

    // Hard Safe Zone Enforcement: If any bone in the head cluster breaches the safe boundary,
    // immediately clamp camera position and target to guarantee head visibility
    let bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity;
    for (let i = 0; i < count; i++) {
      this.headCluster[i].getWorldPosition(temp);
      temp.project(this.camera);
      if (temp.x < bMinX) bMinX = temp.x;
      if (temp.x > bMaxX) bMaxX = temp.x;
      if (temp.y < bMinY) bMinY = temp.y;
      if (temp.y > bMaxY) bMaxY = temp.y;
    }

    let clampX = 0;
    let clampY = 0;
    if (bMinX < safeMinX) clampX = (safeMinX - bMinX) * (config.distance * 0.4);
    if (bMaxX > safeMaxX) clampX = (safeMaxX - bMaxX) * (config.distance * 0.4);
    if (bMinY < safeMinY) clampY = (safeMinY - bMinY) * (config.distance * 0.4);
    if (bMaxY > safeMaxY) clampY = (safeMaxY - bMaxY) * (config.distance * 0.4);

    if (clampX !== 0 || clampY !== 0) {
      this.currentCameraPos.x -= clampX;
      this.currentCameraTarget.x -= clampX;
      this.currentCameraPos.y -= clampY;
      this.currentCameraTarget.y -= clampY;
      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(this.currentCameraTarget);
    }
  }

  animate() {
    if (this.isDisposed) return;
    requestAnimationFrame(() => this.animate());

    if (!this.isTabVisible || !this.isHeroVisible) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Update 57.5s serpentine skeletal animation
    if (this.animationController) {
      this.animationController.update(delta);
    }

    // Continuous natural movement (breathing, head wander)
    this.updateContinuousMovement(delta);

    // Mouth, jaw, roar & fire breath animation state machine
    this.updateAnimationStates(delta);

    // Scroll interaction update (Phase 8: cinematic camera & dragon repositioning)
    if (this.scrollController) {
      this.scrollController.update(delta);
    }

    // Gentle global hover float & scroll repositioning (dampened for reduced motion)
    if (this.dragonPivot && this.basePivotPos) {
      const time = this.clock.getElapsedTime();
      const hoverFactor = this.isReducedMotion ? 0.02 : 0.08;
      const hoverY = Math.sin(time * 1.2) * hoverFactor;
      const scrollPos = this.scrollController ? this.scrollController.getDragonPosOffset() : null;
      const scrollRot = this.scrollController ? this.scrollController.getDragonRotOffset() : null;

      this.dragonPivot.position.x = this.basePivotPos.x + (scrollPos ? scrollPos.x : 0);
      this.dragonPivot.position.y = this.basePivotPos.y + hoverY + (scrollPos ? scrollPos.y : 0);
      this.dragonPivot.position.z = this.basePivotPos.z + (scrollPos ? scrollPos.z : 0);

      if (this.basePivotRot && scrollRot) {
        this.dragonPivot.rotation.x = this.basePivotRot.x + scrollRot.x;
        this.dragonPivot.rotation.y = this.basePivotRot.y + scrollRot.y;
        this.dragonPivot.rotation.z = this.basePivotRot.z + scrollRot.z;
      }
    }

    // Mouse & Pointer Interactions update (Phase 7: pointer tracking & head look-at)
    if (this.interactions) {
      this.interactions.update(delta);
    }

    // Dynamic head tracking keeps the dragon head/face/horns/eyes framed in the safe zone
    this.updateHeadTracking(delta);

    // Visual Effects update (Phase 5: Eye glow, embers, smoke, fire)
    if (this.effects) {
      this.effects.update(delta);
      const shake = this.effects.getCameraShakeOffset();
      if (shake.x !== 0 || shake.y !== 0 || shake.z !== 0) {
        this.camera.position.add(shake);
      }
    }

    // Update text fading when dragon moves behind text
    this.updateTextBehindOcclusion();

    this.renderer.render(this.scene, this.camera);
  }

  /* ---------------------------------------------------------
   * Resource Disposal & Memory Cleanup (Phase 10)
   * --------------------------------------------------------- */
  dispose() {
    this.isDisposed = true;

    // Disconnect IntersectionObserver
    if (this.heroObserver) {
      this.heroObserver.disconnect();
      this.heroObserver = null;
    }

    // Remove window and document listeners
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._onVisibilityChange) document.removeEventListener('visibilitychange', this._onVisibilityChange);
    if (this._onHeroClick && this.heroEl) this.heroEl.removeEventListener('click', this._onHeroClick);
    if (this._onHeroDblClick && this.heroEl) this.heroEl.removeEventListener('dblclick', this._onHeroDblClick);

    // Dispose sub-controllers
    if (this.ui) this.ui.dispose();
    if (this.interactions) this.interactions.dispose();
    if (this.scrollController) this.scrollController.dispose();
    if (this.effects) this.effects.dispose();
    if (this.audio) this.audio.dispose();
    if (this.animationController) this.animationController.dispose();

    // Traverse scene to release all geometries, materials, and textures
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((mat) => {
            const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'envMap', 'alphaMap'];
            textureProps.forEach((prop) => {
              if (mat[prop] && typeof mat[prop].dispose === 'function') {
                mat[prop].dispose();
              }
            });
            mat.dispose();
          });
        }
      });
    }

    // Release WebGL renderer and canvas
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }

    delete window.__DRAGON_SCENE__;
    delete window.__DRAGON_READY__;
    console.log('🧹 DragonScene successfully disposed all WebGL, Audio, and DOM resources.');
  }
}

export function initDragonScene() {
  return new DragonScene();
}
