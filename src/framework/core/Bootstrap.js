import { Framework } from './Framework.js';
import { ServiceManifest } from './ServiceManifest.js';

export class Bootstrap {
  /**
   * Initializes and boots the complete Echo Engine runtime.
   * @returns {Promise<Framework>}
   */
  static async start() {
    const framework = new Framework();
    if (typeof window !== 'undefined') {
      window.__framework = framework;
    }

    framework.registerServices(ServiceManifest);

    const scheduler = framework.frameScheduler;

    // Phase order per Chapter 5
    scheduler.addPhase('events');
    scheduler.addPhase('input');
    scheduler.addPhase('streaming');
    scheduler.addPhase('world');
    scheduler.addPhase('time');
    scheduler.addPhase('ecs');
    scheduler.addPhase('ai');
    scheduler.addPhase('gameplay');
    scheduler.addPhase('animation');
    scheduler.addPhase('audio');
    scheduler.addPhase('rendering');
    scheduler.addPhase('ui');
    scheduler.addPhase('diagnostics');

    // Assign services to phases
    scheduler.addServiceToPhase('input', framework.serviceRegistry.get('input'));
    scheduler.addServiceToPhase('world', framework.serviceRegistry.get('world'));
    scheduler.addServiceToPhase('time', framework.serviceRegistry.get('time'));
    scheduler.addServiceToPhase('ecs', framework.serviceRegistry.get('ecs'));
    scheduler.addServiceToPhase('gameplay', framework.serviceRegistry.get('player'));
    scheduler.addServiceToPhase('audio', framework.serviceRegistry.get('audio'));
    scheduler.addServiceToPhase('rendering', framework.serviceRegistry.get('render'));
    scheduler.addServiceToPhase('ui', framework.serviceRegistry.get('ui'));

    await framework.serviceRegistry.initializeAll();
    await framework.serviceRegistry.startAll();

    framework.stateMachine.changeState('Playing');
    framework.startMainLoop();

    return framework;
  }
}
