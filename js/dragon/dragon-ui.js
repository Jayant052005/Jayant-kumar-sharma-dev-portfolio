/**
 * Dragon User Interface Controller (Phase 9)
 * Manages Enter Experience overlay, Skip Intro, Sound Mute/Unmute toggle,
 * Volume slider, Roar, Fire, Replay controls, and keyboard navigation.
 */

export class DragonUI {
  constructor(sceneInstance) {
    this.scene = sceneInstance;
    this.audio = sceneInstance.audio || window.__DRAGON_AUDIO__;
    this.effects = sceneInstance.effects || window.__DRAGON_EFFECTS__;

    this.overlay = document.getElementById('dragon-intro-overlay');
    this.enterBtn = document.getElementById('dragon-enter-btn');
    this.skipBtn = document.getElementById('dragon-skip-btn');
    this.soundBtn = document.getElementById('dragon-sound-btn');
    this.soundIconOn = document.getElementById('dragon-sound-icon-on');
    this.soundIconOff = document.getElementById('dragon-sound-icon-off');
    this.soundLabel = document.getElementById('dragon-sound-label');
    this.volumeSlider = document.getElementById('dragon-volume-slider');
    this.roarBtn = document.getElementById('dragon-roar-btn');
    this.fireBtn = document.getElementById('dragon-fire-btn');
    this.replayBtn = document.getElementById('dragon-replay-btn');

    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Bound listeners for clean disposal (Phase 10)
    this._onEnter = () => this.enterExperience();
    this._onSkip = () => this.skipIntro();
    this._onSoundClick = () => {
      if (this.audio) {
        const isMuted = this.audio.toggleMute();
        this.updateSoundUI(isMuted);
      }
    };
    this._onVolumeInput = (e) => {
      const val = parseFloat(e.target.value) / 100;
      if (this.audio) {
        this.audio.setVolume(val);
        if (this.audio.isMuted()) {
          this.audio.unmute();
          this.updateSoundUI(false);
        }
      }
    };
    this._onRoar = () => { if (this.scene) this.scene.triggerRoar(); };
    this._onFire = () => { if (this.scene) this.scene.triggerFire(); };
    this._onReplay = () => this.replayIntro();
    this._onAudioMute = (e) => this.updateSoundUI(e.detail.muted);
    this._onAudioVolume = (e) => {
      if (this.volumeSlider) {
        this.volumeSlider.value = Math.round(e.detail.volume * 100);
      }
    };
    this._onKeyDown = (e) => this.handleKeyDown(e);

    this.initOverlayControls();
    this.initHUDControls();
    this.initAudioSync();
    this.initKeyboardSupport();

    window.__DRAGON_UI__ = this;
  }

  /* ---------------------------------------------------------
   * 1. Cinematic Intro Overlay (Enter Experience & Skip Intro)
   * --------------------------------------------------------- */
  initOverlayControls() {
    if (this.enterBtn) {
      this.enterBtn.addEventListener('click', this._onEnter);
    }

    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', this._onSkip);
    }

