<<<<<<< HEAD
import { StreamingJob } from './StreamingJob.js';
import { CellID } from '../CellID.js';

/**
 * Unloads a sector and removes its cells and entities.
 */
export class SectorUnloader extends StreamingJob {
  /**
   * @param {import('../SectorID.js').SectorID} sectorId
   */
  constructor(sectorId) {
    super();
    this.sectorId = sectorId;
  }

  /**
   * @param {import('../World.js').World} world
   */
  execute(world) {
    const sector = world.getSector(this.sectorId);
    if (!sector || sector.state === 'unloaded') return;

    sector.state = 'unloading';

    // Remove all cells of this sector
    for (const cellId of sector.cellIDs) {
      const cell = world.getCell(cellId);
      if (cell) {
        // Destroy all entities in the cell
        for (const entityIdNum of cell.entityIDs) {
          // We need the EntityID object; we can retrieve the entity and get its ID
          const entity = world.entityManager.entityRegistry._entities.get(entityIdNum);
          if (entity) {
            world.destroyEntity(entity.id);
          }
        }
        // Remove from spatial index
        world.spatialManager.removeCell(cellId);
        // Unregister cell
        world.cellRegistry.unregister(cellId);
      }
    }

    sector.cellIDs.length = 0;
    sector.state = 'unloaded';
    world.sectorRegistry.unregister(this.sectorId);
  }
=======
import { StreamingJob } from './StreamingJob.js';
import { CellID } from '../CellID.js';

/**
 * Unloads a sector and removes its cells and entities.
 */
export class SectorUnloader extends StreamingJob {
  /**
   * @param {import('../SectorID.js').SectorID} sectorId
   */
  constructor(sectorId) {
    super();
    this.sectorId = sectorId;
  }

  /**
   * @param {import('../World.js').World} world
   */
  execute(world) {
    const sector = world.getSector(this.sectorId);
    if (!sector || sector.state === 'unloaded') return;

    sector.state = 'unloading';

    // Remove all cells of this sector
    for (const cellId of sector.cellIDs) {
      const cell = world.getCell(cellId);
      if (cell) {
        // Destroy all entities in the cell
        for (const entityIdNum of cell.entityIDs) {
          // We need the EntityID object; we can retrieve the entity and get its ID
          const entity = world.entityManager.entityRegistry._entities.get(entityIdNum);
          if (entity) {
            world.destroyEntity(entity.id);
          }
        }
        // Remove from spatial index
        world.spatialManager.removeCell(cellId);
        // Unregister cell
        world.cellRegistry.unregister(cellId);
      }
    }

    sector.cellIDs.length = 0;
    sector.state = 'unloaded';
    world.sectorRegistry.unregister(this.sectorId);
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}