# PRD – Interactive 3D Dragon Website Experience

## 1. Project Overview

**Project Name:** Interactive 3D Dragon Experience

**Project Type:** Website Enhancement

**Primary Objective:** Transform the existing website into an immersive cinematic experience featuring an interactive red Chinese dragon.

The experience will combine 3D rendering, animation, sound effects, mouse interactions, scroll-based movement and cinematic visual effects.

The dragon must preserve the visual identity of the supplied red Chinese dragon reference.

## 2. Available Assets

### Primary Dragon Model

File: `chinese_dragon.glb`

Verified properties:
- GLB 2.0.
- Approximately 26.7 MB.
- 2 meshes.
- 50,553 triangles.
- 273 joints.
- 1 skeleton.
- 1 animation clip: `Take 001`.
- Animation duration: 57.5 seconds.
- 4 embedded PNG images.
- 2 materials.

### Secondary Dragon Model

File: `Mystical_Chine_Dragon_V_EYE.stl`

Verified properties:
- Approximately 90.2 MB.
- Approximately 1.8 million triangles.
- Static geometry.
- No skeleton or animation information.

The GLB is the primary animation model. The STL is a secondary visual reference and potential detail source.

## 3. Project Goals

1. Display a genuine 3D dragon.
2. Preserve its red Chinese dragon appearance.
3. Play the existing model animation.
4. Add natural head, body and tail movement where supported.
5. Implement mouse interaction.
6. Add cinematic camera movement.
7. Add synchronized dragon sound effects.
8. Add fire and particle effects.
9. Make the experience responsive.
10. Preserve the existing website functionality.

## 4. Target Experience

The visitor should experience:

- A mysterious black opening screen.
- Gradual dragon reveal.
- Red glowing eyes.
- Smooth floating movement.
- Cursor-responsive dragon movement.
- Dragon roar interaction.
- Fire-breathing effect.
- Scroll-based camera movement.
- Cinematic audio effects.

## 5. Functional Requirements

### FR-01: Dragon Rendering

The website must load and display the actual supplied GLB model.

### FR-02: Existing Animation

Use the existing `Take 001` animation after inspecting its movement and looping behaviour.

### FR-03: Idle Animation

Implement suitable idle breathing and subtle movement using available animation controls.

### FR-04: Mouse Interaction

The dragon and camera should respond subtly to pointer movement.

### FR-05: Roar Interaction

A visitor should be able to trigger a dragon roar through an accessible control.

### FR-06: Fire Interaction

Provide a fire-breathing effect with synchronized audio.

### FR-07: Sound Management

Implement mute, unmute and volume controls.

### FR-08: Scroll Interaction

Connect selected scroll progress to camera and dragon movement.

### FR-09: Responsive Behaviour

Support desktop, tablet and mobile devices.

### FR-10: Fallback

The website must remain usable if WebGL or model loading fails.

## 6. Non-Functional Requirements

- Maintain good loading performance.
- Minimize unnecessary dependencies.
- Avoid memory leaks.
- Avoid duplicate render loops.
- Support keyboard accessibility.
- Respect reduced-motion preferences.
- Avoid unnecessary background audio.
- Optimize for lower-powered devices.

## 7. Non-Goals

- Rebuilding the entire website.
- Replacing existing sections.
- Adding an unrelated dragon model.
- Automatically assuming missing animation clips exist.
- Forcing visitors to enable audio.
- Making the dragon block website navigation.

## 8. Acceptance Criteria

The project is acceptable when:

- The real GLB dragon renders correctly.
- Existing animation plays.
- Dragon controls work.
- Audio plays after user interaction.
- Mute and volume controls work.
- Fire effects work when activated.
- Mobile layout is usable.
- Existing website functions remain intact.
- Missing assets are reported honestly.

## 9. Priority

P0: Dragon model loading and visibility.

P1: Existing animation playback.

P2: Additional animations and audio.

P3: Mouse and scroll interactions.

P4: Advanced effects and optimization.

## 10. Final Objective

Create a premium cinematic interactive red Chinese dragon experience without compromising the existing website.