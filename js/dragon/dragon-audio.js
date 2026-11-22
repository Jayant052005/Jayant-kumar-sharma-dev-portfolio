/**
 * Dragon Audio Management System (Phase 6)
 * Handles high-fidelity audio playback, sound effects, ambience, volume,
 * muting, channel concurrency management, and procedural synthesis fallback.
 */

export class DragonAudio {
  constructor() {
    this.AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = null;
    this.masterGain = null;

    // Load saved preferences from localStorage
    const savedMuted = localStorage.getItem('portfolio_dragon_muted');
    this.isMutedState = savedMuted !== null ? savedMuted === 'true' : false;

    const savedVol = localStorage.getItem('portfolio_dragon_volume');
    this.masterVolume = savedVol !== null ? Math.min(1, Math.max(0, parseFloat(savedVol))) : 0.75;

    // Sound registry
    this.soundDefs = {
      growl: { path: 'assets/audio/growl.wav', priority: 7, maxChannels: 1 },
      roar: { path: 'assets/audio/roar.wav', priority: 10, maxChannels: 1 },
      breath: { path: 'assets/audio/breath.wav', priority: 3, maxChannels: 1 },
      fire_blast: { path: 'assets/audio/fire_blast.wav', priority: 8, maxChannels: 1 },
      fire_crackle: { path: 'assets/audio/fire_crackle.wav', priority: 2, maxChannels: 1 },
      whoosh: { path: 'assets/audio/whoosh.wav', priority: 5, maxChannels: 2 },
      impact: { path: 'assets/audio/impact.wav', priority: 9, maxChannels: 1 },
      ambience: { path: 'assets/audio/ambience.wav', priority: 1, maxChannels: 1 }
    };

    this.audioBuffers = new Map();
    this.activeNodes = new Map(); // soundName -> Array of active source nodes
    this.isInitialized = false;

    this.initAudioContext();
    this.setupUserGestureUnlock();

    window.__DRAGON_AUDIO__ = this;
  }

  /* ---------------------------------------------------------
   * AudioContext Initialization & Gesture Unlock
   * --------------------------------------------------------- */
  initAudioContext() {
    if (this.ctx || !this.AudioContextClass) return;

    try {
      this.ctx = new this.AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.isMutedState ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
      this.masterGain.connect(this.ctx.destination);
      this.preloadSounds();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  setupUserGestureUnlock() {
    const unlock = () => {
      if (!this.ctx) {
        this.initAudioContext();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.isInitialized = true;
        }).catch(() => {});
      } else if (this.ctx) {
        this.isInitialized = true;
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { passive: true, once: false });
    window.addEventListener('keydown', unlock, { passive: true, once: false });
    window.addEventListener('touchstart', unlock, { passive: true, once: false });
  }

  /* ---------------------------------------------------------
   * Sound Loading & Missing-File Handling
   * --------------------------------------------------------- */
  preloadSounds() {
    for (const [name, def] of Object.entries(this.soundDefs)) {
      this.loadSound(name, def.path);
    }
  }

  loadSound(name, path) {
    if (!this.ctx) return;

    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => this.ctx.decodeAudioData(buffer))
      .then((decoded) => {
        this.audioBuffers.set(name, decoded);
      })
      .catch((err) => {
        // Missing-file handling: log gracefully and synthesize procedural audio fallback
        console.warn(`[DragonAudio] Audio file for '${name}' at '${path}' not reachable (${err.message}). Using Web Audio procedural synthesizer.`);
        this.audioBuffers.set(name, 'PROCEDURAL_SYNTH');
      });
  }

  /* ---------------------------------------------------------
   * Channel Management & Overlap Prevention
   * --------------------------------------------------------- */
  cleanupActiveNode(name, source) {
    const list = this.activeNodes.get(name);
    if (!list) return;
    const idx = list.indexOf(source);
    if (idx !== -1) list.splice(idx, 1);
  }

  stop(name) {
    const list = this.activeNodes.get(name);
    if (list && list.length > 0) {
      list.forEach((src) => {
        try {
          src.stop();
          src.disconnect();
        } catch (e) {}
      });
      this.activeNodes.set(name, []);
    }
  }

  stopAll() {
    for (const name of this.soundDefs) {
      this.stop(name);
    }
  }

  /* ---------------------------------------------------------
   * Sound Playback
   * --------------------------------------------------------- */
  play(name, options = {}) {
    if (this.isMutedState) return null;
    if (!this.ctx) this.initAudioContext();
    if (!this.ctx) return null;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const def = this.soundDefs[name];
    if (!def) {
      console.warn(`[DragonAudio] Unknown sound: ${name}`);
      return null;
    }

    // Overlap prevention: if max channels exceeded, stop oldest instance
    let currentActive = this.activeNodes.get(name) || [];
    if (currentActive.length >= def.maxChannels) {
      const oldest = currentActive.shift();
      try {
        oldest.stop();
        oldest.disconnect();
      } catch (e) {}
    }

    // Priority ducking: If playing a roar, duck background ambience/breathing
    if (name === 'roar') {
      this.duckBackgroundSounds(1.8);
    }

    const buffer = this.audioBuffers.get(name);
    if (buffer && buffer !== 'PROCEDURAL_SYNTH') {
      return this.playBuffer(name, buffer, options);
    } else {
      return this.playProceduralFallback(name, options);
    }
  }

