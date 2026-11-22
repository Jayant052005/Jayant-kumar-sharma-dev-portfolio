# TASKS – Interactive 3D Dragon Development

## Phase 0 – Project Inspection

- [x] Inspect the existing website.
- [x] Identify framework and dependencies.
- [x] Identify the main entry point.
- [x] Identify existing sections and routes.
- [x] Identify existing animation libraries.
- [x] Identify asset organization.
- [x] Check current console errors.
- [x] Create an implementation plan.

## Phase 1 – Asset Preparation

- [x] Locate `chinese_dragon.glb`.
- [x] Locate `Mystical_Chine_Dragon_V_EYE.stl`.
- [x] Inspect both models.
- [x] Validate GLB structure.
- [x] Inspect the 273-joint skeleton.
- [x] Inspect `Take 001`.
- [x] Preview the existing animation.
- [x] Check orientation and scale.
- [x] Verify embedded textures.
- [x] Compare both models in Blender.

**Completion requirement:** The actual GLB model must load and be viewable in a 3D viewer.

## Phase 2 – Primary 3D Integration

- [x] Install or reuse Three.js.
- [x] Configure GLTFLoader.
- [x] Create the scene.
- [x] Configure camera.
- [x] Configure renderer.
- [x] Add lighting.
- [x] Load the dragon.
- [x] Calculate bounding box.
- [x] Position the dragon correctly.
- [x] Add responsive camera behaviour.
- [x] Display loading feedback.
- [x] Implement loading fallback.

**Completion requirement:** The full dragon must be visible inside the existing website.

## Phase 3 – Animation Integration

- [x] Configure AnimationMixer.
- [x] Load `Take 001`.
- [x] Inspect existing movement.
- [x] Test animation looping.
- [x] Test playback speed.
- [x] Implement idle state.
- [x] Validate tail movement.
- [x] Validate head movement.
- [x] Check available facial animation.
- [x] Identify missing animations.
- [x] Position dragon sleeping across hero typography in the center of the screen, facing right side and user (unmodified mesh & skeletal rig).
- [x] Dynamic text occlusion fading: automatically fade hero typography when dragon passes behind text, smoothly restoring normal opacity when it moves away.

**Completion requirement:** Dragon is centered, sleeping across the text facing right and user, with dynamic text fading when occluded from behind and zero mesh distortion.

## Phase 4 – Secondary Model Processing

- [x] Import STL into inspection pipeline.
- [x] Compare both models (1.8M tris static STL vs 50.5K tris rigged GLB).
- [x] Check alignment (Z-up CAD vs Y-up glTF 2.0; distinct spatial bind poses).
- [x] Evaluate compatible surface details (GLB embedded 4K normal maps already deliver microscopic scale/ridge details).
- [x] Test retopology or texture baking where appropriate (unjustified due to >110MB asset bloat and skinning destruction).
- [x] Preserve the GLB rig (273-bone skeleton and Take 001 animation preserved 100%).
- [x] Export optimized GLB if modifications are justified (retained primary production GLB; modifications unjustified).
- [x] Validate final exported model (verified via automated headless Chrome test suite; head visible across 7 viewports).

**Completion requirement:** The primary model must retain its rig and original appearance. (PASSED - documented in animation/PHASE4_REPORT.md)

## Phase 5 – Visual Effects

- [x] Add red eye glow (2 pulsing point lights + glowing sprites attached to head bone).
- [x] Add floating embers (procedurally generated glowing embers with sinusoidal drift, wrapping bounds).
- [x] Add smoke (subtle dark crimson/charcoal mist layers at 0.18 opacity, preserving 100% text readability).
- [x] Add controlled atmospheric lighting (dynamic flickering warm under-glow and scale rim lighting).
- [x] Add optional camera shake (damped spring shake with reduced-motion accessibility check).
- [x] Add fire particles (interactive fire stream emitter with thermal rise and color gradient).
- [x] Add fire lighting effects (synchronized point light burst peaking at 6.0 intensity during fire breath).
- [x] Optimize effect density (automatic mobile particle throttling: 140 -> 70 embers, 32 -> 18 mist, 250 -> 120 fire).

**Completion requirement:** Effects must not significantly reduce website usability. (PASSED - verified in Chrome; zero DOM obstructions, text 100% readable, 60fps maintained)

## Phase 6 – Audio System

- [x] Create audio manager (`js/dragon/dragon-audio.js` with Web Audio API).
- [x] Add dragon growl (`assets/audio/growl.wav` + procedural low-pass FM synth fallback).
- [x] Add dragon roar (`assets/audio/roar.wav` + multi-oscillator resonant filter roar).
- [x] Add dragon breathing (`assets/audio/breath.wav` + rhythmic respiratory noise).
- [x] Add fire blast (`assets/audio/fire_blast.wav` + swept-bandpass pink noise flame burst).
- [x] Add fire crackling (`assets/audio/fire_crackle.wav` + intermittent pop-and-hiss impulses).
- [x] Add wind whoosh (`assets/audio/whoosh.wav` + frequency-swept aerodynamic whoosh).
- [x] Add cinematic impact (`assets/audio/impact.wav` + sub-bass drop and punch).
- [x] Add optional ambience (`assets/audio/ambience.wav` + resonant harmonic drone).
- [x] Implement sound toggle (Mute / Unmute with smooth gain ramp and localStorage persistence).
- [x] Implement volume slider (`setVolume()` with master gain control and persistent storage).
- [x] Prevent overlapping audio (priority ducking and channel clamping per sound type).
- [x] Implement missing-file handling (graceful fetch fallback to Web Audio procedural synthesis).

