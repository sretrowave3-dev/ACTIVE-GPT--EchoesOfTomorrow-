/**
 * Represents a single update phase (e.g., 'input', 'rendering').
 * Holds an ordered list of services that participate in this phase.
 */
class FramePhase {
  constructor(name) {
    this.name = name;
    this.services = [];
  }

  addService(service) {
    this.services.push(service);
  }

  execute(delta) {
    for (const service of this.services) {
      service.update(delta);
    }
  }
}

/**
 * Manages a sequence of FramePhases, executed in order each frame.
 */
export class FrameScheduler {
  constructor() {
    /** @type {Map<string, FramePhase>} */
    this.phases = new Map();
    this.phaseOrder = [];   // insertion order
  }

  /**
   * Create a new phase (if not already existing) and return it.
   * @param {string} name
   * @returns {FramePhase}
   */
  addPhase(name) {
    if (this.phases.has(name)) {
      return this.phases.get(name);
    }
    const phase = new FramePhase(name);
    this.phases.set(name, phase);
    this.phaseOrder.push(name);
    return phase;
  }

  /**
   * Assign a service to a specific phase.
   * @param {string} phaseName
   * @param {import('../services/Service.js').Service} service
   */
  addServiceToPhase(phaseName, service) {
    const phase = this.addPhase(phaseName);
    phase.addService(service);
  }

  /**
   * Execute all phases in order.
   * @param {number} deltaTime
   */
  run(deltaTime) {
    for (const name of this.phaseOrder) {
      this.phases.get(name).execute(deltaTime);
    }
  }
}
