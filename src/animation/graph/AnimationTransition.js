// src/animation/graph/AnimationTransition.js

/**
 * AnimationTransition defines rules and conditions for transitioning
 * between animation states, including cross-fade duration and exit-time constraints.
 * Conforms to EDD Volume V (Animation System & State Graph).
 */
export class AnimationTransition {
  /**
   * @param {string} fromState
   * @param {string} toState
   * @param {number} [duration=0.2] - Cross-fade duration in seconds
   * @param {Function} [condition=null] - Predicate (params) => boolean
   * @param {boolean} [hasExitTime=false] - Requires normalized time threshold
   * @param {number} [exitTime=0.9] - Normalized exit threshold (0.0 - 1.0)
   */
  constructor(fromState, toState, duration = 0.2, condition = null, hasExitTime = false, exitTime = 0.9) {
    this.fromState = fromState;
    this.toState = toState;
    this.duration = Math.max(0, duration);
    this.condition = condition;
    this.hasExitTime = hasExitTime;
    this.exitTime = exitTime;
  }

  /**
   * Tests whether conditions are satisfied to begin transition.
   * @param {import('./AnimationState.js').AnimationState} sourceState
   * @param {Record<string, any>} parameters
   * @returns {boolean}
   */
  canTransition(sourceState, parameters) {
    // 1. Check exit-time constraint if enabled
    if (this.hasExitTime && sourceState) {
      if (sourceState.normalizedTime < this.exitTime && !sourceState.isComplete) {
        return false;
      }
    }

    // 2. Check predicate condition
    if (this.condition) {
      return Boolean(this.condition(parameters));
    }

    // If hasExitTime is true and reached, and no condition, transition is triggered
    return this.hasExitTime;
  }
}
