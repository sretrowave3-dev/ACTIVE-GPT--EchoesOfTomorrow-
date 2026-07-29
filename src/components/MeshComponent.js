import { Component } from '../Component.js';

export class MeshComponent extends Component {
  constructor() {
    super();
    /** @type {string|null} */
    this.meshId = null;   // reference to a loaded mesh asset
  }
}