# RULES – Dragon Project Development Rules

## 1. Existing Website Protection

- Inspect the entire project before editing.
- Preserve existing pages and sections.
- Preserve navigation and routes.
- Preserve authentication and backend functionality.
- Preserve existing forms and integrations.
- Do not rebuild unrelated components.
- Do not delete working code unnecessarily.

## 2. Model Rules

- Use the supplied `chinese_dragon.glb` as the primary model.
- Use the supplied STL as a secondary reference.
- Never substitute an unrelated stock dragon.
- Do not overlay two complete dragon models.
- Preserve the primary skeleton and skin weights.
- Verify every animation before using it.
- Never label an unrigged model as rigged.

## 3. Animation Rules

- Inspect the `Take 001` animation before implementation.
- Use the AnimationMixer where appropriate.
- Avoid unnatural mesh deformation.
- Avoid abrupt animation transitions.
- Do not assume a roar or fire animation exists.
- Clearly identify missing animation capabilities.

## 4. Audio Rules

- Audio must not autoplay before user interaction.
- Never force visitors to enable sound.
- Implement mute and volume controls.
- Prevent duplicated playback.
- Avoid unnecessarily loud background audio.
- Verify audio files and paths.
- Use licensed audio assets.

## 5. Performance Rules

- Optimize large assets.
- Avoid unnecessary dependencies.
- Avoid excessive particle effects.
- Limit rendering resolution on weaker devices.
- Pause unnecessary rendering.
- Dispose unused resources.
- Keep the website responsive.

## 6. Coding Rules

- Use reusable modules.
- Keep responsibilities separated.
- Use meaningful variable names.
- Add error handling.
- Avoid duplicate initialization.
- Avoid global variables unless necessary.
- Follow the current project's coding conventions.

## 7. Asset Rules

- Keep 3D models in the appropriate assets directory.
- Keep audio files separate.
- Keep textures organized.
- Maintain attribution information.
- Do not silently replace unavailable assets with placeholders.
- Clearly mark temporary placeholders.

## 8. Testing Rules

- Test the actual implementation.
- Do not claim features work without testing.
- Report failures.
- Preserve existing functionality.
- Do not leave broken controls.

## 9. Development Priority

Always follow:

1. Model loading.
2. Model rendering.
3. Existing animation.
4. Rig and movement validation.
5. Visual effects.
6. Audio.
7. Interaction.
8. Performance optimization.

## 10. Final Principle

Preserve the existing website and build the dragon experience as an independent, maintainable feature.