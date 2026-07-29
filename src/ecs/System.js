/**
 * Base class for systems. Systems contain behaviour and are driven by the scheduler.
 */
export class System {
  constructor() {
    this._enabled = true;
    this.priority = 0;   // lower number executes first
  }

  /**
   * Called once when the system is registered.
   * @param {import('./ECSManager.js').ECSManager} ecs
   */
  initialize(ecs) {
    // override if needed
  }

  /**
   * Per-frame update. Receives an array of matching entity IDs.
   * @param {number} delta
   * @param {number[]} entityIds – array of entity numeric IDs (from World's EntityID.id)
   * @param {import('./ECSManager.js').ECSManager} ecs
   */
  update(delta, entityIds, ecs) {
    throw new Error('System.update must be overridden.');
  }

  /**
   * Called when the system is removed or the ECS shuts down.
   */
  shutdown() {
    // override if needed
  }

  enable() {
    this._enabled = true;
  }

  disable() {
    this._enabled = false;
  }

  isEnabled() {
    return this._enabled;
  }

  /**
   * Returns the required component signature for entities processed by this system.
   * @returns {import('./EntitySignature.js').EntitySignature}
   */
  requiredSignature() {
    throw new Error('System.requiredSignature must be overridden.');
  }
}