import { CellID } from '../world/CellID.js';

export class Cell {
  /**
   * @param {CellID} id
   */
  constructor(id) {
    /** @readonly */
    this.id = id;
    /**
     * Entity numeric IDs (not full EntityID objects) for lightweight storage.
     * @type {number[]}
     */
    this.entityIDs = [];
  }

  /**
   * @param {number} entityIdNum
   */
  addEntity(entityIdNum) {
    if (!this.entityIDs.includes(entityIdNum)) {
      this.entityIDs.push(entityIdNum);
    }
  }

  /**
   * @param {number} entityIdNum
   */
  removeEntity(entityIdNum) {
    this.entityIDs = this.entityIDs.filter(id => id !== entityIdNum);
  }
}