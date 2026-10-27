// src/animation/vat/VATPlayer.js

/**
 * VATPlayer controls playback of Vertex Animation Texture (VAT) cycles on the GPU.
 * Conforms to EDD Chapter 12 §4 (VAT Pipeline).
 */
export class VATPlayer {
  /**
   * @param {number} totalFrames
   * @param {number} [fps=30]
   */
  constructor(totalFrames = 60, fps = 30) {
    this.totalFrames = Math.max(1, totalFrames);
    this.fps = fps;
    this.currentFrame = 0.0;
    this.speed = 1.0;
    this.loop = true;
    this.isPlaying = true;
  }

  /**
   * Advance playback time and compute normalized VAT frame coordinate.
   * @param {number} delta Seconds elapsed
   * @returns {number} Normalized frame coordinate [0.0, 1.0] for vertex shader
   */
  update(delta) {
    if (!this.isPlaying) return this.getNormalizedFrame();

    this.currentFrame += delta * this.fps * this.speed;

    if (this.loop) {
      this.currentFrame = this.currentFrame % this.totalFrames;
      if (this.currentFrame < 0) this.currentFrame += this.totalFrames;
    } else {
      if (this.currentFrame >= this.totalFrames - 1) {
        this.currentFrame = this.totalFrames - 1;
        this.isPlaying = false;
      }
    }

    return this.getNormalizedFrame();
  }

  /**
   * @returns {number} Normalized frame coordinate for GPU vertex texture sampling
   */
  getNormalizedFrame() {
    return this.currentFrame / this.totalFrames;
  }
}
