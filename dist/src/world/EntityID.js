/**
 * Unique numeric identifier with generation tracking.
 * Immutable once created.
 */
export class EntityID {
  /**
   * @param {number} id
   * @param {number} generation
   */
  constructor(id, generation = 0) {
    this.id = id;
    this.generation = generation;
    Object.freeze(this);
  }

  /**
   * Two IDs are equal if both id and generation match.
   * @param {EntityID} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof EntityID && this.id === other.id && this.generation === other.generation;
  }

  toString() {
    return `EntityID(${this.id}:${this.generation})`;
  }
}