// src/systems/InteractionSystem.js
import { System } from '../ecs/System.js';
import { EntitySignature } from '../ecs/EntitySignature.js';

/**
 * InteractionSystem tests player proximity to interactable entities,
 * emits UI interaction prompts, and executes gameplay triggers on key activation.
 * Conforms to EDD Chapter 19 (Gameplay Framework).
 */
export class InteractionSystem extends System {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   * @param {import('../gameplay/MissionManager.js').MissionManager} missionManager
   */
  constructor(framework, missionManager = null) {
    super();
    this.framework = framework;
    this.missionManager = missionManager;
    this.priority = 250; // Runs in 'gameplay' phase
    this._requiredSig = new EntitySignature();

    this._interactableId = -1;
    this._transformId = -1;
    this._wasInteractPressed = false;
  }

  /**
   * @param {import('../ecs/ECSManager.js').ECSManager} ecs
   */
  initialize(ecs) {
    this._interactableId = ecs.getTypeId('Interactable');
    this._transformId = ecs.getTypeId('Transform');

    if (this._interactableId !== undefined) this._requiredSig.add(this._interactableId);
    if (this._transformId !== undefined) this._requiredSig.add(this._transformId);
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
    const interactStore = ecs.getStore('Interactable');
    const transformStore = ecs.getStore('Transform');

    const playerService = this.framework.serviceRegistry.get('player');
    const playerPos = playerService ? playerService.getPlayerPosition() : null;
    const inputService = this.framework.serviceRegistry.get('input');
    const isInteractActive = inputService ? inputService.isActionActive('interact') : false;

    // Detect edge trigger for interaction key press
    const isInteractTriggered = isInteractActive && !this._wasInteractPressed;
    this._wasInteractPressed = isInteractActive;

    let nearestInteractable = null;
    let minDistance = Infinity;

    if (playerPos) {
      for (let i = 0; i < entityIds.length; i++) {
        const eid = entityIds[i];
        const interact = interactStore.get(eid);
        const transform = transformStore.get(eid);

        if (!interact || !transform || !interact.enabled || (interact.isOneShot && interact.completed)) {
          continue;
        }

        const dx = playerPos.x - transform.position.x;
        const dz = playerPos.z - transform.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist <= interact.radius && dist < minDistance) {
          minDistance = dist;
          nearestInteractable = { eid, interact, transform };
        }
      }
    }

    if (nearestInteractable) {
      const { eid, interact, transform } = nearestInteractable;

      if (this.framework.eventBus) {
        this.framework.eventBus.publish('interaction:prompt', this, {
          prompt: interact.prompt,
          actionId: interact.actionId,
          entityId: eid
        });
      }

      if (isInteractTriggered) {
        interact.completed = true;

        if (this.missionManager) {
          this.missionManager.completeObjective(interact.actionId);
        }

        const audioService = this.framework.serviceRegistry.get('audio');
        if (audioService) {
          audioService.playSound('chime', 0.9);
        }

        if (this.framework.eventBus) {
          this.framework.eventBus.publish('interaction:triggered', this, {
            actionId: interact.actionId,
            entityId: eid
          });
        }
      }
    } else {
      if (this.framework.eventBus) {
        this.framework.eventBus.publish('interaction:clear', this, {});
      }
    }
  }
}
