// src/animation/graph/AnimationGraph.js
import { AnimationState } from './AnimationState.js';
import { AnimationTransition } from './AnimationTransition.js';

/**
 * AnimationGraph coordinates the hierarchical animation state machine,
 * transition rules, parameter blackboards, and smooth cross-fading.
 * Conforms to EDD Volume V (Animation System & State Graph).
 */
export class AnimationGraph {
  /**
   * @param {string} [name='DefaultAnimGraph']
   */
  constructor(name = 'DefaultAnimGraph') {
    this.name = name;

    /** @type {Map<string, AnimationState>} */
    this.states = new Map();

    /** @type {AnimationTransition[]} */
    this.transitions = [];

    /** @type {Record<string, any>} */
    this.parameters = {
      speed: 0.0,
      strafe: 0.0,
      isGrounded: true,
      isCrouching: false,
      isSprinting: false,
      verticalVelocity: 0.0
    };

    /** @type {AnimationState|null} */
    this.currentState = null;

    /** @type {AnimationState|null} */
    this.targetState = null;

    this.isTransitioning = false;
    this.transitionDuration = 0.2;
    this.transitionProgress = 0.0;
  }

  /**
   * Adds an animation state to the graph.
   * @param {AnimationState} state
   */
  addState(state) {
    this.states.set(state.name, state);
    if (!this.currentState) {
      this.currentState = state;
      this.currentState.enter();
    }
  }

  /**
   * Adds a transition rule between two states.
   * @param {string} fromState
   * @param {string} toState
   * @param {number} [duration=0.2]
   * @param {Function} [condition=null]
   * @param {boolean} [hasExitTime=false]
   * @param {number} [exitTime=0.9]
   */
  addTransition(fromState, toState, duration = 0.2, condition = null, hasExitTime = false, exitTime = 0.9) {
    const transition = new AnimationTransition(fromState, toState, duration, condition, hasExitTime, exitTime);
    this.transitions.push(transition);
  }

  /**
   * Sets a blackboard parameter.
   * @param {string} name
   * @param {any} value
   */
  setParameter(name, value) {
    this.parameters[name] = value;
  }

  /**
   * Gets a blackboard parameter.
   * @param {string} name
   * @returns {any}
   */
  getParameter(name) {
    return this.parameters[name];
  }

  /**
   * Evaluates transitions and updates active animation states.
   * @param {number} delta - Frame delta in seconds
   */
  update(delta) {
    if (!this.currentState) return;

    // 1. If currently in cross-fade transition
    if (this.isTransitioning && this.targetState) {
      this.transitionProgress += (this.transitionDuration > 0) ? (delta / this.transitionDuration) : 1.0;
      this.currentState.update(delta);
      this.targetState.update(delta);

      if (this.transitionProgress >= 1.0) {
        // Complete transition
        this.currentState.exit();
        this.currentState = this.targetState;
        this.targetState = null;
        this.isTransitioning = false;
        this.transitionProgress = 0.0;
      }
      return;
    }

    // 2. Normal playback on current state
    this.currentState.update(delta);

    // 3. Evaluate outgoing transitions from current state
    for (const trans of this.transitions) {
      if (trans.fromState === this.currentState.name) {
        if (trans.canTransition(this.currentState, this.parameters)) {
          const nextState = this.states.get(trans.toState);
          if (nextState) {
            this.isTransitioning = true;
            this.targetState = nextState;
            this.targetState.enter();
            this.transitionDuration = trans.duration;
            this.transitionProgress = 0.0;
            break;
          }
        }
      }
    }
  }

  /**
   * Retrieves active playback status and cross-fade weights.
   * @returns {{ currentClip: string, targetClip: string|null, blendWeight: number, isTransitioning: boolean }}
   */
  getActiveState() {
    return {
      currentClip: this.currentState ? this.currentState.clipName : '',
      targetClip: this.targetState ? this.targetState.clipName : null,
      blendWeight: this.isTransitioning ? this.transitionProgress : 1.0,
      isTransitioning: this.isTransitioning
    };
  }
}
