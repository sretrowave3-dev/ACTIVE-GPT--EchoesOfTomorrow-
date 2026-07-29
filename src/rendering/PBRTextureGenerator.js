<<<<<<< HEAD
// PBRTextureGenerator.js
import * as THREE from 'three';

/**
 * Generates high‑frequency canvas‑based PBR texture maps.
 * Every material type yields an albedo, roughness, metalness, and normal map.
 */
export class PBRTextureGenerator {
  constructor(resolution = 1024) {
    this.res = resolution;
  }

  /**
   * Core noise generator – creates a grainy canvas for surface variation.
   */
  _noiseCanvas(intensity = 1, colorBase = [128, 128, 128]) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(this.res, this.res);

    for (let i = 0; i < imgData.data.length; i += 4) {
      const r = Math.random() * 255 * intensity;
      const g = Math.random() * 255 * intensity;
      const b = Math.random() * 255 * intensity;
      imgData.data[i]     = colorBase[0] - 128 + r;
      imgData.data[i + 1] = colorBase[1] - 128 + g;
      imgData.data[i + 2] = colorBase[2] - 128 + b;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  /**
   * Creates a concrete albedo map – gritty, dusty gray with dark stains.
   */
  createConcreteAlbedo() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');

    // Base dirty gray
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(0, 0, this.res, this.res);

    // Noise overlay for grain
    const noise = this._noiseCanvas(0.5, [128, 128, 128]);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(noise, 0, 0);

    // Dark stains (paint splatters)
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#3b3b3b';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.res;
      const y = Math.random() * this.res;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * this.res * 0.05 + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cracks
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 30; i++) {
      ctx.moveTo(Math.random() * this.res, Math.random() * this.res);
      ctx.lineTo(
        Math.random() * this.res,
        Math.random() * this.res
      );
    }
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Creates a roughness map for concrete – matte with occasional wet patches.
   */
  createConcreteRoughness() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');

