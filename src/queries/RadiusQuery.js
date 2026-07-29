<<<<<<< HEAD
import { CellID } from '../CellID.js';

export class RadiusQuery {
  /**
   * @param {import('../World.js').World} world
   * @param {{x:number,y:number,z:number}} center
   * @param {number} radius
   * @param {import('../EntityHandle.js').EntityHandle[]} out
   * @param {import('../managers/SpatialManager.js').SpatialManager} spatialManager
   * @returns {import('../EntityHandle.js').EntityHandle[]}
   */
  static query(world, center, radius, out, spatialManager) {
    out.length = 0;
    const radiusSq = radius * radius;
    const minX = center.x - radius;
    const minZ = center.z - radius;
    const maxX = center.x + radius;
    const maxZ = center.z + radius;

    const cellIds = spatialManager.getCellsInBounds(minX, minZ, maxX, maxZ);

    for (const cellId of cellIds) {
      const cell = world.getCell(cellId);
      if (!cell) continue;
      for (const entityIdNum of cell.entityIDs) {
        // Retrieve entity via numeric ID – we use the internal _entities Map
        const entity = world.entityManager.entityRegistry._entities.get(entityIdNum);
        if (!entity) continue;
        const dx = entity.transform.position.x - center.x;
        const dy = entity.transform.position.y - center.y;
        const dz = entity.transform.position.z - center.z;
        if (dx*dx + dy*dy + dz*dz <= radiusSq) {
          out.push(entity.handle);
        }
      }
    }
    return out;
  }
=======
import { CellID } from '../CellID.js';

export class RadiusQuery {
  /**
   * @param {import('../World.js').World} world
   * @param {{x:number,y:number,z:number}} center
   * @param {number} radius
   * @param {import('../EntityHandle.js').EntityHandle[]} out
   * @param {import('../managers/SpatialManager.js').SpatialManager} spatialManager
   * @returns {import('../EntityHandle.js').EntityHandle[]}
   */
  static query(world, center, radius, out, spatialManager) {
    out.length = 0;
    const radiusSq = radius * radius;
    const minX = center.x - radius;
    const minZ = center.z - radius;
    const maxX = center.x + radius;
    const maxZ = center.z + radius;

    const cellIds = spatialManager.getCellsInBounds(minX, minZ, maxX, maxZ);

    for (const cellId of cellIds) {
      const cell = world.getCell(cellId);
      if (!cell) continue;
      for (const entityIdNum of cell.entityIDs) {
        // Retrieve entity via numeric ID – we use the internal _entities Map
        const entity = world.entityManager.entityRegistry._entities.get(entityIdNum);
        if (!entity) continue;
        const dx = entity.transform.position.x - center.x;
        const dy = entity.transform.position.y - center.y;
        const dz = entity.transform.position.z - center.z;
        if (dx*dx + dy*dy + dz*dz <= radiusSq) {
          out.push(entity.handle);
        }
      }
    }
    return out;
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}