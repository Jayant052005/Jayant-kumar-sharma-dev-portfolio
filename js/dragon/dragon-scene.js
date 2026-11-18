/**
 * Dragon Scene Manager (Phase 2 & 3 Integration)
 * Initializes Three.js scene, camera, lighting, GLB loader, and animation loop.
 */

import * as THREE from '../libs/three.module.js';
import { DragonLoader } from './dragon-loader.js?v=3';
import { DragonAnimationController } from './dragon-animation.js';

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
    this.dragonBones = null;
    this.headBone = null;
    this.headCluster = [];
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
    this.textTrackingElements = [];

    this.initScene();
    this.initLights();
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
        this.dragonBones = result.bones || [];
        this.scene.add(this.dragonPivot);

        // Identify primary head bone and head cluster bones (horns, snout, eyes, whiskers)
        this.headBone = this.dragonBones.find(b => b.name === 'drgon_025') || null;
        if (this.headBone) {
          this.headCluster = this.dragonBones.filter(b => {
            return b === this.headBone ||
                   b.parent === this.headBone ||
                   (b.parent && b.parent.parent === this.headBone);
          });
        }

        // Initialize Animation Controller with Take 001
        this.animationController = new DragonAnimationController(result.rawScene, result.animations);

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
    // Window resize tracking hero container bounds
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = width / height;
      this.updateCameraForViewport();
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });

    // Page Visibility API (pause rendering loop when tab is backgrounded)
    document.addEventListener('visibilitychange', () => {
      this.isTabVisible = !document.hidden;
      if (this.isTabVisible && this.isHeroVisible) {
        this.clock.start();
        if (this.animationController) this.animationController.resume();
      } else {
        this.clock.stop();
        if (this.animationController) this.animationController.pause();
      }
    });

    // Hero Visibility Observer: Confine dragon to hero section (0% GPU bleed into About Me or lower)
    const heroEl = document.getElementById('hero');
    if (heroEl && 'IntersectionObserver' in window) {
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
      this.heroObserver.observe(heroEl);
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

    const targetCamPos = this._tempCamPos;
    targetCamPos.set(
      targetLookAt.x,
      targetLookAt.y + 0.25,
      targetLookAt.z + config.distance
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
    requestAnimationFrame(() => this.animate());

    if (!this.isTabVisible || !this.isHeroVisible) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Update 57.5s serpentine skeletal animation
    if (this.animationController) {
      this.animationController.update(delta);
    }

    // Gentle global hover float
    if (this.dragonPivot && this.basePivotPos) {
      const time = this.clock.getElapsedTime();
      this.dragonPivot.position.y = this.basePivotPos.y + Math.sin(time * 1.2) * 0.08;
    }

    // Dynamic head tracking keeps the dragon head/face/horns/eyes framed in the safe zone
    this.updateHeadTracking(delta);

    // Update text fading when dragon moves behind text
    this.updateTextBehindOcclusion();

    this.renderer.render(this.scene, this.camera);
  }
}

export function initDragonScene() {
  return new DragonScene();
}
