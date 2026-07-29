import { Component } from '../Component.js';

export class HealthComponent extends Component {
  constructor() {
    super();
    this.current = 100;
    this.max = 100;
  }
}