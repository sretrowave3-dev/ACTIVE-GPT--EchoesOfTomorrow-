// src/components/AnimationComponent.js
import { Component } from '../ecs/Component.js';

/**
 * Plain data component defining skeletal or VAT animation state for an entity.
 * Conforms to EDD Chapter 12 (Animation System & VAT Pipeline).
 */
export class AnimationComponent extends Component {
  constructor() {
    super();
    /** @type {string} Active animation clip name */
    this.currentClip = 'idle';

    /** @type {number} Current playback time in seconds */
    this.time = 0.0;

    /** @type {number} Playback speed multiplier (1.0 = normal, -1.0 = reverse) */
    this.speed = 1.0;

    /** @type {boolean} Whether animation loops when reaching duration */
    this.loop = true;

    /** @type {boolean} Playback active flag */
    this.playing = true;

    /** @type {number} Cross-fade blend weight [0.0, 1.0] */
    this.blendWeight = 1.0;

    /** @type {string|null} Target clip name during cross-fade transition */
    this.targetClip = null;

    /** @type {number} Cross-fade transition duration in seconds */
    this.fadeDuration = 0.25;

    /** @type {number} Elapsed cross-fade transition time */
    this.fadeTime = 0.0;

    /** @type {import('../animation/skeleton/SkeletonPose.js').SkeletonPose|null} Instanced pose */
    this.pose = null;

    /** @type {import('../animation/runtime/AnimationController.js').AnimationController|null} Controller instance */
    this.controller = null;
  }
}
