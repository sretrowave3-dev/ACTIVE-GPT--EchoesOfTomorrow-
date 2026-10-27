// src/systems/AudioSystem.js
import { System } from '../ecs/System.js';
import { EntitySignature } from '../ecs/EntitySignature.js';

/**
 * AudioSystem coordinates 3D spatial sound sources with entity positions.
 * Conforms to EDD Chapter 17 (Audio System & Environmental Acoustics).
 */
export class AudioSystem extends System {
  /**
   * @param {import('../audio/AudioManager.js').AudioManager} [audioManager]
   */
  constructor(audioManager = null) {
    super();
    this.priority = 400; // Audio runs after animation and gameplay
    this._requiredSig = new EntitySignature();
    this.audioManager = audioManager;

    this._audioId = -1;
    this._transformId = -1;

    // Footstep timer tracking
    this._footstepTimer = 0;
  }

  /**
   * @param {import('../ecs/ECSManager.js').ECSManager} ecs
   */
  initialize(ecs) {
    this._audioId = ecs.getTypeId('Audio');
    this._transformId = ecs.getTypeId('Transform');

    if (this._audioId !== undefined) {
      this._requiredSig.add(this._audioId);
    }
  }

  requiredSignature() {
    return this._requiredSig;
  }

  /**
   * @param {number} delta
   * @param {number[]} entityIds
   * @param {import('../ecs/ECSManager.js').ECSManager} ecs
   */
  update(delta, entityIds, ecs) {
    if (!this.audioManager || !this.audioManager.isUnlocked) return;

    const audioStore = ecs.getStore('Audio');
    const transformStore = this._transformId !== undefined ? ecs.getStore('Transform') : null;

    for (let i = 0; i < entityIds.length; i++) {
      const eid = entityIds[i];
      const audio = audioStore.get(eid);
      if (!audio || !audio.soundId) continue;

      const transform = transformStore?.get(eid);
      if (audio.playing) {
        if (transform) {
          this.audioManager.playSpatialSound(audio.soundId, transform.position, audio.volume);
        } else {
          this.audioManager.playSound(audio.soundId, audio.volume, audio.loop);
        }
        audio.playing = false; // Trigger once unless loop
      }
    }
  }
}
