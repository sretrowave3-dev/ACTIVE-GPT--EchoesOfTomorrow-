// src/framework/services/AudioService.js
import { Service } from './Service.js';
import { AudioManager } from '../../audio/AudioManager.js';
import { AudioSystem } from '../../systems/AudioSystem.js';

/**
 * AudioService coordinates environmental soundscapes, 3D spatial acoustics,
 * and procedural sound synthesis.
 * Conforms to EDD Chapter 17 (Audio System & Environmental Acoustics).
 */
export class AudioService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('audio', framework);
    this.audioManager = new AudioManager();
    this.audioSystem = new AudioSystem(this.audioManager);
    this._footstepAccumulator = 0;
  }

  /** @override */
  async initialize() {
    await this.audioManager.initialize();

    // Register AudioSystem in ECS
    const ecsService = this.framework.serviceRegistry.get('ecs');
    if (ecsService && ecsService.scheduler) {
      ecsService.scheduler.registerSystem(this.audioSystem);
    }

    // Subscribe to gameplay events via EventBus
    if (this.framework.eventBus) {
      this.framework.eventBus.subscribe('audio:play', (event) => {
        const payload = event.payload;
        if (payload?.soundId) {
          if (payload.position) {
            this.audioManager.playSpatialSound(payload.soundId, payload.position, payload.volume ?? 1);
          } else {
            this.audioManager.playSound(payload.soundId, payload.volume ?? 1, payload.loop ?? false);
          }
        }
      });
    }

    // Enable unlock on first user click
    if (typeof document !== 'undefined') {
      const unlockAudio = () => {
        this.audioManager.unlock();
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      };
      document.addEventListener('click', unlockAudio);
      document.addEventListener('keydown', unlockAudio);
    }
  }

  /** @override */
  async start() {
    console.log('[AudioService] Started with Web Audio context and procedural audio synthesizer.');
  }

  /**
   * Updates 3D spatial listener orientation and generates dynamic player footsteps.
   * @param {number} delta
   */
  update(delta) {
    if (!this.audioManager || !this.audioManager.isUnlocked) return;

    const playerService = this.framework.serviceRegistry.get('player');
    if (playerService && playerService.controller) {
      const controller = playerService.controller;
      const pos = controller.position;
      const camera = controller.camera;

      if (pos && camera) {
        // Forward and up vectors from camera
        const forward = { x: 0, y: 0, -1 };
        const up = { x: 0, y: 1, 0 };
        this.audioManager.updateListener(pos, forward, up);

        // Footstep generation based on movement velocity
        const speed = Math.hypot(controller.velocity.x, controller.velocity.z);
        if (speed > 1.5) {
          this._footstepAccumulator += delta * (speed / 4.0);
          if (this._footstepAccumulator >= 1.0) {
            this._footstepAccumulator = 0.0;
            this.audioManager.playSound('footstep', 0.4);
          }
        } else {
          this._footstepAccumulator = 0.2; // Ready for immediate step when starting walk
        }
      }
    }
  }

  /**
   * Play a global 2D sound effect.
   * @param {string} soundId
   * @param {number} [volume=1.0]
   */
  playSound(soundId, volume = 1.0) {
    return this.audioManager.playSound(soundId, volume);
  }

  /**
   * Play a 3D spatial sound effect at a world position.
   * @param {string} soundId
   * @param {{ x: number, y: number, z: number }} position
   * @param {number} [volume=1.0]
   */
  playSpatialSound(soundId, position, volume = 1.0) {
    return this.audioManager.playSpatialSound(soundId, position, volume);
  }

  /** @override */
  async shutdown() {
    await this.audioManager.shutdown();
  }
}
