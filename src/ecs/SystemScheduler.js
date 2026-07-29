/**
 * Scheduler that owns the ordered list of systems and runs them each frame.
 */
export class SystemScheduler {
  constructor(ecsManager) {
    /** @type {import('./ECSManager.js').ECSManager} */
    this.ecs = ecsManager;
    /** @type {import('./System.js').System[]} */
    this.systems = [];
  }

  /**
   * Register a system.
   * @param {import('./System.js').System} system
   */
  registerSystem(system) {
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);
    system.initialize(this.ecs);
  }

  /**
   * Execute all systems in order.
   * @param {number} delta
   */
  update(delta) {
    for (const system of this.systems) {
      if (!system.isEnabled()) continue;
      const requiredSig = system.requiredSignature();
      const matches = [];
      this.ecs._entities.forEach((entity, numericId) => {
        if (entity.flags.active && entity.signature.matches(requiredSig)) {
          matches.push(numericId);
        }
      });
      system.update(delta, matches, this.ecs);
    }
  }

  /**
   * Remove a system.
   * @param {import('./System.js').System} system
   */
  removeSystem(system) {
    const idx = this.systems.indexOf(system);
    if (idx !== -1) {
      this.systems.splice(idx, 1);
      system.shutdown();
    }
  }

  /** Shutdown all systems. */
  shutdown() {
    for (const system of this.systems) {
      system.shutdown();
    }
    this.systems.length = 0;
  }
}