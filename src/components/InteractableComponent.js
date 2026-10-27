// src/components/InteractableComponent.js
import { Component } from '../ecs/Component.js';

/**
 * Plain data component defining world interaction triggers (memory fragments, terminals, doors).
 * Conforms to EDD Chapter 19 §4 (Gameplay Framework - Interaction System).
 */
export class InteractableComponent extends Component {
  constructor() {
    super();
    /** @type {string} UI prompt displayed when player is in range */
    this.prompt = 'Inspect Memory Fragment';

    /** @type {number} Activation proximity radius in meters */
    this.radius = 2.5;

    /** @type {string} Identifier for gameplay action */
    this.actionId = 'memory_fragment_01';

    /** @type {boolean} Trigger once and disable */
    this.isOneShot = true;

    /** @type {boolean} True if player already interacted */
    this.completed = false;

    /** @type {boolean} Whether interaction is currently enabled */
    this.enabled = true;
  }
}
