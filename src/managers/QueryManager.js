import { RadiusQuery } from '../queries/RadiusQuery.js';
import { NearestQuery } from '../queries/NearestQuery.js';
import { CellQuery } from '../queries/CellQuery.js';
import { CellID } from '../CellID.js';

/**
 * Central query interface. Delegates to specialised query implementations.
 */
export class QueryManager {
  /**
   * @param {import('../World.js').World} world
   * @param {import('./SpatialManager.js').SpatialManager} spatialManager
   */
  constructor(world, spatialManager) {
    this.world = world;
    this.spatialManager = spatialManager;
  }

  /**
   * Find all entities within a radius of a point.
   * @param {{x:number,y:number,z:number}} center
   * @param {number} radius
   * @param {import('../EntityHandle.js').EntityHandle[]} [out] reusable array
   * @returns {import('../EntityHandle.js').EntityHandle[]}
   */
  queryRadius(center, radius, out = []) {
    return RadiusQuery.query(this.world, center, radius, out, this.spatialManager);
  }

  /**
   * Find the nearest entity to a point.
   * @param {{x:number,y:number,z:number}} center
   * @returns {import('../EntityHandle.js').EntityHandle|null}
   */
  queryNearest(center) {
    return NearestQuery.query(this.world, center);
  }

  /**
   * Get all entities in a specific cell.
   * @param {CellID} cellId
   * @param {import('../EntityHandle.js').EntityHandle[]} [out]
   * @returns {import('../EntityHandle.js').EntityHandle[]}
   */
  queryCell(cellId, out = []) {
    return CellQuery.query(this.world, cellId, out);
  }
}