// src/ecs/ECSService.js
import { Service } from '../framework/services/Service.js';
import { ECSManager } from './ECSManager.js';
import { SystemScheduler } from './SystemScheduler.js';

import { TransformComponent } from '../components/TransformComponent.js';
import { VelocityComponent } from '../components/VelocityComponent.js';
import { HealthComponent } from '../components/HealthComponent.js';
import { MeshComponent } from '../components/MeshComponent.js';
import { AudioComponent } from '../components/AudioComponent.js';

import { MovementSystem } from '../systems/MovementSystem.js';
import { HealthSystem } from '../systems/HealthSystem.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';

export class ECSService extends Service {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('ecs', framework);
    this.ecsManager = null;
    this.scheduler = null;
  }

  async initialize() {
    this.ecsManager = new ECSManager(this.framework.eventBus);
    this.ecsManager.setupEventListeners();

    this.ecsManager.registerComponent('Transform', TransformComponent);
    this.ecsManager.registerComponent('Velocity', VelocityComponent);
    this.ecsManager.registerComponent('Health', HealthComponent);
    this.ecsManager.registerComponent('Mesh', MeshComponent);
    this.ecsManager.registerComponent('Audio', AudioComponent);

    this.scheduler = new SystemScheduler(this.ecsManager);
    this.scheduler.registerSystem(new MovementSystem());
    this.scheduler.registerSystem(new HealthSystem());
    this.scheduler.registerSystem(new AnimationSystem());
  }

  async start() {
    console.log('[ECSService] Started with core component stores and systems.');

    // Spawn Milestone A test simulation props into the ECS
    this.spawnEntity(101, { x: -4, y: 0.75, z: -5 }, { x: 1.5, y: 1.5, z: 1.5 });
    this.spawnEntity(102, { x: 4, y: 0.75, z: -5 }, { x: 1.5, y: 1.5, z: 1.5 });
    this.spawnEntity(103, { x: 0, y: 0.6, z: -10 }, { x: 2.5, y: 1.2, z: 2.5 });
  }

  /**
   * Helper to spawn an entity with Transform and Mesh in the ECS.
   * @param {number} id
   * @param {{ x: number, y: number, z: number }} pos
   * @param {{ x: number, y: number, z: number }} size
   */
  spawnEntity(id, pos, size = { x: 1, y: 1, z: 1 }) {
    if (!this.ecsManager) return;
    this.ecsManager.addComponent(id, 'Transform');
    this.ecsManager.addComponent(id, 'Mesh');
    const transform = this.ecsManager.getComponent(id, 'Transform');
    if (transform) {
      transform.position.x = pos.x;
      transform.position.y = pos.y;
      transform.position.z = pos.z;
    }
    const mesh = this.ecsManager.getComponent(id, 'Mesh');
    if (mesh) {
      mesh.meshId = `prop_${id}`;
      mesh.size = size;
    }
  }

  update(delta) {
    if (this.scheduler) {
      this.scheduler.update(delta);
    }
  }

  async shutdown() {
    if (this.scheduler) {
      this.scheduler.shutdown();
    }
    if (this.ecsManager) {
      this.ecsManager.dispose();
    }
  }
}
