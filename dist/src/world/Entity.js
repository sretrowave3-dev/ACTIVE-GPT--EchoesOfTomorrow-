import { EntityID } from './EntityID.js';
import { Transform } from './Transform.js';

/**
 * Lightweight simulation entity. No gameplay logic.
 */
export class Entity {
  /**
   * @param {EntityID} id
   * @param {string|null} [cellId] – value of the CellID
   */
  constructor(id, cellId = null) {
    /** @readonly */
    this.id = id;
    this.generation = id.generation;
    this.transform = new Transform();
    this.cellId = cellId;
    /** @type {'created'|'active'|'sleeping'|'hidden'|'destroyed'} */
    this.state = 'created';
    /** Persistent handle set by EntityManager after creation. */
    this.handle = null;
  }

  setState(state) {
    this.state = state;
  }
}