    // Overall matte (high roughness)
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, this.res, this.res);

    // Darker (smoother) wet spots
    ctx.fillStyle = '#505050';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * this.res;
      const y = Math.random() * this.res;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * this.res * 0.02 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Concrete has almost no metal – black map.
   */
  createConcreteMetalness() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.res, this.res);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Normal map from a synthetic height map – simulates panel gaps, chips.
   * We reuse an internal height map + Sobel filter.
   */
  createConcreteNormal() {
    return this._createNormalFromHeight(this._concreteHeightMap());
  }

  _concreteHeightMap() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');
    // Mid gray base
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, this.res, this.res);
    // Panel gaps (dark lines = lower)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * this.res;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 40, this.res);
      ctx.stroke();
    }
    // Chips (brighter spots)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      ctx.fillRect(
        Math.random() * this.res,
        Math.random() * this.res,
        2, 2
      );
    }
    return canvas;
  }

  /**
   * Corridor metal – painted steel with worn edges revealing raw metal.
   */
  createCorridorMetalAlbedo() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');

    // Painted olive‑drab base
    ctx.fillStyle = '#5a5e4b';
    ctx.fillRect(0, 0, this.res, this.res);

    // Worn metal patches (brighter, metallic grey)
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#a0a0a0';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * this.res;
      const y = Math.random() * this.res;
      ctx.fillRect(x, y, Math.random() * 8 + 2, Math.random() * 8 + 2);
    }

    // Rivets
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3a3a3a';
    for (let y = 100; y < this.res; y += 200) {
      for (let x = 100; x < this.res; x += 200) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return new THREE.CanvasTexture(canvas);
  }

  createCorridorMetalRoughness() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');

    // Mostly polished (low roughness) but with grime
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, this.res, this.res);

    // Dirt streaks (higher roughness)
    ctx.fillStyle = '#b0b0b0';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * this.res;
      ctx.fillRect(x, 0, 2 + Math.random() * 4, this.res);
    }

    return new THREE.CanvasTexture(canvas);
  }

  createCorridorMetalMetalness() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');
    // Painted areas are non‑metal (black), raw metal is white
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.res, this.res);
    ctx.fillStyle = '#ffffff';
    // Exposed metal where albedo has patches
    for (let i = 0; i < 200; i++) {
      ctx.fillRect(
        Math.random() * this.res,
        Math.random() * this.res,
        Math.random() * 8 + 2,
        Math.random() * 8 + 2
      );
    }
    return new THREE.CanvasTexture(canvas);
  }

  createCorridorMetalNormal() {
    return this._createNormalFromHeight(this._corridorHeightMap());
  }

  _corridorHeightMap() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, this.res, this.res);
    // Weld seams
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    for (let y = 200; y < this.res; y += 300) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.res, y + (Math.random() - 0.5) * 10);
      ctx.stroke();
    }
    return canvas;
  }

  /**
   * Convert a height canvas to a tangent‑space normal map.
   */
  _createNormalFromHeight(heightCanvas) {
    const res = this.res;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = res;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(heightCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, res, res);
    const height = new Float32Array(res * res);

    for (let i = 0; i < res * res; i++) {
      height[i] = imgData.data[i * 4] / 255;   // use red channel
    }

    const normalCtx = canvas.getContext('2d');
    const normalImg = normalCtx.createImageData(res, res);

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const idx = y * res + x;
        const left   = height[y * res + Math.max(x - 1, 0)];
        const right  = height[y * res + Math.min(x + 1, res - 1)];
        const up     = height[Math.max(y - 1, 0) * res + x];
        const down   = height[Math.min(y + 1, res - 1) * res + x];

        const dx = (right - left) * 2;
        const dy = (down - up) * 2;

        const nx = -dx;
        const ny = -dy;
        const nz = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        const r = ((nx / len) * 0.5 + 0.5) * 255;
        const g = ((ny / len) * 0.5 + 0.5) * 255;
        const b = ((nz / len) * 0.5 + 0.5) * 255;

        const pi = idx * 4;
        normalImg.data[pi]     = r;
        normalImg.data[pi + 1] = g;
        normalImg.data[pi + 2] = b;
        normalImg.data[pi + 3] = 255;
      }
    }

    normalCtx.putImageData(normalImg, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Master method: returns a complete PBR texture set for a named material type.
   */
  getTextureSet(type) {
    switch (type) {
      case 'concrete':
        return {
          map: this.createConcreteAlbedo(),
          roughnessMap: this.createConcreteRoughness(),
          metalnessMap: this.createConcreteMetalness(),
          normalMap: this.createConcreteNormal()
        };
      case 'corridorMetal':
        return {
          map: this.createCorridorMetalAlbedo(),
          roughnessMap: this.createCorridorMetalRoughness(),
          metalnessMap: this.createCorridorMetalMetalness(),
          normalMap: this.createCorridorMetalNormal()
        };
      // Additional types can be added in the same manner
      default:
        throw new Error(`Unknown material type: ${type}`);
    }
  }
=======
// PBRTextureGenerator.js
import * as THREE from 'three';

/**
 * Generates high‑frequency canvas‑based PBR texture maps.
 * Every material type yields an albedo, roughness, metalness, and normal map.
 */
export class PBRTextureGenerator {
  constructor(resolution = 1024) {
    this.res = resolution;
  }

  /**
   * Core noise generator – creates a grainy canvas for surface variation.
   */
  _noiseCanvas(intensity = 1, colorBase = [128, 128, 128]) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(this.res, this.res);

    for (let i = 0; i < imgData.data.length; i += 4) {
      const r = Math.random() * 255 * intensity;
      const g = Math.random() * 255 * intensity;
      const b = Math.random() * 255 * intensity;
      imgData.data[i]     = colorBase[0] - 128 + r;
      imgData.data[i + 1] = colorBase[1] - 128 + g;
      imgData.data[i + 2] = colorBase[2] - 128 + b;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  /**
   * Creates a concrete albedo map – gritty, dusty gray with dark stains.
   */
  createConcreteAlbedo() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');

    // Base dirty gray
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(0, 0, this.res, this.res);

    // Noise overlay for grain
    const noise = this._noiseCanvas(0.5, [128, 128, 128]);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(noise, 0, 0);

    // Dark stains (paint splatters)
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#3b3b3b';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.res;
      const y = Math.random() * this.res;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * this.res * 0.05 + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cracks
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 30; i++) {
      ctx.moveTo(Math.random() * this.res, Math.random() * this.res);
      ctx.lineTo(
        Math.random() * this.res,
        Math.random() * this.res
      );
    }
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Creates a roughness map for concrete – matte with occasional wet patches.
   */
  createConcreteRoughness() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');

    // Overall matte (high roughness)
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, this.res, this.res);

    // Darker (smoother) wet spots
    ctx.fillStyle = '#505050';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * this.res;
      const y = Math.random() * this.res;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * this.res * 0.02 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Concrete has almost no metal – black map.
   */
  createConcreteMetalness() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.res, this.res);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Normal map from a synthetic height map – simulates panel gaps, chips.
   * We reuse an internal height map + Sobel filter.
   */
  createConcreteNormal() {
    return this._createNormalFromHeight(this._concreteHeightMap());
  }

  _concreteHeightMap() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');
    // Mid gray base
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, this.res, this.res);
    // Panel gaps (dark lines = lower)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * this.res;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 40, this.res);
      ctx.stroke();
    }
    // Chips (brighter spots)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      ctx.fillRect(
        Math.random() * this.res,
        Math.random() * this.res,
        2, 2
      );
    }
    return canvas;
  }

  /**
   * Corridor metal – painted steel with worn edges revealing raw metal.
   */
  createCorridorMetalAlbedo() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');

    // Painted olive‑drab base
    ctx.fillStyle = '#5a5e4b';
    ctx.fillRect(0, 0, this.res, this.res);

    // Worn metal patches (brighter, metallic grey)
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#a0a0a0';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * this.res;
      const y = Math.random() * this.res;
      ctx.fillRect(x, y, Math.random() * 8 + 2, Math.random() * 8 + 2);
    }

    // Rivets
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3a3a3a';
    for (let y = 100; y < this.res; y += 200) {
      for (let x = 100; x < this.res; x += 200) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return new THREE.CanvasTexture(canvas);
  }

  createCorridorMetalRoughness() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');

    // Mostly polished (low roughness) but with grime
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, this.res, this.res);

    // Dirt streaks (higher roughness)
    ctx.fillStyle = '#b0b0b0';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * this.res;
      ctx.fillRect(x, 0, 2 + Math.random() * 4, this.res);
    }

    return new THREE.CanvasTexture(canvas);
  }

  createCorridorMetalMetalness() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');
    // Painted areas are non‑metal (black), raw metal is white
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.res, this.res);
    ctx.fillStyle = '#ffffff';
    // Exposed metal where albedo has patches
    for (let i = 0; i < 200; i++) {
      ctx.fillRect(
        Math.random() * this.res,
        Math.random() * this.res,
        Math.random() * 8 + 2,
        Math.random() * 8 + 2
      );
    }
    return new THREE.CanvasTexture(canvas);
  }

  createCorridorMetalNormal() {
    return this._createNormalFromHeight(this._corridorHeightMap());
  }

  _corridorHeightMap() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.res;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, this.res, this.res);
    // Weld seams
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    for (let y = 200; y < this.res; y += 300) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.res, y + (Math.random() - 0.5) * 10);
      ctx.stroke();
    }
    return canvas;
  }

  /**
   * Convert a height canvas to a tangent‑space normal map.
   */
  _createNormalFromHeight(heightCanvas) {
    const res = this.res;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = res;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(heightCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, res, res);
    const height = new Float32Array(res * res);

    for (let i = 0; i < res * res; i++) {
      height[i] = imgData.data[i * 4] / 255;   // use red channel
    }

    const normalCtx = canvas.getContext('2d');
    const normalImg = normalCtx.createImageData(res, res);

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const idx = y * res + x;
        const left   = height[y * res + Math.max(x - 1, 0)];
        const right  = height[y * res + Math.min(x + 1, res - 1)];
        const up     = height[Math.max(y - 1, 0) * res + x];
        const down   = height[Math.min(y + 1, res - 1) * res + x];

        const dx = (right - left) * 2;
        const dy = (down - up) * 2;

        const nx = -dx;
        const ny = -dy;
        const nz = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        const r = ((nx / len) * 0.5 + 0.5) * 255;
        const g = ((ny / len) * 0.5 + 0.5) * 255;
        const b = ((nz / len) * 0.5 + 0.5) * 255;

        const pi = idx * 4;
        normalImg.data[pi]     = r;
        normalImg.data[pi + 1] = g;
        normalImg.data[pi + 2] = b;
        normalImg.data[pi + 3] = 255;
      }
    }

    normalCtx.putImageData(normalImg, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Master method: returns a complete PBR texture set for a named material type.
   */
  getTextureSet(type) {
    switch (type) {
      case 'concrete':
        return {
          map: this.createConcreteAlbedo(),
          roughnessMap: this.createConcreteRoughness(),
          metalnessMap: this.createConcreteMetalness(),
          normalMap: this.createConcreteNormal()
        };
      case 'corridorMetal':
        return {
          map: this.createCorridorMetalAlbedo(),
          roughnessMap: this.createCorridorMetalRoughness(),
          metalnessMap: this.createCorridorMetalMetalness(),
          normalMap: this.createCorridorMetalNormal()
        };
      // Additional types can be added in the same manner
      default:
        throw new Error(`Unknown material type: ${type}`);
    }
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}