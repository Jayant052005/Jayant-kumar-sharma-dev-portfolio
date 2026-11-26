/**
 * Dragon Visual Effects System (Phase 5)
 * Implements red eye glow, floating embers, atmospheric smoke mist,
 * controlled fire lighting, fire particle stream, and camera shake.
 * Strictly adheres to 60 FPS performance budgets and zero inline styles.
 */

import * as THREE from '../libs/three.module.js';

export class DragonEffects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.headBone = null;
    this.dragonPivot = null;

    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile = window.innerWidth <= 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

    // Groups
    this.effectsGroup = new THREE.Group();
    this.effectsGroup.name = 'dragon-effects-group';
    this.scene.add(this.effectsGroup);

    // Dynamic procedural textures
    this.emberTexture = this.createEmberTexture();
    this.smokeTexture = this.createSmokeTexture();
    this.fireTexture = this.createFireTexture();

    // Components
    this.eyeGlowLights = [];
    this.eyeGlowSprites = [];
    this.embers = null;
    this.smoke = null;
    this.fireParticles = null;
    this.atmosphereLight = null;

    // Shake state
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.shakeOffset = new THREE.Vector3();

    // Fire state
    this.isFiring = false;
    this.fireTimer = 0;
    this.fireDuration = 0;

    // Temp vectors for performance (zero GC per frame)
    this._tempHeadPos = new THREE.Vector3();
    this._tempHeadDir = new THREE.Vector3();

    this.initAtmosphericLighting();
    this.initFloatingEmbers();
    this.initSmokeMist();
    this.initFireParticles();

    window.__DRAGON_EFFECTS__ = this;
  }

  /* ---------------------------------------------------------
   * Procedural Textures (Self-Contained Canvas2D Generation)
   * --------------------------------------------------------- */
  createEmberTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(255, 190, 70, 0.95)');
    grad.addColorStop(0.5, 'rgba(230, 40, 40, 0.7)');
    grad.addColorStop(0.8, 'rgba(150, 0, 0, 0.3)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  createSmokeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    grad.addColorStop(0.0, 'rgba(120, 25, 25, 0.6)');
    grad.addColorStop(0.4, 'rgba(60, 10, 15, 0.35)');
    grad.addColorStop(0.7, 'rgba(25, 5, 8, 0.15)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  createFireTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 240, 1.0)');
    grad.addColorStop(0.25, 'rgba(255, 180, 40, 0.9)');
    grad.addColorStop(0.6, 'rgba(230, 30, 20, 0.6)');
    grad.addColorStop(0.9, 'rgba(120, 10, 10, 0.2)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  /* ---------------------------------------------------------
   * 1. Red Eye Glow
   * --------------------------------------------------------- */
  attachEyeGlow(headBone, dragonPivot, jawBone = null) {
    this.headBone = headBone;
    this.dragonPivot = dragonPivot;
    this.jawBone = jawBone;

    if (!this.headBone) return;

    // Create 2 glowing eye sprites and point lights for ambient illumination
    for (let i = 0; i < 2; i++) {
      const isRight = i === 1;

      // Soft eye glow light
      const eyeLight = new THREE.PointLight(0xff1515, 1.6, 3.5, 2);
      eyeLight.position.set(isRight ? 0.22 : -0.22, 0.32, 0.65);
      this.headBone.add(eyeLight);
      this.eyeGlowLights.push(eyeLight);

      // Visual glow sprite
      const spriteMat = new THREE.SpriteMaterial({
        map: this.emberTexture,
        color: 0xff2222,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.35, 0.35, 0.35);
      sprite.position.copy(eyeLight.position);
      this.headBone.add(sprite);
      this.eyeGlowSprites.push(sprite);
    }
  }

  /* ---------------------------------------------------------
   * 2. Controlled Atmospheric Lighting
   * --------------------------------------------------------- */
  initAtmosphericLighting() {
    // Dynamic warm under-glow light reflecting dragon power
    this.atmosphereLight = new THREE.PointLight(0xe5252a, 2.2, 16.0, 2);
    this.atmosphereLight.position.set(0, -1.0, 3.0);
    this.effectsGroup.add(this.atmosphereLight);

    // Subtle golden rim point light for scales
    this.rimGlowLight = new THREE.PointLight(0xff7722, 1.4, 12.0, 2);
    this.rimGlowLight.position.set(3.5, 2.5, -1.0);
    this.effectsGroup.add(this.rimGlowLight);
  }

  /* ---------------------------------------------------------
   * 3. Floating Embers (Ambient Atmospheric Particles)
   * --------------------------------------------------------- */
  initFloatingEmbers() {
    let count = this.isMobile ? 45 : 120;
    if (this.isReducedMotion) count = Math.floor(count * 0.4);
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = [];

    const colorPalette = [
      new THREE.Color(0xff2222), // Crimson
      new THREE.Color(0xff6a00), // Fire Orange
      new THREE.Color(0xffc247), // Golden Amber
      new THREE.Color(0xe5252a)  // Brand Red
    ];

    for (let i = 0; i < count; i++) {
      // Spread across the hero volume
      positions[i * 3 + 0] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 + 1.5;

      const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3 + 0] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = Math.random() * 0.18 + 0.08;

      velocities.push({
        vx: (Math.random() - 0.5) * 0.25,
        vy: Math.random() * 0.65 + 0.35,
        vz: (Math.random() - 0.5) * 0.25,
        swaySpeed: Math.random() * 2.5 + 1.0,
        swayAmp: Math.random() * 0.015 + 0.005,
        baseX: positions[i * 3 + 0],
        seed: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.22,
      map: this.emberTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.embers = new THREE.Points(geometry, material);
    this.embersVelocities = velocities;
    this.effectsGroup.add(this.embers);
  }

  /* ---------------------------------------------------------
   * 4. Atmospheric Smoke / Mist
   * --------------------------------------------------------- */
  initSmokeMist() {
    let count = this.isMobile ? 12 : 24;
    if (this.isReducedMotion) count = Math.floor(count * 0.4);
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const scales = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8 - 1.0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1.5;

      scales.push({
        vy: Math.random() * 0.18 + 0.08,
        driftX: (Math.random() - 0.5) * 0.12,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        phase: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 3.2,
      map: this.smokeTexture,
      transparent: true,
      opacity: 0.18, // Restrained opacity so hero text is 100% readable
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.smoke = new THREE.Points(geometry, material);
    this.smokeData = scales;
    this.effectsGroup.add(this.smoke);
  }

  /* ---------------------------------------------------------
   * 5. Fire Particles Stream (Burst / Breath Emitter)
   * --------------------------------------------------------- */
  initFireParticles() {
    let count = this.isMobile ? 80 : 200;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const sizes = new Float32Array(count);
    const fireData = [];

    for (let i = 0; i < count; i++) {
      // Hidden behind dragon initially until fired
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;

      colors[i * 3 + 0] = 1.0;
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = 0.1;

      alphas[i] = 0.0;
      sizes[i] = 0.0;

      fireData.push({
        active: false,
        age: 0,
        maxLife: Math.random() * 0.6 + 0.5,
        vx: 0,
        vy: 0,
        vz: 0,
        sizeStart: Math.random() * 0.2 + 0.15,
        sizeEnd: Math.random() * 0.8 + 0.5
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.PointsMaterial({
      size: 0.45,
      map: this.fireTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.fireParticles = new THREE.Points(geometry, material);
    this.fireData = fireData;
    this.effectsGroup.add(this.fireParticles);

    // Dedicated Fire Light Burst
    this.fireLight = new THREE.PointLight(0xff6a00, 0, 10, 2);
    this.effectsGroup.add(this.fireLight);
  }

  /* ---------------------------------------------------------
   * Trigger Functions (User / Event Activated)
   * --------------------------------------------------------- */
  triggerFire(duration = 2.2) {
    this.isFiring = true;
    this.fireDuration = duration;
    this.fireTimer = duration;

    // Trigger synchronized camera shake
    this.triggerCameraShake(0.12, Math.min(duration, 1.2));
  }

  triggerCameraShake(intensity = 0.15, duration = 0.5) {
    if (this.isReducedMotion) return; // Respect accessibility preferences
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  setEyeGlowIntensity(multiplier = 1.0) {
    for (let i = 0; i < this.eyeGlowLights.length; i++) {
      this.eyeGlowLights[i].intensity = 1.6 * multiplier;
      this.eyeGlowSprites[i].material.opacity = Math.min(0.85 * multiplier, 1.0);
    }
  }

  /* ---------------------------------------------------------
   * Per-Frame Animation Loop Update
   * --------------------------------------------------------- */
  update(delta) {
    const time = performance.now() * 0.001;

    // 1. Update Eye Glow Pulsation
    if (this.eyeGlowLights.length > 0) {
      const pulse = 1.0 + Math.sin(time * 3.2) * 0.25;
      const fireBoost = this.isFiring ? 1.8 : 1.0;
      for (let i = 0; i < this.eyeGlowLights.length; i++) {
        this.eyeGlowLights[i].intensity = 1.6 * pulse * fireBoost;
        this.eyeGlowSprites[i].material.opacity = Math.min(0.85 * pulse * fireBoost, 1.0);
      }
    }

    // 2. Update Atmospheric Flickering Lighting
    if (this.atmosphereLight) {
      const flicker = Math.sin(time * 6.5) * 0.35 + Math.sin(time * 14.2) * 0.15;
      const baseIntensity = this.isFiring ? 4.5 : 2.2;
      this.atmosphereLight.intensity = Math.max(0.5, baseIntensity + flicker);
    }

    // 3. Update Floating Embers
    if (this.embers && this.embersVelocities) {
      const posAttr = this.embers.geometry.attributes.position;
      const positions = posAttr.array;
      const count = this.embersVelocities.length;

      for (let i = 0; i < count; i++) {
        const vel = this.embersVelocities[i];
        positions[i * 3 + 1] += vel.vy * delta;

        // Gentle horizontal oscillation
        positions[i * 3 + 0] = vel.baseX + Math.sin(time * vel.swaySpeed + vel.seed) * (vel.swayAmp * 25);

        // Respawn wrap
        if (positions[i * 3 + 1] > 6.0) {
          positions[i * 3 + 1] = -5.5;
          positions[i * 3 + 0] = (Math.random() - 0.5) * 16;
          vel.baseX = positions[i * 3 + 0];
        }
      }
      posAttr.needsUpdate = true;
    }

    // 4. Update Atmospheric Smoke Mist
    if (this.smoke && this.smokeData) {
      const posAttr = this.smoke.geometry.attributes.position;
      const positions = posAttr.array;
      const count = this.smokeData.length;

      for (let i = 0; i < count; i++) {
        const data = this.smokeData[i];
        positions[i * 3 + 1] += data.vy * delta;
        positions[i * 3 + 0] += Math.sin(time * 0.8 + data.phase) * (data.driftX * delta);

        if (positions[i * 3 + 1] > 5.5) {
          positions[i * 3 + 1] = -5.0;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 5. Update Fire Stream
    if (this.fireParticles && this.fireData) {
      const posAttr = this.fireParticles.geometry.attributes.position;
      const colAttr = this.fireParticles.geometry.attributes.color;
      const positions = posAttr.array;
      const colors = colAttr.array;

      if (this.isFiring) {
        this.fireTimer -= delta;
        if (this.fireTimer <= 0) {
          this.isFiring = false;
        }

        // Get mouth/snout origin from jaw bone or head bone
        const originBone = this.jawBone || this.headBone;
        if (originBone) {
          originBone.getWorldPosition(this._tempHeadPos);
          originBone.getWorldDirection(this._tempHeadDir);
          // Adjust mouth forward vector slightly outward from jaws
          this._tempHeadPos.addScaledVector(this._tempHeadDir, 0.45);
          this.fireLight.position.copy(this._tempHeadPos);
          this.fireLight.intensity = Math.min(6.0, this.fireTimer * 3.5);
        }

        // Emit new fire particles
        const spawnCount = Math.floor(delta * 90);
        for (let s = 0; s < spawnCount; s++) {
          const inactive = this.fireData.find(p => !p.active);
          if (inactive) {
            const idx = this.fireData.indexOf(inactive);
            inactive.active = true;
            inactive.age = 0;
            positions[idx * 3 + 0] = this._tempHeadPos.x + (Math.random() - 0.5) * 0.15;
            positions[idx * 3 + 1] = this._tempHeadPos.y + (Math.random() - 0.5) * 0.15;
            positions[idx * 3 + 2] = this._tempHeadPos.z + (Math.random() - 0.5) * 0.15;

            // Stream forward towards the right and front
            inactive.vx = (Math.random() * 2.5 + 2.0) * (Math.random() > 0.3 ? 1 : -0.5);
            inactive.vy = Math.random() * 1.2 + 0.4;
            inactive.vz = Math.random() * 2.0 + 1.0;
          }
        }
      } else {
        if (this.fireLight && this.fireLight.intensity > 0) {
          this.fireLight.intensity = Math.max(0, this.fireLight.intensity - delta * 4.0);
        }
      }

      // Progress active fire particles
      for (let i = 0; i < this.fireData.length; i++) {
        const p = this.fireData[i];
        if (p.active) {
          p.age += delta;
          const progress = p.age / p.maxLife;

          if (progress >= 1.0) {
            p.active = false;
            positions[i * 3 + 1] = -100;
          } else {
            positions[i * 3 + 0] += p.vx * delta;
            positions[i * 3 + 1] += p.vy * delta;
            positions[i * 3 + 2] += p.vz * delta;

            // Upward thermal rise
            p.vy += delta * 1.8;

            // Color gradient over age: White -> Yellow -> Red -> Dark Smoke
            if (progress < 0.2) {
              colors[i * 3 + 0] = 1.0;
              colors[i * 3 + 1] = 0.9;
              colors[i * 3 + 2] = 0.4;
            } else if (progress < 0.55) {
              colors[i * 3 + 0] = 1.0;
              colors[i * 3 + 1] = 0.4;
              colors[i * 3 + 2] = 0.05;
            } else {
              colors[i * 3 + 0] = 0.6 * (1.0 - progress);
              colors[i * 3 + 1] = 0.1 * (1.0 - progress);
              colors[i * 3 + 2] = 0.05 * (1.0 - progress);
            }
          }
        }
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    // 6. Damped Camera Shake Update
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      const progress = Math.max(0, this.shakeTimer / this.shakeDuration);
      const currentIntensity = this.shakeIntensity * Math.pow(progress, 1.8);

      this.shakeOffset.set(
        (Math.random() - 0.5) * currentIntensity * 2,
        (Math.random() - 0.5) * currentIntensity * 2,
        (Math.random() - 0.5) * currentIntensity * 0.5
      );
    } else {
      this.shakeOffset.set(0, 0, 0);
    }
  }

  getCameraShakeOffset() {
    return this.shakeOffset;
  }

  dispose() {
    if (this.emberTexture) this.emberTexture.dispose();
    if (this.smokeTexture) this.smokeTexture.dispose();
    if (this.fireTexture) this.fireTexture.dispose();

    if (this.embers) {
      if (this.embers.geometry) this.embers.geometry.dispose();
      if (this.embers.material) this.embers.material.dispose();
    }
    if (this.smoke) {
      if (this.smoke.geometry) this.smoke.geometry.dispose();
      if (this.smoke.material) this.smoke.material.dispose();
    }
    if (this.fireParticles) {
      if (this.fireParticles.geometry) this.fireParticles.geometry.dispose();
      if (this.fireParticles.material) this.fireParticles.material.dispose();
    }

    this.eyeGlowSprites.forEach((sprite) => {
      if (sprite.material) sprite.material.dispose();
      if (sprite.parent) sprite.parent.remove(sprite);
    });
    this.eyeGlowLights.forEach((light) => {
      if (light.parent) light.parent.remove(light);
    });

    if (this.effectsGroup) {
      this.scene.remove(this.effectsGroup);
    }
    delete window.__DRAGON_EFFECTS__;
  }
}
