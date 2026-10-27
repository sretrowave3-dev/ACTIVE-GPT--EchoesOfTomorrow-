import { RegionID } from '../world/RegionID.js';

export class Region {
  /**
   * @param {RegionID} id
   */
  constructor(id) {
    /** @readonly */
    this.id = id;
    /** @type {import('../SectorID.js').SectorID[]} */
    this.sectorIDs = [];
  }
}