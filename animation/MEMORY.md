# MEMORY – Interactive 3D Dragon Experience

## 1. Project Identity

Project Name: Interactive 3D Dragon Experience

Project Type: Existing Website Enhancement

Main Theme: Cinematic Red Chinese Dragon.

Primary Goal: Integrate a real interactive 3D dragon into the existing website.

## 2. User Requirements

The user wants:

- A genuine 3D dragon.
- Appearance inspired by the supplied red dragon reference.
- Cinematic entrance.
- Serpentine body movement.
- Floating dragon experience.
- Mouse interaction.
- Scroll-based movement.
- Dragon roar.
- Fire-breathing effects.
- Dragon breathing sounds.
- Environmental sounds.
- Sound controls.
- Responsive behaviour.

## 3. Development Preferences

- Preserve the existing website.
- Minimize unnecessary technologies.
- Prefer free tools.
- Avoid unnecessary paid services.
- Keep implementation modular.
- Prioritize performance.
- Explain missing assets clearly.
- Implement features in stages.

## 4. Available Models

### Primary Model

`chinese_dragon.glb`

Verified:
- Approximately 26.7 MB.
- GLB 2.0.
- 2 meshes.
- 50,553 triangles.
- 273 joints.
- 1 skeleton.
- 1 animation clip.
- Animation: `Take 001`.
- Duration: 57.5 seconds.
- 4 embedded PNG images.
- 2 materials.

Creator: MAXDESIGN-3D.

Source:
https://sketchfab.com/3d-models/chinese-dragon-a5ad5ec06f43461f95bb93e95fe7553b

Licence: CC BY 4.0.

### Secondary Model

`Mystical_Chine_Dragon_V_EYE.stl`

Verified:
- Approximately 90.2 MB.
- Approximately 1.8 million triangles.
- Static geometry.
- No rig.
- No animation.

Purpose:
- Visual reference.
- Potential detail source.

## 5. Important Decisions

1. The GLB is the primary animated model.
2. The STL is the secondary reference.
3. Do not merge the complete models blindly.
4. Preserve the primary model's rig.
5. Use Blender for inspection and processing.
6. Use Three.js for website rendering.
7. Use GSAP for suitable visual transitions.
8. Use a separate audio manager.
9. Preserve the existing website.
10. Build in stages.
11. Dragon Centered & Sleeping on Text Facing Right: Dragon is positioned at `pivot.position.set(-0.25, 0.35, 0.15)` with horizontal sleeping orientation `(rotY: 0.48π, rotX: 0.12π, rotZ: -0.22π)` so it lies centered across the hero letters facing toward the right side and user, maintaining 100% natural, unmodified `Take 001` mesh geometry without any manual bone overrides.
12. Dynamic Text Occlusion Fading: When the dragon's spine bones pass behind hero typography bounding boxes, the `.is-behind-dragon` CSS class fades the text opacity to `0.22` with a smooth 0.45s transition; when it moves away, opacity smoothly restores to normal (`1.0`). Strictly zero inline styles used.

## 6. Current Known Limitations

- The existing GLB contains only one identified animation clip.
- Separate roar and fire-breath animations have not been verified.
- The existing clip's exact movement has not yet been validated visually.
- STL and GLB geometry compatibility has not been established.
- Additional sound assets have not been supplied.
- Final optimized model has not yet been created.

Do not silently assume these limitations have been resolved.

## 7. Required Future Actions

- Inspect the existing GLB animation.
- Validate model rendering.
- Compare STL and GLB in Blender.
- Decide whether detail transfer is useful.
- Create additional rigging only when needed.
- Obtain licensed sound effects.
- Implement audio synchronization.
- Test browser performance.
- Update TASKS.md.
- Update TESTING.md.

## 8. Development Progress

Phase 0, Phase 1, Phase 2, and Phase 3 completed.

Current status:

- [x] Primary GLB obtained (`assets/dragon/models/chinese_dragon.glb`, 26.7 MB).
- [x] Secondary STL obtained (`animation/Mystical_Chine_Dragon_V_EYE.stl`, 90.2 MB).
- [x] Basic GLB metadata inspected (2 meshes, 28,189 verts, 50,553 tris, 273 joints).
- [x] STL geometry inspected (1.8M tris, static unrigged).
- [x] Existing animation inspected and viewer created (`animation/viewer.html`).
- [x] Phase 0 project inspection completed.
- [x] Phase 1 asset validation and viewer integration completed.
- [x] Phase 2 Primary 3D integration completed (`js/dragon/dragon-scene.js`, `js/dragon/dragon-loader.js`, `css/dragon.css`, `index.html`).
- [x] Phase 3 Animation integration completed (`js/dragon/dragon-animation.js`, AnimationMixer loop at 0.85x speed).
- [x] Dynamic Text Occlusion & 3D Depth Push-Pull: Text dynamically moves back and forth in 3D perspective space based on dragon depth ($Z > 0.3$: dragon in front, text pushed back; $Z \le 0.3$: dragon behind, text pulled forth).
- [ ] Phase 4 Secondary model processing / Blender comparison.
- [ ] Phase 5 Visual effects (eye glow, embers, smoke, fire).
- [ ] Phase 6 Audio system (growl, roar, breathing, fire sounds, volume/mute).
- [ ] Phase 7 Mouse interaction (head/cursor tracking, parallax, click-to-roar).
- [ ] Phase 8 Scroll interaction (GSAP sync).
- [ ] Phase 9 User Interface (Enter experience, HUD controls).
- [ ] Phase 10 Performance optimization.
- [ ] Phase 11 Final testing & regression QA.

### Phase 2 & 3 Implementation Record:
- **Modified files:**
  - `index.html`: Linked `css/dragon.css`, added `#dragon-canvas-container` and `#dragon-loading-indicator`.
  - `js/main.js`: Imported and initialized `initDragonScene()`.
- **New files:**
  - `assets/dragon/models/chinese_dragon.glb`: 26.7 MB model asset copied for production delivery.
  - `js/libs/three.module.js`, `js/libs/GLTFLoader.js`, `js/libs/OrbitControls.js`: Vendored Three.js r128 module libraries.
  - `js/dragon/dragon-scene.js`: Three.js scene, camera, ACESFilmic renderer, dramatic key/fill/rim lighting, resize listener, visibility listener.
  - `js/dragon/dragon-loader.js`: GLTFLoader wrapper with bounding box normalization (scaling 5000-unit model to 14.0 units), centering, progress reporter.
  - `js/dragon/dragon-animation.js`: AnimationMixer wrapper playing `Take 001` (57.5s) on loop with 0.85x idle speed.
  - `css/dragon.css`: External stylesheet strictly adhering to zero inline styles rule (`#dragon-canvas-container`, `.dragon-loading-indicator`, fallback message).
- **Decisions Made:**
  - Model scale normalized to 14.0 units max dimension to fit standard camera frustum at z=16.
  - Model centered at local origin with initial rotation (Y ≈ 0.85π, X ≈ 0.08π) to present a cinematic 3/4 serpentine hero view.
  - Page Visibility API used to pause rendering and mixer ticks when the user switches tabs to preserve GPU/battery.

## 9. Memory Update Rules

Whenever a phase is completed:

1. Update its status.
2. Record modified files.
3. Record newly added assets.
4. Document errors encountered.
5. Document solutions.
6. Update outstanding tasks.
7. Never mark an incomplete task as completed.

## 10. Final Goal

Deliver a polished cinematic dragon experience while maintaining the original website's design, functionality and performance.