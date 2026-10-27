import { StreamingJob } from '../streaming/StreamingJob.js';
import { SectorLoader } from '../streaming/SectorLoader.js';
import { SectorUnloader } from '../streaming/SectorUnloader.js';
import { WorldPartition } from '../streaming/WorldPartition.js';

/**
 * Coordinates sector and cell streaming using job objects and spatial partitioning.
 * Conforms to EDD Chapter 14 (Streaming System & World Partition).
 */
export class StreamingManager {
  /**
   * @param {import('../world/World.js').World} world
   */
  constructor(world) {
    this.world = world;
    /** @type {StreamingJob[]} */
    this.pendingJobs = [];
    this.partition = new WorldPartition(50, 1);
  }

  /**
   * Schedule a load job for a sector.
   * @param {import('../data/SectorData.js').SectorData} sectorData
   */
  loadSector(sectorData) {
    const job = new SectorLoader(sectorData);
    this.pendingJobs.push(job);
  }

  /**
   * Schedule an unload job for a sector.
   * @param {import('../world/SectorID.js').SectorID} sectorId
   */
  unloadSector(sectorId) {
    const job = new SectorUnloader(sectorId);
    this.pendingJobs.push(job);
  }

  /**
   * Process all pending jobs and partition updates each frame.
   * @param {number} delta
   * @param {{ x: number, y: number, z: number }} [playerPos]
   */
  update(delta, playerPos = null) {
    while (this.pendingJobs.length > 0) {
      const job = this.pendingJobs.shift();
      job.execute(this.world);
    }

    if (playerPos) {
      const result = this.partition.update(playerPos, this.world);
      if (result.loaded.length > 0 && this.world.eventBus) {
        this.world.eventBus.publish('streaming:cells_loaded', this, { cells: result.loaded });
      }
    }
  }
}
