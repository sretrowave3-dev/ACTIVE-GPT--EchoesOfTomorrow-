// src/animation/graph/AnimationState.js
import { GraphNode } from './GraphNode.js';

/**
 * AnimationState encapsulates an individual animation state (clip or blend tree)
 * within an AnimationGraph state machine.
 * Conforms to EDD Volume V (Animation System & State Graph).
 */
export class AnimationState extends GraphNode {
  /**
   * @param {string} name
   * @param {string} clipName
   * @param {number} [duration=1.0]
   * @param {boolean} [loop=true]
   * @param {number} [speed=1.0]
   */
  constructor(name, clipName, duration = 1.0, loop = true, speed = 1.0) {
    super(name);
    this.clipName = clipName;
    this.duration = Math.max(0.001, duration);
    this.loop = loop;
    this.speed = speed;

    this.currentTime = 0;
    this.normalizedTime = 0;
    this.isComplete = false;
  }

  /**
   * Called when entering this state.
   */
  enter() {
    this.currentTime = 0;
    this.normalizedTime = 0;
    this.isComplete = false;
  }

  /**
   * Ticks state time.
   * @param {number} delta - Elapsed seconds
   */
  update(delta) {
    if (this.isComplete && !this.loop) return;

    this.currentTime += delta * this.speed;

    if (this.currentTime >= this.duration) {
      if (this.loop) {
        this.currentTime = this.currentTime % this.duration;
      } else {
        this.currentTime = this.duration;
        this.isComplete = true;
      }
    }

    this.normalizedTime = this.currentTime / this.duration;
  }

  /**
   * Called when leaving this state.
   */
  exit() {
    this.currentTime = 0;
    this.normalizedTime = 0;
  }

  /**
   * @override
   * @param {Object} context
   */
  evaluate(context) {
    return {
      clipName: this.clipName,
      time: this.currentTime,
      normalizedTime: this.normalizedTime,
      isComplete: this.isComplete
    };
  }
}
