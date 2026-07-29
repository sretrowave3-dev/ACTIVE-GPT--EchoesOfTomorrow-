<<<<<<< HEAD
/**
 * Pure‑math transform with no Three.js dependency.
 * Position, rotation, and scale stored as plain objects.
 */
export class Transform {
  constructor() {
    /** @type {{x: number, y: number, z: number}} */
    this.position = { x: 0, y: 0, z: 0 };
    /** Euler rotation in radians @type {{x: number, y: number, z: number}} */
    this.rotation = { x: 0, y: 0, z: 0 };
    /** @type {{x: number, y: number, z: number}} */
    this.scale = { x: 1, y: 1, z: 1 };
  }

  copy(other) {
    this.position.x = other.position.x;
    this.position.y = other.position.y;
    this.position.z = other.position.z;
    this.rotation.x = other.rotation.x;
    this.rotation.y = other.rotation.y;
    this.rotation.z = other.rotation.z;
    this.scale.x = other.scale.x;
    this.scale.y = other.scale.y;
    this.scale.z = other.scale.z;
  }

  setPosition(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
  }

  setRotation(x, y, z) {
    this.rotation.x = x;
    this.rotation.y = y;
    this.rotation.z = z;
  }

  setScale(x, y, z) {
    this.scale.x = x;
    this.scale.y = y;
    this.scale.z = z;
  }
=======
/**
 * Pure‑math transform with no Three.js dependency.
 * Position, rotation, and scale stored as plain objects.
 */
export class Transform {
  constructor() {
    /** @type {{x: number, y: number, z: number}} */
    this.position = { x: 0, y: 0, z: 0 };
    /** Euler rotation in radians @type {{x: number, y: number, z: number}} */
    this.rotation = { x: 0, y: 0, z: 0 };
    /** @type {{x: number, y: number, z: number}} */
    this.scale = { x: 1, y: 1, z: 1 };
  }

  copy(other) {
    this.position.x = other.position.x;
    this.position.y = other.position.y;
    this.position.z = other.position.z;
    this.rotation.x = other.rotation.x;
    this.rotation.y = other.rotation.y;
    this.rotation.z = other.rotation.z;
    this.scale.x = other.scale.x;
    this.scale.y = other.scale.y;
    this.scale.z = other.scale.z;
  }

  setPosition(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
  }

  setRotation(x, y, z) {
    this.rotation.x = x;
    this.rotation.y = y;
    this.rotation.z = z;
  }

  setScale(x, y, z) {
    this.scale.x = x;
    this.scale.y = y;
    this.scale.z = z;
  }
>>>>>>> 2f42efe7e19574d94df56c89784f42d3d4e2c85a
}