/**
 * Dragon Animation Controller Module (Phase 3)
 * Manages AnimationMixer, Take 001 playback, looping, time scaling, and idle state.
 */

import * as THREE from '../libs/three.module.js';

export class DragonAnimationController {
  constructor(model, animations) {
    this.model = model;
    this.animations = animations || [];
    this.mixer = null;
    this.activeAction = null;
    this.clipDuration = 57.5;
    this.isPlaying = false;
    this.playbackSpeed = 0.85; // Smooth serpentine cruising speed

    this.init();
  }

  init() {
    if (!this.model || this.animations.length === 0) {
      console.warn('DragonAnimationController: No animations found in model.');
      return;
    }

    this.mixer = new THREE.AnimationMixer(this.model);

    // Load primary animation clip "Take 001"
    const take001Clip = THREE.AnimationClip.findByName(this.animations, 'Take 001') || this.animations[0];
    if (take001Clip) {
      this.clipDuration = take001Clip.duration;
      this.activeAction = this.mixer.clipAction(take001Clip);
      this.activeAction.setLoop(THREE.LoopRepeat);
      this.activeAction.setEffectiveTimeScale(this.playbackSpeed);
      this.activeAction.play();
      this.isPlaying = true;
      console.log(`✅ Loaded "${take001Clip.name}" (${this.clipDuration.toFixed(2)}s, ${take001Clip.tracks.length} tracks) into AnimationMixer.`);
    }
  }

  update(delta) {
    if (this.mixer && this.isPlaying) {
      this.mixer.update(delta);
    }
  }

  setSpeed(speed) {
    this.playbackSpeed = Math.max(0.1, Math.min(3.0, speed));
    if (this.activeAction) {
      this.activeAction.setEffectiveTimeScale(this.playbackSpeed);
    }
  }

  pause() {
    this.isPlaying = false;
  }

  resume() {
    this.isPlaying = true;
  }

  getCurrentTime() {
    return this.activeAction ? (this.activeAction.time % this.clipDuration) : 0;
  }

  getDuration() {
    return this.clipDuration;
  }
}
