# ASSETS – Dragon Project Asset Management

## 1. Asset Directory

Recommended structure, adapted to the existing project:

```text
public/
└── assets/
    └── dragon/
        ├── models/
        │   ├── chinese_dragon.glb
        │   ├── original_dragon.stl
        │   └── final_dragon.glb
        │
        ├── audio/
        │   ├── dragon-growl.mp3
        │   ├── dragon-roar.mp3
        │   ├── dragon-breathing.mp3
        │   ├── fire-blast.mp3
        │   ├── fire-crackle.mp3
        │   ├── wind-whoosh.mp3
        │   ├── cinematic-impact.mp3
        │   └── dark-ambience.mp3
        │
        ├── textures/
        │   ├── dragon-basecolor.png
        │   ├── dragon-normal.png
        │   ├── dragon-roughness.png
        │   └── dragon-emissive.png
        │
        └── fallback/
            └── dragon-fallback.png
```

## 2. Existing Primary Model

Filename: `chinese_dragon.glb`

Status: AVAILABLE

Source:

https://sketchfab.com/3d-models/chinese-dragon-a5ad5ec06f43461f95bb93e95fe7553b

Creator: MAXDESIGN-3D

License: Creative Commons Attribution (CC BY).

Verified model properties:

- 26.7 MB approximately.
- 50,553 triangles.
- 2 meshes.
- 273 joints.
- 1 skeleton.
- 1 animation clip.
- Animation name: `Take 001`.
- Duration: 57.5 seconds.
- 4 embedded PNG images.
- 2 materials.

Use as the primary animated model.

## 3. Existing Secondary Model

Filename: `Mystical_Chine_Dragon_V_EYE.stl`

Status: AVAILABLE

Properties:

- Approximately 90.2 MB.
- Approximately 1.8 million triangles.
- Static mesh.
- No embedded animation.
- No skeleton.

Use as:
- High-detail reference.
- Potential geometry detail source.
- Visual comparison reference.

Do not merge the complete model blindly.

The user's rights to use and redistribute this STL should be checked before publishing it.

## 4. Required Audio Assets

### Dragon Sounds

- [ ] dragon-growl.mp3
- [ ] dragon-roar.mp3
- [ ] dragon-breathing.mp3

### Fire Sounds

- [ ] fire-blast.mp3
- [ ] fire-crackle.mp3

### Environmental Sounds

- [ ] wind-whoosh.mp3
- [ ] cinematic-impact.mp3
- [ ] dark-ambience.mp3

All audio files must have appropriate licences.

These filenames are expected assets, not files already supplied.

## 5. Texture Requirements

If the final model needs additional textures, use:

- Base colour.
- Normal map.
- Roughness map.
- Emissive map.

Preserve the original embedded textures unless replacements are required.

## 6. Final Model Requirements

Expected output:

`final_dragon.glb`

Requirements:

- Optimized geometry.
- Correct materials.
- Preserved skeleton.
- Preserved existing animation.
- Valid GLB export.
- Appropriate model scale.
- Correct orientation.
- Browser-compatible textures.

Do not delete original model files during processing.

## 7. Required Attribution

Sketchfab model:

Title: Chinese dragon

Creator: MAXDESIGN-3D

Source:
https://sketchfab.com/3d-models/chinese-dragon-a5ad5ec06f43461f95bb93e95fe7553b

License: CC BY 4.0.

Attribution must credit the original creator, provide the source and licence link, and identify modifications where applicable.

Licence:
https://creativecommons.org/licenses/by/4.0/

## 8. Asset Management Rules

- Preserve original assets.
- Do not overwrite source models.
- Store optimized exports separately.
- Keep audio organized.
- Avoid duplicate textures.
- Track asset licences.
- Document missing files.
- Never reference files that do not exist.