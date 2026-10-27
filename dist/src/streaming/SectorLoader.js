import { StreamingJob } from './StreamingJob.js';
import { CellID } from '../world/CellID.js';

/**
 * Loads a sector from its data definition into the world.
 */
export class SectorLoader extends StreamingJob {
  /**
   * @param {import('../data/SectorData.js').SectorData} sectorData
   */
  constructor(sectorData) {
    super();
    this.sectorData = sectorData;
  }

  /**
   * @param {import('../World.js').World} world
   */
  execute(world) {
    const data = this.sectorData;
    const sectorId = data.id;

    // Ensure sector exists
    let sector = world.getSector(sectorId);
    if (!sector) {
      sector = world.hierarchy.createSector(sectorId.value);
    }
    sector.state = 'loading';

    // Create cells
    for (const cellDef of data.cells) {
      const cellId = new CellID(cellDef.id);
      let cell = world.getCell(cellId);
      if (!cell) {
        cell = world.hierarchy.createCell(cellId.value);
      }
      // Register in spatial index
      world.spatialManager.addCell(cellId, cellDef.gridX, cellDef.gridZ);
      // Link cell to sector
      if (!sector.cellIDs.some(cid => cid.equals(cellId))) {
        sector.cellIDs.push(cellId);
      }
    }

    sector.state = 'loaded';
  }
}
