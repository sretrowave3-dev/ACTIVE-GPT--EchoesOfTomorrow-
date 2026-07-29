<<<<<<< HEAD
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
=======
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
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}