/**
 * Sparse set: maps entity IDs (numbers) to dense indices, with O(1) operations.
 */
export class SparseSet {
  constructor() {
    /** @type {Map<number, number>} sparse: entityId -> index in dense */
    this.sparse = new Map();
    /** @type {number[]} dense: stores entityIds */
    this.dense = [];
    /** @type {any[]} components: parallel array to dense, holds component data */
    this.components = [];
  }

  /**
   * Add an entity with its component data.
   * @param {number} entityId
   * @param {*} component
   */
  add(entityId, component) {
    if (this.sparse.has(entityId)) {
      const idx = this.sparse.get(entityId);
      this.components[idx] = component;
      return;
    }
    const idx = this.dense.length;
    this.sparse.set(entityId, idx);
    this.dense.push(entityId);
    this.components.push(component);
  }

  /**
   * Remove an entity.
   * @param {number} entityId
   */
  remove(entityId) {
    if (!this.sparse.has(entityId)) return;
    const idx = this.sparse.get(entityId);
    const lastIdx = this.dense.length - 1;
    if (idx !== lastIdx) {
      const lastEntity = this.dense[lastIdx];
      this.sparse.set(lastEntity, idx);
      this.dense[idx] = lastEntity;
      this.components[idx] = this.components[lastIdx];
    }
    this.dense.pop();
    this.components.pop();
    this.sparse.delete(entityId);
  }

  /**
   * Check if entity exists in this set.
   * @param {number} entityId
   * @returns {boolean}
   */
  has(entityId) {
    return this.sparse.has(entityId);
  }

  /**
   * Get component for entity.
   * @param {number} entityId
   * @returns {*|undefined}
   */
  get(entityId) {
    const idx = this.sparse.get(entityId);
    return idx !== undefined ? this.components[idx] : undefined;
  }

  /** Remove all entities. */
  clear() {
    this.sparse.clear();
    this.dense.length = 0;
    this.components.length = 0;
  }

  /** @returns {number} */
  get size() {
    return this.dense.length;
  }

  /**
   * Iterate over all entity-component pairs.
   * @param {(entityId: number, component: *) => void} callback
   */
  forEach(callback) {
    for (let i = 0; i < this.dense.length; i++) {
      callback(this.dense[i], this.components[i]);
    }
  }
}