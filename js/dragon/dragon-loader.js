/**
 * Dragon Model Loader Module (Phase 2)
 * Loads chinese_dragon.glb, normalizes bounding box/scale, and handles loading lifecycle.
 */

import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';

export class DragonLoader {
  constructor(options = {}) {
    this.modelPath = options.modelPath || 'assets/dragon/models/chinese_dragon.glb';
    this.onProgress = options.onProgress || null;
    this.onLoad = options.onLoad || null;
    this.onError = options.onError || null;
    this.loader = new GLTFLoader();
  }

  load() {
    this.loader.load(
      this.modelPath,
      (gltf) => {
        const dragonModel = gltf.scene;

        // Calculate accurate bounding box
        const box = new THREE.Box3().setFromObject(dragonModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Normalize model scale: model is approx 5,000 units long
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 7.8 / maxDim; // Calibrated to frame the right side of hero
        dragonModel.scale.setScalar(targetScale);

        // Center on local pivot
        dragonModel.position.x = -center.x * targetScale;
        dragonModel.position.y = -center.y * targetScale;
        dragonModel.position.z = -center.z * targetScale;

        // Wrap in a positioning pivot group for easy rotation/movement
        const pivot = new THREE.Group();
        pivot.add(dragonModel);

        // Sleeping across the hero text, horizontally rotated by 180 degrees and centered on screen
        pivot.rotation.y = Math.PI * 0.48 + (50 * Math.PI / 180) + Math.PI;
        pivot.rotation.x = Math.PI * 0.12;
        pivot.rotation.z = Math.PI * -0.22;
        pivot.position.set(-0.70, -0.60, 0.15);

        // Configure shadows & materials, and extract skeleton bones for occlusion tracking
        let bones = [];
        dragonModel.traverse((child) => {
          if (child.isSkinnedMesh && child.skeleton && child.skeleton.bones.length > 0) {
            bones = child.skeleton.bones;
          }
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.35;
              child.material.metalness = 0.25;
            }
          }
        });

        if (this.onLoad) {
          this.onLoad({
            model: pivot,
            rawScene: dragonModel,
            animations: gltf.animations,
            dimensions: size,
            center: center,
            bones: bones
          });
        }
      },
      (xhr) => {
        if (xhr.lengthComputable && this.onProgress) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          this.onProgress(percent, xhr.loaded, xhr.total);
        }
      },
      (error) => {
        console.error('DragonLoader error:', error);
        if (this.onError) {
          this.onError(error);
        }
      }
    );
  }
}
