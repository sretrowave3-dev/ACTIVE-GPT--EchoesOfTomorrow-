import { RegionRegistry } from './registries/RegionRegistry.js';
import { SectorRegistry } from './registries/SectorRegistry.js';
import { CellRegistry } from './registries/CellRegistry.js';
import { EntityRegistry } from './registries/EntityRegistry.js';
import { WorldGraph } from './managers/WorldGraph.js';
import { EntityManager } from './managers/EntityManager.js';
import { SpatialManager } from './managers/SpatialManager.js';
import { QueryManager } from './managers/QueryManager.js';
import { StreamingManager } from './managers/StreamingManager.js';
import { CellID } from './CellID.js';

export class World {
  /**
   * @param {import('../framework/core/GameClock.js').GameClock} clock
   * @param {import('../framework/events/EventBus.js').EventBus} eventBus
   */
  constructor(clock, eventBus) {
    this.clock = clock;
    this.eventBus = eventBus;

    this.regionRegistry = new RegionRegistry();
    this.sectorRegistry = new SectorRegistry();
    this.cellRegistry = new CellRegistry();
    this.entityRegistry = new EntityRegistry();

    this.hierarchy = new WorldGraph(this.regionRegistry, this.sectorRegistry, this.cellRegistry);
    this.spatialManager = new SpatialManager(50);
    this.entityManager = new EntityManager(this.entityRegistry);
    this.queryManager = new QueryManager(this, this.spatialManager);
    this.streamingManager = new StreamingManager(this);
  }

  createEntity(cellId) {
    const handle = this.entityManager.create(cellId);
    const entity = handle.get();
    if (entity && this.eventBus) {
      this.eventBus.publish('entity:created', this, { entityId: entity.id });
    }
    return handle;
  }

  destroyEntity(entityId) {
    const entity = this.entityRegistry.get(entityId);
    if (entity && entity.cellId) {
      const cell = this.cellRegistry.get(new CellID(entity.cellId));
      if (cell) cell.removeEntity(entityId.id);
    }
    this.entityManager.destroy(entityId);
    if (this.eventBus) {
      this.eventBus.publish('entity:destroyed', this, { entityId });
    }
  }

  getEntityHandle(entityId) {
    return this.entityManager.getHandle(entityId);
  }

  getRegion(id) {
    return this.regionRegistry.get(id);
  }

  getSector(id) {
    return this.sectorRegistry.get(id);
  }

  getCell(id) {
    return this.cellRegistry.get(id);
  }

  queryRadius(center, radius, out) {
    return this.queryManager.queryRadius(center, radius, out);
  }

  queryNearest(center) {
    return this.queryManager.queryNearest(center);
  }

  queryCell(cellId, out) {
    return this.queryManager.queryCell(cellId, out);
  }

  update(delta) {
    this.streamingManager.update(delta);
  }
}