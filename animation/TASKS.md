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

- [ ] Import STL into Blender.
- [ ] Compare both models.
- [ ] Check alignment.
- [ ] Evaluate compatible surface details.
- [ ] Test retopology or texture baking where appropriate.
- [ ] Preserve the GLB rig.
- [ ] Export optimized GLB if modifications are justified.
- [ ] Validate final exported model.

**Completion requirement:** The primary model must retain its rig and original appearance.

## Phase 5 – Visual Effects

- [ ] Add red eye glow.
- [ ] Add floating embers.
- [ ] Add smoke.
- [ ] Add controlled atmospheric lighting.
- [ ] Add optional camera shake.
- [ ] Add fire particles.
- [ ] Add fire lighting effects.
- [ ] Optimize effect density.

**Completion requirement:** Effects must not significantly reduce website usability.

## Phase 6 – Audio System

- [ ] Create audio manager.
- [ ] Add dragon growl.
- [ ] Add dragon roar.
- [ ] Add dragon breathing.
- [ ] Add fire blast.
- [ ] Add fire crackling.
- [ ] Add wind whoosh.
- [ ] Add cinematic impact.
- [ ] Add optional ambience.
- [ ] Implement sound toggle.
- [ ] Implement volume slider.
- [ ] Prevent overlapping audio.
- [ ] Implement missing-file handling.

**Completion requirement:** Every available sound effect must be triggered intentionally and correctly.

## Phase 7 – Mouse Interaction

- [ ] Implement pointer tracking.
- [ ] Add camera parallax.
- [ ] Add head tracking if supported.
- [ ] Add accessible roar control.
- [ ] Add fire control.
- [ ] Smooth movement using interpolation.
- [ ] Prevent extreme rotations.

## Phase 8 – Scroll Interaction

- [ ] Install or reuse GSAP.
- [ ] Configure ScrollTrigger where appropriate.
- [ ] Implement camera movement.
- [ ] Implement dragon repositioning.
- [ ] Add section transitions.
- [ ] Preserve normal scrolling.

## Phase 9 – User Interface

- [ ] Add Enter Experience.
- [ ] Add Skip Intro.
- [ ] Add sound toggle.
- [ ] Add volume control.
- [ ] Add roar button.
- [ ] Add fire button.
- [ ] Add replay functionality.
- [ ] Make controls responsive.
- [ ] Add keyboard support.

## Phase 10 – Performance Optimization

- [ ] Optimize GLB file.
- [ ] Optimize textures.
- [ ] Reduce unnecessary render calls.
- [ ] Limit device pixel ratio.
- [ ] Reduce mobile particles.
- [ ] Lazy-load nonessential assets.
- [ ] Pause rendering when hidden.
- [ ] Dispose unused resources.
- [ ] Add reduced-motion support.

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