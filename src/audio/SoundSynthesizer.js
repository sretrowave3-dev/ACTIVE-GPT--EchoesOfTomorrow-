// src/audio/SoundSynthesizer.js

/**
 * Procedural Audio Synthesizer for Echo Engine.
 * Generates realistic procedural sound buffers using Web Audio API synthesis
 * to guarantee immediate audio feedback with zero external asset dependencies.
 * Conforms to EDD Chapter 17 (Audio System & Environmental Acoustics).
 */
export class SoundSynthesizer {
  /**
   * @param {AudioContext} ctx
   */
  constructor(ctx) {
    this.ctx = ctx;
  }

  /**
   * Generates a muted footstep thud buffer.
   * @returns {AudioBuffer}
   */
  createFootstepBuffer() {
    const duration = 0.12;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 35.0);
      const noise = (Math.random() * 2 - 1) * 0.4;
      const sine = Math.sin(2 * Math.PI * 75 * t);
      data[i] = (sine * 0.7 + noise * 0.3) * decay;
    }
    return buffer;
  }

  /**
   * Generates a solid mechanical impact buffer.
   * @returns {AudioBuffer}
   */
  createImpactBuffer() {
    const duration = 0.25;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 18.0);
      const freq = 140 * Math.exp(-t * 12.0);
      const tone = Math.sin(2 * Math.PI * freq * t);
      const noise = (Math.random() * 2 - 1) * 0.3;
      data[i] = (tone * 0.75 + noise * 0.25) * decay;
    }
    return buffer;
  }

  /**
   * Generates a looping atmospheric cyberpunk drone.
   * @returns {AudioBuffer}
   */
  createAmbientDroneBuffer() {
    const duration = 4.0;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const f1 = Math.sin(2 * Math.PI * 55 * t);
      const f2 = Math.sin(2 * Math.PI * 110 * t) * 0.4;
      const f3 = Math.sin(2 * Math.PI * 165 * t + Math.sin(t * 1.5)) * 0.15;
      data[i] = (f1 + f2 + f3) * 0.35;
    }
    return buffer;
  }

  /**
   * Generates an ethereal memory fragment chime.
   * @returns {AudioBuffer}
   */
  createChimeBuffer() {
    const duration = 0.8;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 4.5);
      const harmonic = Math.sin(2 * Math.PI * 880 * t) * 0.5 +
                       Math.sin(2 * Math.PI * 1320 * t) * 0.3 +
                       Math.sin(2 * Math.PI * 1760 * t) * 0.2;
      data[i] = harmonic * decay;
    }
    return buffer;
  }

  /**
   * Generates a crisp UI click.
   * @returns {AudioBuffer}
   */
  createClickBuffer() {
    const duration = 0.04;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 90.0);
      data[i] = Math.sin(2 * Math.PI * 2200 * t) * decay * 0.4;
    }
    return buffer;
  }
}
