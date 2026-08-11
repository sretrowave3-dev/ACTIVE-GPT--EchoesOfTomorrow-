import { Component } from '../ecs/Component.js';

export class AudioComponent extends Component {
  constructor() {
    super();
    /** @type {string|null} */
    this.soundId = null;
    this.volume = 1;
    this.loop = false;
  }
}