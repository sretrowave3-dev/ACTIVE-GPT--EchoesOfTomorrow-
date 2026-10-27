// src/physics/Raycast.js

/**
 * Fast 3D Raycasting against AABBs with surface normal computation.
 * Conforms to EDD Volume III (Physics & Spatial Pipeline).
 */
export class Ray {
  /**
   * @param {{ x: number, y: number, z: number }} origin
   * @param {{ x: number, y: number, z: number }} direction
   */
  constructor(origin = { x: 0, y: 0, z: 0 }, direction = { x: 0, y: 0, z: -1 }) {
    this.origin = { ...origin };
    this.direction = { ...direction };
    this.normalize();
  }

  normalize() {
    const len = Math.hypot(this.direction.x, this.direction.y, this.direction.z);
    if (len > 1e-6) {
      this.direction.x /= len;
      this.direction.y /= len;
      this.direction.z /= len;
    }
  }

  /**
   * Tests intersection against an AABB and computes contact point and surface normal.
   * @param {import('./AABB.js').AABB} aabb
   * @param {number} [maxDistance=Infinity]
   * @returns {{ hit: boolean, distance: number, point: { x: number, y: number, z: number }|null, normal: { x: number, y: number, z: number }|null }}
   */
  intersectAABB(aabb, maxDistance = Infinity) {
    let tmin = 0.0;
    let tmax = maxDistance;

    let normalX = 0;
    let normalY = 0;
    let normalZ = 0;

    // X axis slab
    if (Math.abs(this.direction.x) < 1e-6) {
      if (this.origin.x < aabb.min.x || this.origin.x > aabb.max.x) return { hit: false, distance: Infinity, point: null, normal: null };
    } else {
      const invD = 1.0 / this.direction.x;
      let t1 = (aabb.min.x - this.origin.x) * invD;
      let t2 = (aabb.max.x - this.origin.x) * invD;
      let sign = -1;

      if (t1 > t2) {
        const tmp = t1; t1 = t2; t2 = tmp;
        sign = 1;
      }

      if (t1 > tmin) {
        tmin = t1;
        normalX = sign; normalY = 0; normalZ = 0;
      }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return { hit: false, distance: Infinity, point: null, normal: null };
    }

    // Y axis slab
    if (Math.abs(this.direction.y) < 1e-6) {
      if (this.origin.y < aabb.min.y || this.origin.y > aabb.max.y) return { hit: false, distance: Infinity, point: null, normal: null };
    } else {
      const invD = 1.0 / this.direction.y;
      let t1 = (aabb.min.y - this.origin.y) * invD;
      let t2 = (aabb.max.y - this.origin.y) * invD;
      let sign = -1;

      if (t1 > t2) {
        const tmp = t1; t1 = t2; t2 = tmp;
        sign = 1;
      }

      if (t1 > tmin) {
        tmin = t1;
        normalX = 0; normalY = sign; normalZ = 0;
      }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return { hit: false, distance: Infinity, point: null, normal: null };
    }

    // Z axis slab
    if (Math.abs(this.direction.z) < 1e-6) {
      if (this.origin.z < aabb.min.z || this.origin.z > aabb.max.z) return { hit: false, distance: Infinity, point: null, normal: null };
    } else {
      const invD = 1.0 / this.direction.z;
      let t1 = (aabb.min.z - this.origin.z) * invD;
      let t2 = (aabb.max.z - this.origin.z) * invD;
      let sign = -1;

      if (t1 > t2) {
        const tmp = t1; t1 = t2; t2 = tmp;
        sign = 1;
      }

      if (t1 > tmin) {
        tmin = t1;
        normalX = 0; normalY = 0; normalZ = sign;
      }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return { hit: false, distance: Infinity, point: null, normal: null };
    }

    if (tmin < 0) return { hit: false, distance: Infinity, point: null, normal: null };

    return {
      hit: true,
      distance: tmin,
      point: {
        x: this.origin.x + this.direction.x * tmin,
        y: this.origin.y + this.direction.y * tmin,
        z: this.origin.z + this.direction.z * tmin
      },
      normal: { x: normalX, y: normalY, z: normalZ }
    };
  }
}
