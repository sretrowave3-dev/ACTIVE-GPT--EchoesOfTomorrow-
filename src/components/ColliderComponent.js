// src/components/ColliderComponent.js
import { Component } from '../ecs/Component.js';

/**
 * Plain data component defining collision geometry for an entity.
 * Conforms to EDD Chapter 15 §7 (Collision Shapes).
 */
export class ColliderComponent extends Component {
  constructor() {
    super();
    /** @type {'box'|'sphere'|'capsule'} */
    this.shape = 'box';

    /** @type {{ x: number, y: number, z: number }} Box dimensions */
    this.size = { x: 1, y: 1, z: 1 };

    /** @type {number} Radius for sphere or capsule */
    this.radius = 0.5;

    /** @type {number} Total height for capsule */
    this.height = 1.8;

    /** @type {{ x: number, y: number, z: number }} Local offset from entity transform */
    this.center = { x: 0, y: 0, z: 0 };

    /** @type {boolean} Trigger volumes report overlaps without physical solid collision */
    this.isTrigger = false;

    /** @type {number} Bitmask for filtering collision layers */
    this.layer = 1;
    this.mask = 0xFFFFFFFF;
  }
}
