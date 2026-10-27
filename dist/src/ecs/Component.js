/**
 * Base class for all components.
 * Subclasses must set a static `typeId` property (assigned by ECSManager).
 */
export class Component {
  /**
   * Optional reset method, called when a component is removed or pooled.
   */
  reset() {
    // override in subclass if needed
  }
}