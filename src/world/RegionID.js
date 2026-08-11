export class RegionID {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
    Object.freeze(this);
  }

  equals(other) {
    return other instanceof RegionID && this.value === other.value;
  }

  toString() {
    return `RegionID(${this.value})`;
  }
}