    // Auto-skip if reduced motion is requested
    if (this.isReducedMotion && this.overlay) {
      this.skipIntro();
    }
  }

  enterExperience() {
    if (this.overlay) {
      this.overlay.classList.add('is-dismissed');
    }

    // Audio gesture unlock & initial awakening sound
    if (this.audio) {
      this.audio.play('growl');
    }

    // Cinematic awakening flare
    if (this.effects) {
      this.effects.setEyeGlowIntensity(2.6);
      this.effects.triggerCameraShake(0.16, 0.7);
      setTimeout(() => {
        if (this.effects) this.effects.setEyeGlowIntensity(1.0);
      }, 1500);
    }
  }

  skipIntro() {
    if (this.overlay) {
      this.overlay.classList.add('is-dismissed');
    }
  }

  replayIntro() {
    if (this.overlay) {
      this.overlay.classList.remove('is-dismissed');
    }

    // Reset camera & dragon if available
    if (this.scene && this.scene.scrollController) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ---------------------------------------------------------
   * 2. HUD Controls (Sound, Volume, Roar, Fire, Replay)
   * --------------------------------------------------------- */
  initHUDControls() {
    // Sound Mute / Unmute Toggle
    if (this.soundBtn) {
      this.soundBtn.addEventListener('click', this._onSoundClick);
    }

    // Volume Slider
    if (this.volumeSlider) {
      if (this.audio) {
        this.volumeSlider.value = Math.round(this.audio.getVolume() * 100);
      }
      this.volumeSlider.addEventListener('input', this._onVolumeInput);
    }

    // Roar Button
    if (this.roarBtn) {
      this.roarBtn.addEventListener('click', this._onRoar);
    }

    // Fire Button
    if (this.fireBtn) {
      this.fireBtn.addEventListener('click', this._onFire);
    }

    // Replay Button
    if (this.replayBtn) {
      this.replayBtn.addEventListener('click', this._onReplay);
    }
  }

  /* ---------------------------------------------------------
   * 3. Audio UI Synchronization
   * --------------------------------------------------------- */
  initAudioSync() {
    if (this.audio) {
      this.updateSoundUI(this.audio.isMuted());
    }

    window.addEventListener('dragon-audio-mute', this._onAudioMute);
    window.addEventListener('dragon-audio-volume', this._onAudioVolume);
  }

  updateSoundUI(isMuted) {
    if (!this.soundBtn) return;

    if (isMuted) {
      if (this.soundIconOn) this.soundIconOn.classList.add('is-hidden');
      if (this.soundIconOff) this.soundIconOff.classList.remove('is-hidden');
      if (this.soundLabel) this.soundLabel.textContent = 'Muted';
      this.soundBtn.setAttribute('aria-label', 'Unmute Dragon Audio');
      this.soundBtn.classList.add('is-muted');
    } else {
      if (this.soundIconOn) this.soundIconOn.classList.remove('is-hidden');
      if (this.soundIconOff) this.soundIconOff.classList.add('is-hidden');
      if (this.soundLabel) this.soundLabel.textContent = 'Sound';
      this.soundBtn.setAttribute('aria-label', 'Mute Dragon Audio');
      this.soundBtn.classList.remove('is-muted');
    }
  }

  /* ---------------------------------------------------------
   * 4. Keyboard Navigation & Hotkeys
   * --------------------------------------------------------- */
  initKeyboardSupport() {
    window.addEventListener('keydown', this._onKeyDown);
  }

  handleKeyDown(e) {
    // Ignore if user is inside an input, textarea or select
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    switch (e.key) {
      case 'Escape':
        this.skipIntro();
        break;
      case 'r':
      case 'R':
        if (this.scene) this.scene.triggerRoar();
        break;
      case 'f':
      case 'F':
        if (this.scene) this.scene.triggerFire();
        break;
      case 'm':
      case 'M':
        if (this.audio) {
          const isMuted = this.audio.toggleMute();
          this.updateSoundUI(isMuted);
        }
        break;
      case 'p':
      case 'P':
        this.replayIntro();
        break;
    }
  }

  dispose() {
    if (this.enterBtn) this.enterBtn.removeEventListener('click', this._onEnter);
    if (this.skipBtn) this.skipBtn.removeEventListener('click', this._onSkip);
    if (this.soundBtn) this.soundBtn.removeEventListener('click', this._onSoundClick);
    if (this.volumeSlider) this.volumeSlider.removeEventListener('input', this._onVolumeInput);
    if (this.roarBtn) this.roarBtn.removeEventListener('click', this._onRoar);
    if (this.fireBtn) this.fireBtn.removeEventListener('click', this._onFire);
    if (this.replayBtn) this.replayBtn.removeEventListener('click', this._onReplay);

    window.removeEventListener('dragon-audio-mute', this._onAudioMute);
    window.removeEventListener('dragon-audio-volume', this._onAudioVolume);
    window.removeEventListener('keydown', this._onKeyDown);

    delete window.__DRAGON_UI__;
  }
}
