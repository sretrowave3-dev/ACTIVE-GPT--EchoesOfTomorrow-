import { CellID } from '../world/CellID.js';
import { GridPartition } from '../spatial/GridPartition.js';

export class SpatialManager {
  /**
   * @param {number} cellSize - world units per cell
   */
  constructor(cellSize = 50) {
    this.gridPartition = new GridPartition(cellSize);
  }

  /**
   * Register a cell in the spatial index.
   * @param {CellID} cellId
   * @param {number} gridX
   * @param {number} gridZ
   */
  addCell(cellId, gridX, gridZ) {
    this.gridPartition.addCell(gridX, gridZ, cellId.value);
  }

  /**
   * Remove a cell from the spatial index.
   * @param {CellID} cellId
   */
  removeCell(cellId) {
    this.gridPartition.removeCell(cellId.value);
  }

  /**
   * Find the CellID containing a world position.
   * @param {{x: number, y: number, z: number}} position
   * @returns {CellID|null}
   */
  getCellAt(position) {
    const raw = this.gridPartition.getCellId(position);
    return raw ? new CellID(raw) : null;
  }

  /**
   * Get all cell IDs that overlap an AABB (infinite Y).
   * @param {number} minX
   * @param {number} minZ
   * @param {number} maxX
   * @param {number} maxZ
   * @returns {CellID[]}
   */
  getCellsInBounds(minX, minZ, maxX, maxZ) {
    const rawIds = this.gridPartition.getCellsInBounds(minX, minZ, maxX, maxZ);
    return rawIds.map(id => new CellID(id));
  }
}