// src/framework/services/PlayerService.js
import { Service } from './Service.js';
import { PlayerController } from '../../player/PlayerController.js';

/**
 * PlayerService coordinates player input, camera controller, and the ECS player entity.
 * Runs in the 'gameplay' phase of the FrameScheduler.
 */
export class PlayerService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('player', framework);
    /** @type {PlayerController|null} */
    this.controller = null;
    /** @type {number|null} @private */
    this._playerEntityId = null;
  }

  /** @override */
  async initialize() {
    const renderService = this.framework.serviceRegistry.get('render');
    const inputService = this.framework.serviceRegistry.get('input');
    const ecsService = this.framework.serviceRegistry.get('ecs');
    const physicsService = this.framework.serviceRegistry.get('physics');

    // Attach PlayerController to RenderService's camera, scene, and collision world
    if (renderService && renderService.camera && renderService.scene) {
      const domTarget = renderService.renderer?.domElement || (typeof document !== 'undefined' ? document.body : null);
      this.controller = new PlayerController(
        renderService.camera,
        domTarget,
        renderService.scene,
        inputService,
        physicsService?.collisionWorld || null
      );
      this.controller.yawObject.position.set(0, 0, 5);
    }

    // Register Player entity in ECS
    if (ecsService && ecsService.ecsManager) {
      this._playerEntityId = 1000;
      ecsService.ecsManager.addComponent(this._playerEntityId, 'Transform');
      ecsService.ecsManager.addComponent(this._playerEntityId, 'Velocity');
      if (ecsService.ecsManager.getTypeId('Collider')) {
        ecsService.ecsManager.addComponent(this._playerEntityId, 'Collider');
        const col = ecsService.ecsManager.getComponent(this._playerEntityId, 'Collider');
        if (col) {
          col.size = { x: 0.6, y: 1.8, z: 0.6 };
        }
      }
      const transform = ecsService.ecsManager.getComponent(this._playerEntityId, 'Transform');
      if (transform) {
        transform.position.x = 0;
        transform.position.y = 1.7;
        transform.position.z = 5;
      }
    }
  }

  /** @override */
  async start() {
    console.log('[PlayerService] Started with active physical PlayerController.');
  }

  /**
   * Per-frame update executed during the 'gameplay' phase.
   * @param {number} delta
   */
  update(delta) {
    if (this.controller) {
      this.controller.update(delta);

      // Synchronize controller position & velocity to the ECS Player entity
      const ecsService = this.framework.serviceRegistry.get('ecs');
      if (ecsService && ecsService.ecsManager && this._playerEntityId !== null) {
        const transform = ecsService.ecsManager.getComponent(this._playerEntityId, 'Transform');
        if (transform) {
          transform.position.x = this.controller.position.x;
          transform.position.y = this.controller.position.y;
          transform.position.z = this.controller.position.z;
        }
        const velocity = ecsService.ecsManager.getComponent(this._playerEntityId, 'Velocity');
        if (velocity) {
          velocity.x = this.controller.velocity.x;
          velocity.y = this.controller.velocity.y;
          velocity.z = this.controller.velocity.z;
        }
      }
    }
  }

  /**
   * Get the player's world position.
   * @returns {{ x: number, y: number, z: number }|null}
   */
  getPlayerPosition() {
    return this.controller ? this.controller.position : null;
  }

  /** @override */
  async shutdown() {
    if (this.controller) {
      this.controller.dispose();
      this.controller = null;
    }
    this._playerEntityId = null;
  }
}
