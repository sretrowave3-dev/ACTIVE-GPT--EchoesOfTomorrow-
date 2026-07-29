<<<<<<< HEAD
import { CellID } from '../CellID.js';

export class CellRegistry {
  constructor() {
    /** @type {Map<string, import('../hierarchy/Cell.js').Cell>} */
    this._map = new Map();
  }

  /**
   * @param {CellID} id
   * @param {import('../hierarchy/Cell.js').Cell} cell
   */
  register(id, cell) {
    this._map.set(id.value, cell);
  }

  /** @param {CellID} id */
  unregister(id) {
    this._map.delete(id.value);
  }

  /** @param {CellID} id @returns {import('../hierarchy/Cell.js').Cell|undefined} */
  get(id) {
    return this._map.get(id.value);
  }

  /** @param {CellID} id @returns {boolean} */
  exists(id) {
    return this._map.has(id.value);
  }

  forEach(callback) {
    this._map.forEach((cell, key) => callback(cell, new CellID(key)));
  }

  count() {
    return this._map.size;
  }
=======
import { CellID } from '../CellID.js';

export class CellRegistry {
  constructor() {
    /** @type {Map<string, import('../hierarchy/Cell.js').Cell>} */
    this._map = new Map();
  }

  /**
   * @param {CellID} id
   * @param {import('../hierarchy/Cell.js').Cell} cell
   */
  register(id, cell) {
    this._map.set(id.value, cell);
  }

  /** @param {CellID} id */
  unregister(id) {
    this._map.delete(id.value);
  }

  /** @param {CellID} id @returns {import('../hierarchy/Cell.js').Cell|undefined} */
  get(id) {
    return this._map.get(id.value);
  }

  /** @param {CellID} id @returns {boolean} */
  exists(id) {
    return this._map.has(id.value);
  }

  forEach(callback) {
    this._map.forEach((cell, key) => callback(cell, new CellID(key)));
  }

  count() {
    return this._map.size;
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}