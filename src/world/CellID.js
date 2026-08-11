export class CellID {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
    Object.freeze(this);
  }

  equals(other) {
    return other instanceof CellID && this.value === other.value;
  }

  toString() {
    return `CellID(${this.value})`;
  }
}
