import { StreamingJob } from '../streaming/StreamingJob.js';
import { SectorLoader } from '../streaming/SectorLoader.js';
import { SectorUnloader } from '../streaming/SectorUnloader.js';

/**
 * Coordinates sector streaming using job objects.
 */
export class StreamingManager {
  /**
   * @param {import('../World.js').World} world
   */
  constructor(world) {
    this.world = world;
    /** @type {StreamingJob[]} */
    this.pendingJobs = [];
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
   * @param {import('../SectorID.js').SectorID} sectorId
   */
  unloadSector(sectorId) {
    const job = new SectorUnloader(sectorId);
    this.pendingJobs.push(job);
  }

  /**
   * Process all pending jobs synchronously each frame.
   * In future, this will become async/incremental.
   * @param {number} delta
   */
  update(delta) {
    while (this.pendingJobs.length > 0) {
      const job = this.pendingJobs.shift();
      job.execute(this.world);
    }
  }
}