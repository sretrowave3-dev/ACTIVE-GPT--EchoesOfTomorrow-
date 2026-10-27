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

    // ── Vitals & Resource attributes ──────────────────────
    this.health = 100;
    this.maxHealth = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.staminaDrainRate = 25;   // stamina units drained per second sprinting
    this.staminaRegenRate = 18;   // stamina units restored per second
    this._prevStamina = 100;
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

      // Manage stamina consumption when sprinting and moving
      const isMoving = Math.hypot(this.controller.velocity.x, this.controller.velocity.z) > 0.5;
      if (this.controller.isSprinting && isMoving) {
        this.stamina = Math.max(0, this.stamina - this.staminaDrainRate * delta);
        if (this.stamina <= 0) {
          this.controller.canSprint = false;
        }
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * delta);
        if (this.stamina >= 15) {
          this.controller.canSprint = true;
        }
      }

      if (Math.abs(this.stamina - this._prevStamina) > 0.5) {
        this._prevStamina = this.stamina;
        if (this.framework.eventBus) {
          this.framework.eventBus.publish('player:stamina_changed', this, {
            stamina: this.stamina,
            maxStamina: this.maxStamina
          });
        }
      }

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
   * Apply damage to the player.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    if (this.framework.eventBus) {
      this.framework.eventBus.publish('player:health_changed', this, {
        health: this.health,
        maxHealth: this.maxHealth,
        delta: -amount
      });
    }
    const audioService = this.framework.serviceRegistry.get('audio');
    if (audioService) {
      audioService.playSound('impact', 0.8);
    }
  }

  /**
   * Restore health to the player.
   * @param {number} amount
   */
  heal(amount) {
    if (amount <= 0) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
    if (this.framework.eventBus) {
      this.framework.eventBus.publish('player:health_changed', this, {
        health: this.health,
        maxHealth: this.maxHealth,
        delta: amount
      });
    }
  }

  /**
   * Retrieve current player health & stamina vitals.
   * @returns {{ health: number, maxHealth: number, stamina: number, maxStamina: number }}
   */
  getVitals() {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina
    };
  }

  /**
   * Directly assign player vitals (used by save/load system).
   * @param {number} health
   * @param {number} stamina
   */
  setVitals(health, stamina) {
    this.health = Math.max(0, Math.min(this.maxHealth, health));
    this.stamina = Math.max(0, Math.min(this.maxStamina, stamina));
    this._prevStamina = this.stamina;
    if (this.framework.eventBus) {
      this.framework.eventBus.publish('player:health_changed', this, {
        health: this.health,
        maxHealth: this.maxHealth,
        delta: 0
      });
      this.framework.eventBus.publish('player:stamina_changed', this, {
        stamina: this.stamina,
        maxStamina: this.maxStamina
      });
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
