// src/components/RigidBodyComponent.js
import { Component } from '../ecs/Component.js';

/**
 * Plain data component defining mass, kinematics, and physical response properties.
 * Conforms to EDD Chapter 15 §13 (Rigid Body Simulation).
 */
export class RigidBodyComponent extends Component {
  constructor() {
    super();
    /** @type {number} Mass in kilograms. 0 denotes static/immovable */
    this.mass = 1.0;

    /** @type {boolean} If true, position is moved exclusively by gameplay/scripts */
    this.isKinematic = false;

    /** @type {boolean} Whether standard environmental gravity acts upon this body */
    this.useGravity = true;

    /** @type {number} Linear damping / air resistance [0, 1] */
    this.linearDamping = 0.05;

    /** @type {number} Coefficient of restitution (bounciness) [0, 1] */
    this.restitution = 0.1;

    /** @type {number} Dynamic friction coefficient [0, 1] */
    this.friction = 0.6;

    /** @type {boolean} True if the entity is currently resting on a solid surface */
    this.isGrounded = false;
  }
}
