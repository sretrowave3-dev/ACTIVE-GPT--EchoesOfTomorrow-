import { GameClock } from './GameClock.js';
import { ServiceRegistry } from './ServiceRegistry.js';
import { FrameScheduler } from './FrameScheduler.js';
import { EventBus } from '../events/EventBus.js';
import { GameStateMachine } from '../state/GameStateMachine.js';
import { DiagnosticsService } from '../diagnostics/DiagnosticsService.js';

export class Framework {
  constructor() {
    this.clock = new GameClock();
    this.serviceRegistry = new ServiceRegistry();
    this.frameScheduler = new FrameScheduler();
    this.eventBus = new EventBus();
    this.stateMachine = new GameStateMachine(this);
    this.diagnostics = new DiagnosticsService(this.clock);
    this.diagnostics.setEventBus(this.eventBus);
  }

  /**
   * Register services from an array of service constructors.
   * Each constructor is called with (this) and registered by its class name.
   * @param {Array<typeof import('../services/Service.js').Service>} serviceClasses
   */
  registerServices(serviceClasses) {
    for (const ServiceClass of serviceClasses) {
      const service = new ServiceClass(this);
      this.serviceRegistry.register(service.name, service);
    }
  }

  startMainLoop() {
    const loop = (timestamp) => {
      this.clock.tick(timestamp);
      const delta = this.clock.deltaTime;

      this.diagnostics.update(delta);
      this.eventBus.dispatch();
      this.frameScheduler.run(delta);

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}