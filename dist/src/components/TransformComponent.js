import { Component } from '../ecs/Component.js';

export class TransformComponent extends Component {
  constructor() {
    super();
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1 };
  }
}