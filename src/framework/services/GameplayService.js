// src/framework/services/GameplayService.js
import { Service } from './Service.js';
import { MissionManager } from '../../gameplay/MissionManager.js';
import { InteractionSystem } from '../../systems/InteractionSystem.js';
import { InteractableComponent } from '../../components/InteractableComponent.js';

/**
 * GameplayService bridges core engine subsystems with narrative gameplay,
 * objectives, and interactive triggers for Echoes of Tomorrow.
 * Conforms to EDD Chapter 19 (Scripting System & Gameplay Framework).
 */
export class GameplayService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('gameplay', framework);
    this.missionManager = new MissionManager(framework.eventBus);
    this.interactionSystem = new InteractionSystem(framework, this.missionManager);
  }

  /** @override */
  async initialize() {
    const ecsService = this.framework.serviceRegistry.get('ecs');
    if (ecsService && ecsService.ecsManager) {
      if (!ecsService.ecsManager.getTypeId('Interactable')) {
        ecsService.ecsManager.registerComponent('Interactable', InteractableComponent);
      }
      if (ecsService.scheduler) {
        ecsService.scheduler.registerSystem(this.interactionSystem);
      }
    }
  }

  /** @override */
  async start() {
    console.log('[GameplayService] Started with active mission objectives and interaction triggers.');

    // Spawn the glowing Memory Fragment terminal (ID 301) in the grey-box arena
    const ecsService = this.framework.serviceRegistry.get('ecs');
    if (ecsService && ecsService.ecsManager) {
      const fragmentId = 301;
      const ecs = ecsService.ecsManager;

      ecs.addComponent(fragmentId, 'Transform');
      ecs.addComponent(fragmentId, 'Mesh');
      ecs.addComponent(fragmentId, 'Collider');
      ecs.addComponent(fragmentId, 'Interactable');

      const transform = ecs.getComponent(fragmentId, 'Transform');
      if (transform) {
        transform.position.x = 0;
        transform.position.y = 1.0;
        transform.position.z = -15;
      }

      const mesh = ecs.getComponent(fragmentId, 'Mesh');
      if (mesh) {
        mesh.meshId = 'memory_fragment_terminal';
        mesh.size = { x: 1.0, y: 2.0, z: 1.0 };
      }

      const col = ecs.getComponent(fragmentId, 'Collider');
      if (col) {
        col.size = { x: 1.0, y: 2.0, z: 1.0 };
      }

      const interact = ecs.getComponent(fragmentId, 'Interactable');
      if (interact) {
        interact.prompt = 'Press [E] to Retrieve Memory Fragment #01';
        interact.actionId = 'memory_fragment_01';
        interact.radius = 3.0;
      }
    }
  }

  /**
   * Get the primary active mission objective.
   * @returns {Object|null}
   */
  getCurrentObjective() {
    return this.missionManager.getCurrentObjective();
  }

  /** @override */
  update(delta) {
    // Ticked by SystemScheduler in 'gameplay' phase
  }

  /** @override */
  async shutdown() {
    this.missionManager.reset();
  }
}
