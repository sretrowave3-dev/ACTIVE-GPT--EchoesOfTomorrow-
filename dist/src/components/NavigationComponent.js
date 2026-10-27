// src/components/NavigationComponent.js
import { Component } from '../ecs/Component.js';

/**
 * Plain data component defining waypoints and path traversal state for an entity.
 * Conforms to EDD Chapter 16 (AI & Navigation).
 */
export class NavigationComponent extends Component {
  constructor() {
    super();
    /** @type {Array<{ x: number, y: number, z: number }>} Route waypoints */
    this.waypoints = [];

    /** @type {number} Current active waypoint target index */
    this.currentWaypointIndex = 0;

    /** @type {boolean} Loop waypoints continuously */
    this.isLoop = true;

    /** @type {number} Arrival distance threshold */
    this.stoppingDistance = 0.5;

    /** @type {boolean} True if the entity has reached the final destination */
    this.hasArrived = false;
  }
}