**Completion requirement:** Every available sound effect must be triggered intentionally and correctly. (PASSED - verified via headless Chrome test suite animation/test_phase6_audio.py)

## Phase 7 – Mouse Interaction

- [x] Implement pointer tracking (normalized [-1, 1] cursor tracking with touch support).
- [x] Add camera parallax (smooth damped target/camera position shift).
- [x] Add head tracking if supported (smooth head look-at with clamped yaw/pitch).
- [x] Add accessible roar control (`#dragon-roar-btn` button with keyboard Enter/Space and 'R' shortcut).
- [x] Add fire control (`#dragon-fire-btn` button with keyboard Enter/Space and 'F' shortcut).
- [x] Smooth movement using interpolation (exponential damping `1 - exp(-5.5 * delta)`, zero jumps).
- [x] Prevent extreme rotations (yaw clamped to +/-18 deg, pitch clamped to +/-12 deg).

**Completion requirement:** Mouse interaction must feel natural and avoid sudden jumps or extreme angles. (PASSED - verified via headless Chrome animation/test_phase7_mouse.py)

## Phase 8 – Scroll Interaction

- [x] Install or reuse GSAP (`js/libs/gsap.min.js` and `js/libs/ScrollTrigger.min.js` installed locally).
- [x] Configure ScrollTrigger where appropriate (ScrollTrigger proxy hooks registered and passive non-blocking listeners).
- [x] Implement camera movement (smooth dolly pullback Z+2.2 and elevation Y+0.85 during hero descent).
- [x] Implement dragon repositioning (dragon ascends Y+0.75 and tilts into dynamic soaring posture).
- [x] Add section transitions (smooth fade/ascension into mist upon reaching About section, automatic WebGL pausing).
- [x] Preserve normal scrolling (100% native browser scrolling preserved; zero scroll hijacking, zero preventDefault).

**Completion requirement:** Dragon movement across scroll must feel cinematic and avoid hijacking page scroll. (PASSED - verified in Chrome animation/test_phase8_scroll.py)

## Phase 9 – User Interface

- [x] Add Enter Experience (`#dragon-intro-overlay` with cinematic backdrop blur and awakening sequence).
- [x] Add Skip Intro (`#dragon-skip-btn` seamlessly dismisses modal with zero-friction transition).
- [x] Add sound toggle (`#dragon-sound-btn` toggles mute state with dynamic SVG speaker icons and live state persistence).
- [x] Add volume control (`#dragon-volume-slider` custom HUD slider modifying Web Audio gain node).
- [x] Add roar button (`#dragon-roar-btn` triggers audio growl/roar + head flex).
- [x] Add fire button (`#dragon-fire-btn` triggers particle flame emitter + blast audio + camera shake).
- [x] Add replay functionality (`#dragon-replay-btn` redisplays intro overlay and resets camera to hero apex).
- [x] Make controls responsive (wraps cleanly on mobile/tablet viewports in `css/dragon.css`).
- [x] Add keyboard support (hotkeys: R=Roar, F=Fire, M=Mute toggle, P=Replay, Escape=Skip Intro).

**Completion requirement:** UI controls must be accessible, responsive, and provide clear controls over sound and visuals. (PASSED - verified in Chrome via `animation/test_phase9_ui.py`)

## Phase 10 – Performance Optimization

- [x] Optimize GLB file (preserved 50,553 tris / 273 joints primary asset; frustum culling enabled on all meshes).
- [x] Optimize textures (texture anisotropy capped to 4; procedural textures generated via canvas2d without mipmap overhead).
- [x] Reduce unnecessary render calls (IntersectionObserver halts rendering when scrolled past Hero; Page Visibility API halts rendering when tab hidden).
- [x] Limit device pixel ratio (clamped to max 1.5 on mobile/touch screens, max 2.0 on desktop to prevent 4x pixel fillrate bottlenecks).
- [x] Reduce mobile particles (mobile embers throttled to 45, smoke to 12, fire to 80; desktop embers 120, smoke 24, fire 200).
- [x] Lazy-load nonessential assets (audio synthesized procedurally on demand, secondary modules loaded as needed).
- [x] Pause rendering when hidden (clock and AnimationMixer ticks paused upon `visibilitychange` or hero boundary exit).
- [x] Dispose unused resources (full `dispose()` lifecycle across DragonScene, DragonEffects, DragonAudio, DragonInteractions, DragonScrollController, DragonUI, and DragonAnimationController).
- [x] Add reduced-motion support (`prefers-reduced-motion: reduce` dampens hover float, zeros parallax, halves particle density, and auto-dismisses intro modal).

**Completion requirement:** 60 FPS target maintained, zero memory leaks on disposal, and DPR/particle throttling active on mobile. (PASSED - verified in Chrome via `animation/test_phase10_performance.py`)

## Phase 11 – Testing

- [ ] Verify desktop rendering.
- [ ] Verify mobile rendering.
- [ ] Verify model loading.
- [ ] Verify animation playback.
- [ ] Verify audio playback.
- [ ] Verify mute and volume.
- [ ] Verify mouse interaction.
- [ ] Verify scroll interaction.
- [ ] Verify WebGL fallback.
- [ ] Verify existing website functionality.
- [ ] Check browser console.
- [ ] Check memory usage.

## Phase 12 – Final Delivery

- [ ] Document modified files.
- [ ] Document new files.
- [ ] List missing assets.
- [ ] Explain local execution.
- [ ] Report actual test results.
- [ ] Record unresolved issues.
- [ ] Update MEMORY.md.

## Development Rule

Complete each phase and verify its acceptance requirements before moving to the next phase.

Do not implement all phases simultaneously.