// src/world/WorldManager.js
import { Service } from '../framework/services/Service.js';
import { World } from './World.js';

export class WorldManager extends Service {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('world', framework);
    /** @type {World|null} */
    this.world = null;
  }

  async initialize() {
    this.world = new World(this.framework.clock, this.framework.eventBus);
  }

  update(delta) {
    if (this.world) {
      const playerService = this.framework.serviceRegistry.get('player');
      const playerPos = playerService ? playerService.getPlayerPosition() : null;
      this.world.update(delta, playerPos);
    }
  }

  async shutdown() {
    this.world = null;
  }
}
