import { SectorID } from '../world/SectorID.js';

export class SectorRegistry {
  constructor() {
    /** @type {Map<string, import('../hierarchy/Sector.js').Sector>} */
    this._map = new Map();
  }

  /**
   * @param {SectorID} id
   * @param {import('../hierarchy/Sector.js').Sector} sector
   */
  register(id, sector) {
    this._map.set(id.value, sector);
  }

  /** @param {SectorID} id */
  unregister(id) {
    this._map.delete(id.value);
  }

  /** @param {SectorID} id @returns {import('../hierarchy/Sector.js').Sector|undefined} */
  get(id) {
    return this._map.get(id.value);
  }

  /** @param {SectorID} id @returns {boolean} */
  exists(id) {
    return this._map.has(id.value);
  }

  forEach(callback) {
    this._map.forEach((sector, key) => callback(sector, new SectorID(key)));
  }

  count() {
    return this._map.size;
  }
}