  playBuffer(name, buffer, options) {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = Boolean(options.loop);

    const gainNode = this.ctx.createGain();
    const vol = typeof options.volume === 'number' ? options.volume : 1.0;
    gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.onended = () => {
      this.cleanupActiveNode(name, source);
      try {
        gainNode.disconnect();
      } catch (e) {}
    };

    let list = this.activeNodes.get(name);
    if (!list) {
      list = [];
      this.activeNodes.set(name, list);
    }
    list.push(source);

    source.start(0);

    // Dispatch play event
    window.dispatchEvent(new CustomEvent('dragon-audio-play', { detail: { sound: name } }));

    return source;
  }

  duckBackgroundSounds(duration) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Duck ambience and breath if active
    ['ambience', 'breath'].forEach((bgName) => {
      const list = this.activeNodes.get(bgName);
      if (list && list.length > 0) {
        list.forEach((src) => {
          if (src._gainNode) {
            src._gainNode.gain.cancelScheduledValues(now);
            src._gainNode.gain.setValueAtTime(0.2, now);
            src._gainNode.gain.linearRampToValueAtTime(1.0, now + duration);
          }
        });
      }
    });
  }

  /* ---------------------------------------------------------
   * Procedural Audio Synthesis Fallback (Web Audio API)
   * --------------------------------------------------------- */
  playProceduralFallback(name, options = {}) {
    if (!this.ctx) return null;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);
    const vol = typeof options.volume === 'number' ? options.volume : 1.0;

    switch (name) {
      case 'roar': {
        // Multi-oscillator FM roar with resonant low-pass filter
        const osc = this.ctx.createOscillator();
        const oscSub = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        oscSub.type = 'triangle';

        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 1.8);
        oscSub.frequency.setValueAtTime(60, now);
        oscSub.frequency.exponentialRampToValueAtTime(28, now + 1.8);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.Q.setValueAtTime(4.0, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.85 * vol, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        osc.connect(filter);
        oscSub.connect(filter);
        filter.connect(gain);

        osc.start(now);
        oscSub.start(now);
        osc.stop(now + 2.0);
        oscSub.stop(now + 2.0);
        break;
      }

      case 'fire_blast': {
        // Pink noise burst with sweeping filter
        const bufferSize = this.ctx.sampleRate * 1.5;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 1.4);
        filter.Q.setValueAtTime(2.0, now);

        gain.gain.setValueAtTime(0.8 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        whiteNoise.connect(filter);
        filter.connect(gain);
        whiteNoise.start(now);
        whiteNoise.stop(now + 1.5);
        break;
      }

      case 'growl': {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(75, now);
        osc.frequency.linearRampToValueAtTime(55, now + 1.4);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.55 * vol, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.connect(filter);
        filter.connect(gain);
        osc.start(now);
        osc.stop(now + 1.5);
        break;
      }

      default: {
        // Generic subtle tone for impact / whoosh / breath
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.8);

        gain.gain.setValueAtTime(0.4 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.8);
      }
    }

    return gain;
  }

  /* ---------------------------------------------------------
   * Volume & Mute Controls
   * --------------------------------------------------------- */
  setVolume(volume) {
    const clamped = Math.min(1.0, Math.max(0.0, volume));
    this.masterVolume = clamped;
    localStorage.setItem('portfolio_dragon_volume', clamped.toString());

    if (!this.isMutedState && this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }

    window.dispatchEvent(new CustomEvent('dragon-audio-volume', { detail: { volume: clamped } }));
  }

  getVolume() {
    return this.masterVolume;
  }

  toggleMute() {
    if (this.isMutedState) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMutedState;
  }

  mute() {
    this.isMutedState = true;
    localStorage.setItem('portfolio_dragon_muted', 'true');

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }

    window.dispatchEvent(new CustomEvent('dragon-audio-mute', { detail: { muted: true } }));
  }

  unmute() {
    this.isMutedState = false;
    localStorage.setItem('portfolio_dragon_muted', 'false');

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }

    window.dispatchEvent(new CustomEvent('dragon-audio-mute', { detail: { muted: false } }));
  }

  isMuted() {
    return this.isMutedState;
  }

  dispose() {
    this.activeNodes.forEach((node) => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch (e) {}
    });
    this.activeNodes.clear();

    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch (e) {}
    }

    if (this.ctx && this.ctx.state !== 'closed') {
      try { this.ctx.close(); } catch (e) {}
    }

    if (this.audioBuffers) {
      this.audioBuffers.clear();
    }
    delete window.__DRAGON_AUDIO__;
  }
}
