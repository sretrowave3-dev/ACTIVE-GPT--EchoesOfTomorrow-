import { Service } from '../framework/services/Service.js';
import { ECSManager } from './ECSManager.js';
import { SystemScheduler } from './SystemScheduler.js';

import { TransformComponent } from './components/TransformComponent.js';
import { VelocityComponent } from './components/VelocityComponent.js';
import { HealthComponent } from './components/HealthComponent.js';
import { MeshComponent } from './components/MeshComponent.js';
import { AudioComponent } from './components/AudioComponent.js';

import { MovementSystem } from './systems/MovementSystem.js';
import { HealthSystem } from './systems/HealthSystem.js';
import { AnimationSystem } from './systems/AnimationSystem.js';

export class ECSService extends Service {
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