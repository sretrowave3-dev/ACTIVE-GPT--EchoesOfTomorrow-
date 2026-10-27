// src/components/AIComponent.js
import { Component } from '../ecs/Component.js';

/**
 * Plain data component defining artificial intelligence state, perception, and targets.
 * Conforms to EDD Chapter 16 §5 (ECS Integration).
 */
export class AIComponent extends Component {
  constructor() {
    super();
    /** @type {'idle'|'patrol'|'chase'|'search'} Active AI behavioral state */
    this.state = 'patrol';

    /** @type {number} Vision / perception range in meters */
    this.sightRadius = 12.0;

    /** @type {number} Combat engagement range in meters */
    this.attackRadius = 2.0;

    /** @type {number|null} Target entity numeric ID */
    this.targetId = null;

    /** @type {{ x: number, y: number, z: number }|null} Last known target coordinates */
    this.targetPosition = null;

    /** @type {number} Movement speed in meters/second */
    this.speed = 3.5;

    /** @type {number} Rotation speed in radians/second */
    this.turnSpeed = 3.0;

    /** @type {number} Seconds to continue searching after losing sight */
    this.searchTimer = 0.0;
  }
}
