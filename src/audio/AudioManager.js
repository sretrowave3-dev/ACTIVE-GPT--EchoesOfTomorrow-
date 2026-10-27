// src/audio/AudioManager.js
import { SoundSynthesizer } from './SoundSynthesizer.js';

/**
 * AudioManager controls the Web Audio API context, master volume,
 * spatial 3D audio panners, and sound bank playback.
 * Conforms to EDD Chapter 17 (Audio System & Environmental Acoustics).
 */
export class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    /** @type {GainNode|null} */
    this.masterGain = null;
    /** @type {Map<string, AudioBuffer>} */
    this.soundBank = new Map();
    /** @type {SoundSynthesizer|null} @private */
    this._synthesizer = null;
    /** @type {AudioBufferSourceNode|null} @private */
    this._ambientSource = null;
    this.isUnlocked = false;
  }

  /**
   * Initializes the AudioContext and pre-synthesizes core procedural sound banks.
   */
  async initialize() {
    if (typeof window === 'undefined') return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[AudioManager] Web Audio API not supported in this environment.');
      return;
    }

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this._synthesizer = new SoundSynthesizer(this.ctx);

    // Pre-cache core procedural sound effects
    this.soundBank.set('footstep', this._synthesizer.createFootstepBuffer());
    this.soundBank.set('impact', this._synthesizer.createImpactBuffer());
    this.soundBank.set('ambient', this._synthesizer.createAmbientDroneBuffer());
    this.soundBank.set('chime', this._synthesizer.createChimeBuffer());
    this.soundBank.set('click', this._synthesizer.createClickBuffer());
  }

  /**
   * Unlock AudioContext on user interaction.
   */
  unlock() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
        this.playAmbient();
      }).catch((e) => console.warn('[AudioManager] Resume failed:', e));
    } else {
      this.isUnlocked = true;
      this.playAmbient();
    }
  }

  /**
   * Play 2D global sound effect.
   * @param {string} soundId
   * @param {number} [volume=1.0]
   * @param {boolean} [loop=false]
   * @returns {AudioBufferSourceNode|null}
   */
  playSound(soundId, volume = 1.0, loop = false) {
    if (!this.ctx || !this.masterGain) return null;

    const buffer = this.soundBank.get(soundId);
    if (!buffer) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(Math.max(0, Math.min(2.0, volume)), this.ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start(0);
    return source;
  }

  /**
   * Play 3D positional sound effect with distance attenuation.
   * @param {string} soundId
   * @param {{ x: number, y: number, z: number }} position
   * @param {number} [volume=1.0]
   * @param {number} [refDistance=1]
   * @param {number} [maxDistance=30]
   */
  playSpatialSound(soundId, position, volume = 1.0, refDistance = 1, maxDistance = 30) {
    if (!this.ctx || !this.masterGain) return null;

    const buffer = this.soundBank.get(soundId);
    if (!buffer) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = refDistance;
    panner.maxDistance = maxDistance;
    panner.rolloffFactor = 1;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(position.x, this.ctx.currentTime);
      panner.positionY.setValueAtTime(position.y, this.ctx.currentTime);
      panner.positionZ.setValueAtTime(position.z, this.ctx.currentTime);
    } else {
      panner.setPosition(position.x, position.y, position.z);
    }

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);

    source.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start(0);
    return source;
  }

  /**
   * Update the spatial listener's position and orientation.
   * @param {{ x: number, y: number, z: number }} pos
   * @param {{ x: number, y: number, z: number }} forward
   * @param {{ x: number, y: number, z: number }} up
   */
  updateListener(pos, forward, up) {
    if (!this.ctx) return;
    const listener = this.ctx.listener;
    if (!listener) return;

    if (listener.positionX) {
      listener.positionX.setValueAtTime(pos.x, this.ctx.currentTime);
      listener.positionY.setValueAtTime(pos.y, this.ctx.currentTime);
      listener.positionZ.setValueAtTime(pos.z, this.ctx.currentTime);
      listener.forwardX.setValueAtTime(forward.x, this.ctx.currentTime);
      listener.forwardY.setValueAtTime(forward.y, this.ctx.currentTime);
      listener.forwardZ.setValueAtTime(forward.z, this.ctx.currentTime);
      listener.upX.setValueAtTime(up.x, this.ctx.currentTime);
      listener.upY.setValueAtTime(up.y, this.ctx.currentTime);
      listener.upZ.setValueAtTime(up.z, this.ctx.currentTime);
    } else {
      listener.setPosition(pos.x, pos.y, pos.z);
      listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  /**
   * Starts looping atmospheric background drone.
   */
  playAmbient() {
    if (this._ambientSource || !this.ctx) return;
    this._ambientSource = this.playSound('ambient', 0.25, true);
  }

  /**
   * Stop all playback and close AudioContext.
   */
  async shutdown() {
    if (this._ambientSource) {
      try { this._ambientSource.stop(); } catch {}
      this._ambientSource = null;
    }
    if (this.ctx) {
      await this.ctx.close();
      this.ctx = null;
    }
    this.soundBank.clear();
  }
}
