/**
 * Dragon Audio Management System (Phase 6 & Audio Integration)
 * Handles high-fidelity audio playback, sound effects, ambience, volume,
 * muting, channel concurrency management, smooth fade transitions,
 * and procedural synthesis fallback.
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

    // Sound registry with primary provided audio assets and procedural companions
    this.soundDefs = {
      roar: {
        path: 'assets/audio/dragon-studio-epic-dragon-roar-364481.mp3',
        fallbackPath: 'public/audio/dragon-roar.mp3',
        priority: 10,
        maxChannels: 1,
        volume: 1.0 // 100% reference level
      },
      fire_crackling: {
        path: 'assets/audio/fire-crackling.mp3',
        fallbackPath: 'public/audio/fire-crackling.mp3',
        priority: 8,
        maxChannels: 1,
        volume: 0.45 // 35–55% suggested level
      },
      fire_blast: {
        path: '', // Procedural flame whoosh burst
        priority: 7,
        maxChannels: 1,
        volume: 0.55 // 50–65% suggested level
      },
      breath: {
        path: '', // Procedural low-frequency dragon breathing
        priority: 2,
        maxChannels: 1,
        volume: 0.20 // 15–25% suggested level
      },
      ambience: {
        path: '', // Procedural subtle ambient atmosphere
        priority: 1,
        maxChannels: 1,
        volume: 0.15 // 10–20% suggested level
      },
      growl: {
        path: '', // Procedural subtle growl
        priority: 6,
        maxChannels: 1,
        volume: 0.50
      }
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
   * Sound Loading & Missing-File Fallback Handling
   * --------------------------------------------------------- */
  preloadSounds() {
    for (const [name, def] of Object.entries(this.soundDefs)) {
      if (def.path) {
        this.loadSound(name, def.path, def.fallbackPath);
      }
    }
  }

  loadSound(name, path, fallbackPath) {
    if (!this.ctx) return;

    fetch(path)
      .then((res) => {
        if (!res.ok) {
          if (fallbackPath) {
            return fetch(fallbackPath).then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.arrayBuffer();
            });
          }
          throw new Error(`HTTP ${res.status}`);
        }
        return res.arrayBuffer();
      })
      .then((buffer) => this.ctx.decodeAudioData(buffer))
      .then((decoded) => {
        this.audioBuffers.set(name, decoded);
      })
      .catch((err) => {
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

  stopWithFade(name, fadeDuration = 0.35) {
    const list = this.activeNodes.get(name);
    if (!list || list.length === 0 || !this.ctx) return;
    const now = this.ctx.currentTime;
    list.forEach((src) => {
      if (src._gainNode) {
        src._gainNode.gain.cancelScheduledValues(now);
        src._gainNode.gain.setValueAtTime(src._gainNode.gain.value, now);
        src._gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
      }
      setTimeout(() => {
        try {
          src.stop();
          src.disconnect();
        } catch (e) {}
      }, (fadeDuration + 0.05) * 1000);
    });
    this.activeNodes.set(name, []);
  }

  stopAll() {
    for (const name of Object.keys(this.soundDefs)) {
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
      this.duckBackgroundSounds(2.5);
    }

    const buffer = this.audioBuffers.get(name);
    if (buffer && buffer !== 'PROCEDURAL_SYNTH') {
      return this.playBuffer(name, buffer, options, def.volume);
    } else {
      return this.playProceduralFallback(name, options, def.volume);
    }
  }

  playBuffer(name, buffer, options, defVolume = 1.0) {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = Boolean(options.loop);

    const gainNode = this.ctx.createGain();
    const targetVol = typeof options.volume === 'number' ? options.volume : defVolume;

    const now = this.ctx.currentTime;
    if (options.fadeIn && options.fadeIn > 0) {
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(targetVol, now + options.fadeIn);
    } else {
      gainNode.gain.setValueAtTime(targetVol, now);
    }

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    source._gainNode = gainNode;

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
    ['ambience', 'breath'].forEach((bgName) => {
      const list = this.activeNodes.get(bgName);
      if (list && list.length > 0) {
        list.forEach((src) => {
          if (src._gainNode) {
            src._gainNode.gain.cancelScheduledValues(now);
            src._gainNode.gain.setValueAtTime(0.15, now);
            src._gainNode.gain.linearRampToValueAtTime(0.20, now + duration);
          }
        });
      }
    });
  }

  /* ---------------------------------------------------------
   * Procedural Audio Synthesis Fallback (Web Audio API)
   * --------------------------------------------------------- */
  playProceduralFallback(name, options = {}, defVolume = 1.0) {
    if (!this.ctx) return null;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);
    const vol = typeof options.volume === 'number' ? options.volume : defVolume;

    switch (name) {
      case 'roar': {
        const osc = this.ctx.createOscillator();
        const oscSub = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        oscSub.type = 'triangle';

        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 2.2);
        oscSub.frequency.setValueAtTime(65, now);
        oscSub.frequency.exponentialRampToValueAtTime(28, now + 2.2);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now);
        filter.Q.setValueAtTime(4.0, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.9 * vol, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

        osc.connect(filter);
        oscSub.connect(filter);
        filter.connect(gain);

        osc.start(now);
        oscSub.start(now);
        osc.stop(now + 3.2);
        oscSub.stop(now + 3.2);
        break;
      }

      case 'fire_crackling':
      case 'fire_blast': {
        // Bandpass filtered noise burst for fire ignition / crackle
        const bufferSize = Math.floor(this.ctx.sampleRate * 2.0);
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        if (options.loop) noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 1.8);
        filter.Q.setValueAtTime(1.8, now);

        if (options.fadeIn && options.fadeIn > 0) {
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.7 * vol, now + options.fadeIn);
        } else {
          gain.gain.setValueAtTime(0.7 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        }

        noise.connect(filter);
        filter.connect(gain);
        noise.start(now);
        if (!options.loop) {
          noise.stop(now + 2.0);
        }
        break;
      }

      case 'breath': {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 2.0);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.25 * vol, now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 2.0);
        break;
      }

      case 'growl': {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
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
    this.activeNodes.forEach((list) => {
      if (Array.isArray(list)) {
        list.forEach((node) => {
          try {
            if (typeof node.stop === 'function') node.stop();
            if (typeof node.disconnect === 'function') node.disconnect();
          } catch (e) {}
        });
      }
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
