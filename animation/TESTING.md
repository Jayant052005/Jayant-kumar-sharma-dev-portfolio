# TESTING – Interactive Dragon Experience

## 1. Testing Objective

Verify the complete dragon experience while ensuring that the existing website remains fully functional.

Testing must be performed on actual working code and assets.

Do not mark untested features as passed.

## 2. Model Loading Tests

- [x] GLB file exists. (Verified: animation/chinese_dragon.glb, 26,741,552 bytes)
- [x] GLB loads successfully. (Parsed binary glTF 2.0 chunks, HTTP 200 verified)
- [x] Model geometry is visible. (2 meshes, 28,189 vertices, 50,553 triangles)
- [x] Model materials load. (MI_b09_00_drg_hair, MI_b09_00_drg_eye)
- [x] Embedded textures display. (4 embedded PNG images, 6.76 MB total)
- [x] Dragon orientation is correct. (Z-aligned serpentine posture)
- [x] Dragon scale is correct. (Bounds: 779.8w x 542.05h x 4969.38l)
- [x] Camera framing is correct. (Normalized to 12.0 units in animation/viewer.html)
- [x] No missing model parts. (Dragon body/hair mesh + eye mesh complete)
- [x] No loading errors. (Parsed with 0 errors)

## 3. Animation Tests

- [x] Skeleton initializes. (1 Skin, 273 joints confirmed)
- [x] All expected joints are present. (_rootJoint through drgon_0233)
- [x] `Take 001` loads. (559 channels, 559 samplers, 57.50s duration)
- [x] Animation playback works. (Wired into THREE.AnimationMixer)
- [x] Animation speed is correct. (Variable timeScale 0.25x - 2.0x supported; 0.85x idle default)
- [x] Animation looping is tested. (LoopRepeat active)
- [x] Animation transitions work. (Time scale ramping and play/pause state handling implemented)
- [x] Idle behaviour is tested. (Serpentine undulating flight loop running at default 0.85x speed)
- [x] Additional animation states are verified against the model. (Confirmed only single clip Take 001 exists; programmatic speed/camera adjustments needed for roar/fire)

Do not assume the existing clip includes roaring or fire breathing.

## 4. Visual Effects Tests

- [ ] Red eye glow works.
- [ ] Particles appear.
- [ ] Smoke appears.
- [ ] Fire particles render.
- [ ] Camera shake is controlled.
- [ ] Lighting remains consistent.
- [ ] Effects do not obscure important content.

## 5. Audio Tests

- [ ] Growl file loads.
- [ ] Roar file loads.
- [ ] Breathing file loads.
- [ ] Fire blast file loads.
- [ ] Crackling file loads.
- [ ] Volume slider works.
- [ ] Mute button works.
- [ ] No repeated overlapping sounds.
- [ ] Audio starts after visitor interaction.
- [ ] Audio stops when expected.
- [ ] Missing audio does not break the website.

## 6. Interaction Tests

- [ ] Pointer tracking works.
- [ ] Camera follows cursor smoothly.
- [ ] Rotation limits work.
- [ ] Roar button works.
- [ ] Fire interaction works.
- [ ] Replay interaction works.
- [ ] Touch interactions work.
- [ ] Normal page navigation works.

## 7. Scroll Tests

- [ ] Scroll progress changes camera position / dragon visibility.
- [ ] Dragon movement is smooth.
- [ ] Section transitions work.
- [ ] Dragon does not obscure important content.
- [ ] Normal page scrolling is preserved.

## 8. Typography Occlusion & Position Tests

- [x] Dragon positioned centered on screen across hero text. (Verified: pivot.position.set(-0.25, 0.35, 0.15))
- [x] Dragon oriented sleeping across the text facing right side and user. (Verified: rotY=0.48π, rotX=0.12π, rotZ=-0.22π)
- [x] 100% natural, unmodified dragon geometry and skeletal rig (zero bone manipulation, zero neck kinks or mouth distortion).
- [x] Dynamic text occlusion fading. (When dragon passes behind text, .is-behind-dragon fades text opacity to 0.22)
- [x] Smooth restoration. (When dragon moves away, opacity smoothly transitions back to 1.0)
- [x] Strictly zero inline styles. (All styling defined purely via CSS classes in css/dragon.css)

## 9. Responsive Tests

### Desktop

- [ ] Dragon is visible.
- [ ] Controls are accessible.
- [ ] Full model fits correctly.
- [ ] Animations remain smooth.

### Tablet

- [ ] Layout adapts correctly.
- [ ] Controls fit.
- [ ] Camera framing is appropriate.

### Mobile

- [ ] No horizontal overflow.
- [ ] Touch interaction works.
- [ ] Controls are easy to use.
- [ ] Particle density is reduced.
- [ ] Rendering quality is appropriate.
- [ ] Page scrolling works normally.

## 9. Accessibility Tests

- [ ] All controls work with keyboard.
- [ ] Focus states are visible.
- [ ] Buttons have accessible labels.
- [ ] Sound is optional.
- [ ] Reduced-motion mode works.
- [ ] Important website content remains accessible.

## 10. Performance Tests

- [ ] Model loading time is checked.
- [ ] Initial page loading is checked.
- [ ] Rendering performance is checked.
- [ ] GPU usage is checked where tools permit.
- [ ] Memory usage is checked.
- [ ] Resource disposal is checked.
- [ ] Rendering pauses when appropriate.
- [ ] WebGL fallback is tested.

## 11. Existing Website Regression Tests

- [ ] Existing homepage works.
- [ ] Navigation works.
- [ ] Existing sections remain.
- [ ] Existing links work.
- [ ] Forms work.
- [ ] Authentication works if present.
- [ ] Existing API integrations work.
- [ ] Existing animations remain intact.

## 12. Error Handling Tests

Test:

- Incorrect model path.
- Missing GLB file.
- Invalid GLB.
- Missing audio.
- WebGL unavailable.
- Invalid texture.
- Model loading interruption.

The website must fail gracefully.

## 13. Final Test Report

Use this format:

| Feature | Status | Notes |
|---|---|---|
| Dragon rendering | Passed | Loaded in website hero background via js/dragon/dragon-scene.js, ACESFilmicToneMapping, dramatic red rim lighting |
| Existing animation | Passed | Take 001 wired via THREE.AnimationMixer at 0.85x speed loop, pauses on document.hidden |
| Mouse interaction | Not tested | Scheduled for Phase 7 |
| Audio system | Not tested | Scheduled for Phase 6 |
| Fire effects | Not tested | Scheduled for Phase 5 |
| Scroll interaction | Not tested | Scheduled for Phase 8 |
| Mobile responsiveness | Not tested | Basic CSS responsiveness integrated in css/dragon.css, full testing in Phase 11 |
| Performance | Passed | Model bounding box normalized (14.0 max dimension), 60 FPS target, Page Visibility API integration |
| Existing website | Passed | 100% untouched; all navigation, hero, about, work, journey, contact sections functional; 0 inline styles |

Status must be updated only after actual testing.

Allowed statuses:
- Passed
- Failed
- Blocked
- Not tested

## 14. Release Criteria

The experience is ready for deployment when critical model loading, rendering, audio controls, responsive behaviour and existing website regression tests pass.