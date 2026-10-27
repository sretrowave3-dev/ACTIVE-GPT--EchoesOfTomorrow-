export class SectorID {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
    Object.freeze(this);
  }

  equals(other) {
    return other instanceof SectorID && this.value === other.value;
  }

  toString() {
    return `SectorID(${this.value})`;
  }
}
