// src/framework/services/AIService.js
import { Service } from './Service.js';
import { AISystem } from '../../systems/AISystem.js';
import { Blackboard } from '../../ai/Blackboard.js';
import { AIComponent } from '../../components/AIComponent.js';
import { NavigationComponent } from '../../components/NavigationComponent.js';

/**
 * AIService coordinates perception queries, behavior trees,
 * and autonomous entity navigation.
 * Conforms to EDD Chapter 16 (Artificial Intelligence & Navigation).
 */
export class AIService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('ai', framework);
    this.blackboard = new Blackboard();
    this.aiSystem = new AISystem(framework);
  }

  /** @override */
  async initialize() {
    const ecsService = this.framework.serviceRegistry.get('ecs');
    if (ecsService && ecsService.ecsManager) {
      if (!ecsService.ecsManager.getTypeId('AI')) {
        ecsService.ecsManager.registerComponent('AI', AIComponent);
      }
      if (!ecsService.ecsManager.getTypeId('Navigation')) {
        ecsService.ecsManager.registerComponent('Navigation', NavigationComponent);
      }
      if (ecsService.scheduler) {
        ecsService.scheduler.registerSystem(this.aiSystem);
      }
    }
  }

  /** @override */
  async start() {
    console.log('[AIService] Started with autonomous patrol agents and blackboard.');

    // Spawn an autonomous reconnaissance patrol agent in the arena
    const ecsService = this.framework.serviceRegistry.get('ecs');
    if (ecsService && ecsService.ecsManager) {
      const droneId = 201;
      const ecs = ecsService.ecsManager;

      ecs.addComponent(droneId, 'Transform');
      ecs.addComponent(droneId, 'Mesh');
      ecs.addComponent(droneId, 'Collider');
      ecs.addComponent(droneId, 'AI');
      ecs.addComponent(droneId, 'Navigation');
      ecs.addComponent(droneId, 'Animation');

      const transform = ecs.getComponent(droneId, 'Transform');
      if (transform) {
        transform.position.x = 6;
        transform.position.y = 1.2;
        transform.position.z = -10;
      }

      const mesh = ecs.getComponent(droneId, 'Mesh');
      if (mesh) {
        mesh.meshId = 'recon_drone';
        mesh.size = { x: 1.0, y: 1.0, z: 1.0 };
      }

      const col = ecs.getComponent(droneId, 'Collider');
      if (col) {
        col.size = { x: 1.0, y: 1.0, z: 1.0 };
      }

      const ai = ecs.getComponent(droneId, 'AI');
      if (ai) {
        ai.sightRadius = 11.0;
        ai.speed = 2.6;
      }

      const nav = ecs.getComponent(droneId, 'Navigation');
      if (nav) {
        nav.waypoints = [
          { x: 6, y: 1.2, z: -10 },
          { x: 12, y: 1.2, z: -2 },
          { x: 6, y: 1.2, z: 8 },
          { x: -6, y: 1.2, z: 8 },
          { x: -12, y: 1.2, z: -2 },
          { x: -6, y: 1.2, z: -10 }
        ];
      }

      const anim = ecs.getComponent(droneId, 'Animation');
      if (anim) {
        anim.currentClip = 'hover';
      }
    }
  }

  /** @override */
  update(delta) {
    // Ticked by SystemScheduler in 'ai' phase
  }

  /** @override */
  async shutdown() {
    this.blackboard.clear();
  }
}
