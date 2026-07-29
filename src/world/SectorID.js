<<<<<<< HEAD
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
=======
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
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}