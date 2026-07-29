<<<<<<< HEAD
import { RegionID } from '../RegionID.js';

export class RegionRegistry {
  constructor() {
    /** @type {Map<string, import('../hierarchy/Region.js').Region>} */
    this._map = new Map();
  }

  /**
   * @param {RegionID} id
   * @param {import('../hierarchy/Region.js').Region} region
   */
  register(id, region) {
    this._map.set(id.value, region);
  }

  /** @param {RegionID} id */
  unregister(id) {
    this._map.delete(id.value);
  }

  /** @param {RegionID} id @returns {import('../hierarchy/Region.js').Region|undefined} */
  get(id) {
    return this._map.get(id.value);
  }

  /** @param {RegionID} id @returns {boolean} */
  exists(id) {
    return this._map.has(id.value);
  }

  /**
   * @param {(region: import('../hierarchy/Region.js').Region, id: RegionID) => void} callback
   */
  forEach(callback) {
    this._map.forEach((region, key) => callback(region, new RegionID(key)));
  }

  /** @returns {number} */
  count() {
    return this._map.size;
  }
=======
import { RegionID } from '../RegionID.js';

export class RegionRegistry {
  constructor() {
    /** @type {Map<string, import('../hierarchy/Region.js').Region>} */
    this._map = new Map();
  }

  /**
   * @param {RegionID} id
   * @param {import('../hierarchy/Region.js').Region} region
   */
  register(id, region) {
    this._map.set(id.value, region);
  }

  /** @param {RegionID} id */
  unregister(id) {
    this._map.delete(id.value);
  }

  /** @param {RegionID} id @returns {import('../hierarchy/Region.js').Region|undefined} */
  get(id) {
    return this._map.get(id.value);
  }

  /** @param {RegionID} id @returns {boolean} */
  exists(id) {
    return this._map.has(id.value);
  }

  /**
   * @param {(region: import('../hierarchy/Region.js').Region, id: RegionID) => void} callback
   */
  forEach(callback) {
    this._map.forEach((region, key) => callback(region, new RegionID(key)));
  }

  /** @returns {number} */
  count() {
    return this._map.size;
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}