// src/rendering/lighting/LightingRig.js
import * as THREE from 'three';

/**
 * LightingRig coordinates dynamic multi-source PBR lighting, cascaded shadow projections,
 * atmospheric height fog, and cinematic environment presets.
 * Conforms to EDD Volume IV (Rendering & Lighting Architecture).
 */
export class LightingRig {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    /** @type {THREE.DirectionalLight} Key sun/searchlight */
    this.sunLight = null;

    /** @type {THREE.HemisphereLight} Ambient sky/ground hemisphere fill */
    this.hemiLight = null;

    /** @type {THREE.PointLight[]} Dynamic point light pool */
    this.pointLights = [];

    /** @type {string} Active atmosphere preset */
    this.currentPreset = 'cyberpunk_neon';

    this._initializeLights();
  }

  /**
   * Sets up baseline key, fill, and ambient sources.
   * @private
   */
  _initializeLights() {
    if (!this.scene) return;

    // 1. Primary Directional Sun with Cascaded Shadow Map settings
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    this.sunLight.position.set(20, 30, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 70;
    this.sunLight.shadow.camera.left = -25;
    this.sunLight.shadow.camera.right = 25;
    this.sunLight.shadow.camera.top = 25;
    this.sunLight.shadow.camera.bottom = -25;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // 2. Hemispheric Skylight (Sky: cool cyan/blue, Ground: deep industrial slate)
    this.hemiLight = new THREE.HemisphereLight(0x446688, 0x111622, 0.6);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // 3. Baseline Atmosphere / Fog
    this.scene.fog = new THREE.FogExp2(0x0a0a14, 0.015);
    this.scene.background = new THREE.Color(0x0a0a14);

    this.applyPreset('cyberpunk_neon');
  }

  /**
   * Applies an atmospheric lighting preset.
   * @param {'cyberpunk_neon'|'monsoon_dusk'|'overcast_industrial'|'tactical_night'} presetName
   */
  applyPreset(presetName) {
    if (!this.scene) return;
    this.currentPreset = presetName;

    switch (presetName) {
      case 'cyberpunk_neon':
        if (this.sunLight) {
          this.sunLight.color.setHex(0xaaccff);
          this.sunLight.intensity = 1.4;
        }
        if (this.hemiLight) {
          this.hemiLight.color.setHex(0x00ffcc);
          this.hemiLight.groundColor.setHex(0x1a0a2a);
          this.hemiLight.intensity = 0.55;
        }
        this.scene.fog = new THREE.FogExp2(0x0a0a18, 0.018);
        this.scene.background = new THREE.Color(0x0a0a18);
        break;

      case 'monsoon_dusk':
        if (this.sunLight) {
          this.sunLight.color.setHex(0xff9944);
          this.sunLight.intensity = 1.0;
        }
        if (this.hemiLight) {
          this.hemiLight.color.setHex(0x334466);
          this.hemiLight.groundColor.setHex(0x221105);
          this.hemiLight.intensity = 0.45;
        }
        this.scene.fog = new THREE.FogExp2(0x120a08, 0.025);
        this.scene.background = new THREE.Color(0x120a08);
        break;

      case 'overcast_industrial':
        if (this.sunLight) {
          this.sunLight.color.setHex(0xffeecc);
          this.sunLight.intensity = 1.6;
        }
        if (this.hemiLight) {
          this.hemiLight.color.setHex(0x8899aa);
          this.hemiLight.groundColor.setHex(0x222222);
          this.hemiLight.intensity = 0.65;
        }
        this.scene.fog = new THREE.FogExp2(0x1a1a24, 0.012);
        this.scene.background = new THREE.Color(0x1a1a24);
        break;

      case 'tactical_night':
        if (this.sunLight) {
          this.sunLight.color.setHex(0x335588);
          this.sunLight.intensity = 0.6;
        }
        if (this.hemiLight) {
          this.hemiLight.color.setHex(0x112233);
          this.hemiLight.groundColor.setHex(0x050508);
          this.hemiLight.intensity = 0.25;
        }
        this.scene.fog = new THREE.FogExp2(0x040508, 0.022);
        this.scene.background = new THREE.Color(0x040508);
        break;
    }
  }

  /**
   * Adds a dynamic point light to the scene.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} [color=0x00ffcc]
   * @param {number} [intensity=2.0]
   * @param {number} [distance=12.0]
   * @returns {THREE.PointLight}
   */
  addPointLight(x, y, z, color = 0x00ffcc, intensity = 2.0, distance = 12.0) {
    const pl = new THREE.PointLight(color, intensity, distance, 2.0);
    pl.position.set(x, y, z);
    this.scene.add(pl);
    this.pointLights.push(pl);
    return pl;
  }

  /**
   * Removes a dynamic point light.
   * @param {THREE.PointLight} light
   */
  removePointLight(light) {
    const idx = this.pointLights.indexOf(light);
    if (idx !== -1) {
      this.pointLights.splice(idx, 1);
      this.scene.remove(light);
    }
  }

  /**
   * Cleans up all lights.
   */
  dispose() {
    if (this.sunLight) this.scene.remove(this.sunLight);
    if (this.hemiLight) this.scene.remove(this.hemiLight);
    for (const pl of this.pointLights) {
      this.scene.remove(pl);
    }
    this.pointLights = [];
  }
}
