# ARCHITECTURE – 3D Dragon Experience

## 1. Architecture Overview

The dragon experience will be a modular feature integrated into the existing website.

### Main Technologies

- Three.js – 3D scene and rendering.
- GLTFLoader – GLB model loading.
- AnimationMixer – Model animation playback.
- GSAP – Animation timelines.
- GSAP ScrollTrigger – Scroll-based animation.
- Web Audio API / HTML Audio – Sound management.
- Blender – Model inspection, rigging and asset preparation.

Reuse the existing framework and dependency structure.

## 2. High-Level Architecture

```text
Existing Website
       |
       v
 Dragon Experience
       |
       +----------------------+
       |                      |
       v                      v
  Three.js Scene          UI Controls
       |                      |
       v                      v
  GLB Model Loader        Interactions
       |
       v
  Animation Controller
       |
       +----------------------+
       |                      |
       v                      v
  Camera Controller      Visual Effects
       |                      |
       v                      v
  GSAP / Scroll          Particles / Fire
       |
       v
  Audio Manager
       |
       v
  Dragon Sound Effects
```

## 3. Recommended Module Responsibilities

### dragon-scene.js

Responsibilities:
- Initialize scene.
- Create camera.
- Create renderer.
- Configure lighting.
- Load the dragon.
- Manage rendering.

### dragon-loader.js

Responsibilities:
- Load GLB model.
- Display loading progress.
- Handle loading errors.
- Configure model position.
- Verify model dimensions.

### dragon-animation.js

Responsibilities:
- Manage AnimationMixer.
- Load existing animation clips.
- Control playback speed.
- Handle transitions.
- Manage additional procedural animations where supported.

### dragon-interactions.js

Responsibilities:
- Mouse movement.
- Click interactions.
- Touch interactions.
- Cursor following.
- Interaction state management.

### camera-controller.js

Responsibilities:
- Camera positioning.
- Camera rotation.
- Smooth movement.
- Scroll synchronization.
- Parallax effects.

### audio-manager.js

Responsibilities:
- Load sound files.
- Play sound effects.
- Manage volume.
- Mute and unmute.
- Prevent audio overlap.
- Handle loading errors.

### dragon-effects.js

Responsibilities:
- Red particles.
- Smoke.
- Embers.
- Fire effects.
- Eye glow.
- Camera impact effects.

## 4. Model Pipeline

```text
Original GLB Model
        |
        v
Inspect Skeleton and Animation
        |
        v
Blender Validation
        |
        v
Compare STL Details
        |
        v
Compatible Detail Transfer
        |
        v
Optimize Textures and Geometry
        |
        v
Export Final GLB
        |
        v
Three.js Integration
```

The existing GLB skeleton must be preserved.

Do not combine two complete meshes blindly.

## 5. Model Loading Lifecycle

```text
NOT_STARTED
     |
     v
LOADING
     |
     +-------> ERROR
     |
     v
LOADED
     |
     v
INITIALIZED
     |
     v
ANIMATING
     |
     v
INTERACTIVE
```

Handle errors without affecting the rest of the website.

## 6. Animation Architecture

Use THREE.AnimationMixer with the existing animation clip.

Implement:
- Existing animation playback.
- Animation loop.
- Playback speed adjustment.
- Smooth transitions where appropriate.
- Additional animation states only when supported.

The existing `Take 001` clip must be examined before assigning it to a specific action.

## 7. Audio Architecture

The audio manager must be independent of the rendering system.

Suggested state:

```javascript
const audioState = {
  enabled: false,
  muted: false,
  volume: 0.6,
  currentSounds: [],
};
```

Suggested audio categories:

```text
audio/
  dragon-growl.mp3
  dragon-roar.mp3
  dragon-breathing.mp3
  fire-blast.mp3
  fire-crackle.mp3
  wind-whoosh.mp3
  cinematic-impact.mp3
  dark-ambience.mp3
```

These are required filenames, not existing files.

Audio should start only after user interaction.

## 8. Performance Architecture

- Lazy-load the model.
- Avoid unnecessary render calls.
- Use requestAnimationFrame appropriately.
- Pause rendering when the page is hidden.
- Reduce particle density on mobile.
- Limit device pixel ratio.
- Dispose unused geometries, materials and textures.
- Avoid unnecessary post-processing.

## 9. Failure Handling

Provide fallback behaviour for:

- Model loading errors.
- Texture loading errors.
- WebGL initialization failures.
- Missing audio.
- Unsupported animation.
- Mobile performance limitations.

## 10. Architecture Rule

The dragon feature must remain isolated from unrelated website functionality.