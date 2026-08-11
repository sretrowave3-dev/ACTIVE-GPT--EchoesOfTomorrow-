import { SectorID } from '../world/SectorID.js';

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
    /** @type {{x: number, y: number, z: number}} world-space origin offset */
    this.worldOrigin = { x: 0, y: 0, z: 0 };
  }

  /**
   * Set the world-space origin offset for this sector.
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   */
  setWorldOrigin(x, y, z) {
    this.worldOrigin.x = x;
    this.worldOrigin.y = y;
    this.worldOrigin.z = z;
  }

  /**
   * Convert a sector-local position to an absolute world position.
   * @param {{x: number, y: number, z: number}} localPosition
   * @returns {{x: number, y: number, z: number}} new absolute position object
   */
  toWorldPosition(localPosition) {
    return {
      x: this.worldOrigin.x + localPosition.x,
      y: this.worldOrigin.y + localPosition.y,
      z: this.worldOrigin.z + localPosition.z
    };
  }

  /**
   * Convert an absolute world position to a sector-local position.
   * @param {{x: number, y: number, z: number}} worldPosition
   * @returns {{x: number, y: number, z: number}} new local position object
   */
  toLocalPosition(worldPosition) {
    return {
      x: worldPosition.x - this.worldOrigin.x,
      y: worldPosition.y - this.worldOrigin.y,
      z: worldPosition.z - this.worldOrigin.z
    };
  }
}