// src/rendering/postprocessing/PostProcessStack.js
import * as THREE from 'three';

/**
 * PostProcessStack manages screen-space cinematic effects, tone mapping,
 * bloom parameters, chromatic aberration, vignette, and color grading.
 * Conforms to EDD Volume IV (Rendering Architecture & Post-Processing).
 */
export class PostProcessStack {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   */
  constructor(renderer = null, scene = null, camera = null) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Post-processing configuration
    this.settings = {
      toneMapping: {
        type: 'ACESFilmic',
        exposure: 1.2
      },
      bloom: {
        enabled: true,
        threshold: 0.85,
        strength: 0.6,
        radius: 0.4
      },
      vignette: {
        enabled: true,
        offset: 1.1,
        darkness: 0.75
      },
      chromaticAberration: {
        enabled: true,
        intensity: 0.003
      },
      colorGrading: {
        saturation: 1.1,
        contrast: 1.05,
        tint: new THREE.Color(0.95, 1.0, 1.05) // Subtle cyan/teal bias
      }
    };

    if (this.renderer) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = this.settings.toneMapping.exposure;
    }
  }

  /**
   * Adapts post-processing workload according to active HAOS tier.
   * @param {'LOW'|'MEDIUM'|'HIGH'|'ULTRA'} tier
   */
  applyHAOSTier(tier) {
    const t = (tier || 'MEDIUM').toUpperCase();
    switch (t) {
      case 'LOW':
        this.settings.bloom.enabled = false;
        this.settings.chromaticAberration.enabled = false;
        this.settings.vignette.enabled = false;
        if (this.renderer) this.renderer.toneMappingExposure = 1.0;
        break;

      case 'MEDIUM':
        this.settings.bloom.enabled = true;
        this.settings.bloom.strength = 0.4;
        this.settings.chromaticAberration.enabled = false;
        this.settings.vignette.enabled = true;
        if (this.renderer) this.renderer.toneMappingExposure = 1.15;
        break;

      case 'HIGH':
        this.settings.bloom.enabled = true;
        this.settings.bloom.strength = 0.6;
        this.settings.chromaticAberration.enabled = true;
        this.settings.chromaticAberration.intensity = 0.002;
        this.settings.vignette.enabled = true;
        if (this.renderer) this.renderer.toneMappingExposure = 1.2;
        break;

      case 'ULTRA':
        this.settings.bloom.enabled = true;
        this.settings.bloom.strength = 0.85;
        this.settings.chromaticAberration.enabled = true;
        this.settings.chromaticAberration.intensity = 0.004;
        this.settings.vignette.enabled = true;
        if (this.renderer) this.renderer.toneMappingExposure = 1.25;
        break;
    }
  }

  /**
   * Sets dynamic exposure.
   * @param {number} exposure
   */
  setExposure(exposure) {
    this.settings.toneMapping.exposure = exposure;
    if (this.renderer) {
      this.renderer.toneMappingExposure = exposure;
    }
  }

  /**
   * Configures color grading adjustments.
   * @param {number} saturation
   * @param {number} contrast
   * @param {number|string|THREE.Color} tint
   */
  setColorGrading(saturation, contrast, tint) {
    this.settings.colorGrading.saturation = saturation;
    this.settings.colorGrading.contrast = contrast;
    if (tint) {
      this.settings.colorGrading.tint = new THREE.Color(tint);
    }
  }

  /**
   * Toggles bloom effect.
   * @param {boolean} enabled
   * @param {number} [strength]
   */
  setBloom(enabled, strength = 0.6) {
    this.settings.bloom.enabled = Boolean(enabled);
    this.settings.bloom.strength = strength;
  }

  /**
   * Toggles vignette darkening.
   * @param {boolean} enabled
   * @param {number} [darkness]
   */
  setVignette(enabled, darkness = 0.75) {
    this.settings.vignette.enabled = Boolean(enabled);
    this.settings.vignette.darkness = darkness;
  }

  /**
   * Renders a post-processed frame.
   * @param {number} delta
   */
  render(delta) {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
