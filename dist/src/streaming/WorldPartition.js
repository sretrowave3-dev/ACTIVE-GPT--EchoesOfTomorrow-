// src/streaming/WorldPartition.js
import { CellID } from '../world/CellID.js';

/**
 * WorldPartition manages grid-based spatial partition streaming,
 * activating cells within radius of the player and hibernating distant regions.
 * Conforms to EDD Chapter 14 (Streaming System & World Partition).
 */
export class WorldPartition {
  /**
   * @param {number} [cellSize=50] Size in meters of each spatial cell
   * @param {number} [activeRadius=1] Ring radius of active cells around player
   */
  constructor(cellSize = 50, activeRadius = 1) {
    this.cellSize = cellSize;
    this.activeRadius = activeRadius;

    /** @type {Set<string>} Keys of currently active cells ('x:z') */
    this.activeCellKeys = new Set();

    this.lastGridX = null;
    this.lastGridZ = null;
  }

  /**
   * Update active partition cells relative to player position.
   * @param {{ x: number, y: number, z: number }} playerPos
   * @param {import('../world/World.js').World} world
   * @returns {{ loaded: string[], unloaded: string[] }}
   */
  update(playerPos, world) {
    if (!playerPos || !world) return { loaded: [], unloaded: [] };

    const gridX = Math.floor(playerPos.x / this.cellSize);
    const gridZ = Math.floor(playerPos.z / this.cellSize);

    if (gridX === this.lastGridX && gridZ === this.lastGridZ) {
      return { loaded: [], unloaded: [] };
    }

    this.lastGridX = gridX;
    this.lastGridZ = gridZ;

    const desiredKeys = new Set();
    const loaded = [];
    const unloaded = [];

    // Calculate ring of cells within streaming radius
    for (let dx = -this.activeRadius; dx <= this.activeRadius; dx++) {
      for (let dz = -this.activeRadius; dz <= this.activeRadius; dz++) {
        const cx = gridX + dx;
        const cz = gridZ + dz;
        const key = `${cx}:${cz}`;
        desiredKeys.add(key);

        if (!this.activeCellKeys.has(key)) {
          this.activeCellKeys.add(key);
          const cellId = new CellID(`cell_${cx}_${cz}`);
          let cell = world.getCell(cellId);
          if (!cell) {
            cell = world.hierarchy.createCell(cellId.value);
            world.spatialManager.addCell(cellId, cx, cz);
          }
          loaded.push(key);
        }
      }
    }

    // Identify cells that moved out of range
    for (const activeKey of this.activeCellKeys) {
      if (!desiredKeys.has(activeKey)) {
        this.activeCellKeys.delete(activeKey);
        unloaded.push(activeKey);
      }
    }

    return { loaded, unloaded };
  }

  /**
   * Check if a specific grid cell is currently resident in memory.
   * @param {number} x
   * @param {number} z
   * @returns {boolean}
   */
  isCellActive(x, z) {
    return this.activeCellKeys.has(`${x}:${z}`);
  }
}
