/**
 * Bitmask signature supporting up to 128 component types (two 32-bit words).
 */
export class EntitySignature {
  constructor() {
    /** @type {number[]} two 32-bit integers */
    this.mask = [0, 0];
  }

  /**
   * Add a component type.
   * @param {number} typeId – component type index (0-127)
   */
  add(typeId) {
    const word = typeId < 32 ? 0 : 1;
    const bit = typeId % 32;
    this.mask[word] |= (1 << bit);
  }

  /**
   * Remove a component type.
   * @param {number} typeId
   */
  remove(typeId) {
    const word = typeId < 32 ? 0 : 1;
    const bit = typeId % 32;
    this.mask[word] &= ~(1 << bit);
  }

  /**
   * Check if a component type is present.
   * @param {number} typeId
   * @returns {boolean}
   */
  has(typeId) {
    const word = typeId < 32 ? 0 : 1;
    const bit = typeId % 32;
    return (this.mask[word] & (1 << bit)) !== 0;
  }

  /**
   * Check if this signature contains all the required components.
   * @param {EntitySignature} required
   * @returns {boolean}
   */
  matches(required) {
    return (this.mask[0] & required.mask[0]) === required.mask[0] &&
           (this.mask[1] & required.mask[1]) === required.mask[1];
  }

  /** Clear all bits. */
  clear() {
    this.mask[0] = 0;
    this.mask[1] = 0;
  }

  /**
   * Clone this signature.
   * @returns {EntitySignature}
   */
  clone() {
    const sig = new EntitySignature();
    sig.mask[0] = this.mask[0];
    sig.mask[1] = this.mask[1];
    return sig;
  }
}