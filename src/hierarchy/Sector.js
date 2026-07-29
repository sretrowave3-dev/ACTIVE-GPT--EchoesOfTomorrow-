import { SectorID } from '../SectorID.js';

export class Sector {
  /**
   * @param {SectorID} id
   */
  constructor(id) {
    /** @readonly */
    this.id = id;
    /** @type {import('../CellID.js').CellID[]} */
    this.cellIDs = [];
    /** @type {'loaded'|'unloaded'|'loading'|'unloading'} */
    this.state = 'unloaded';
  }
}