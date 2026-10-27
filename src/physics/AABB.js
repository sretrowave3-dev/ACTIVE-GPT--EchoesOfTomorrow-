// src/physics/AABB.js

/**
 * High-performance 3D Axis-Aligned Bounding Box (AABB) container and intersection solver.
 * Designed to avoid per-frame allocations on hot paths.
 */
export class AABB {
  /**
   * @param {{ x: number, y: number, z: number }} [min]
   * @param {{ x: number, y: number, z: number }} [max]
   */
  constructor(
    min = { x: -Infinity, y: -Infinity, z: -Infinity },
    max = { x: Infinity, y: Infinity, z: Infinity }
  ) {
    this.min = { x: min.x, y: min.y, z: min.z };
    this.max = { x: max.x, y: max.y, z: max.z };
  }

  set(minX, minY, minZ, maxX, maxY, maxZ) {
    this.min.x = minX;
    this.min.y = minY;
    this.min.z = minZ;
    this.max.x = maxX;
    this.max.y = maxY;
    this.max.z = maxZ;
    return this;
  }

  fromCenterAndSize(center, size) {
    const hx = size.x * 0.5;
    const hy = size.y * 0.5;
    const hz = size.z * 0.5;
    this.min.x = center.x - hx;
    this.min.y = center.y - hy;
    this.min.z = center.z - hz;
    this.max.x = center.x + hx;
    this.max.y = center.y + hy;
    this.max.z = center.z + hz;
    return this;
  }

  intersectsAABB(other) {
    return !(
      this.max.x < other.min.x || this.min.x > other.max.x ||
      this.max.y < other.min.y || this.min.y > other.max.y ||
      this.max.z < other.min.z || this.min.z > other.max.z
    );
  }

  containsPoint(point) {
    return (
      point.x >= this.min.x && point.x <= this.max.x &&
      point.y >= this.min.y && point.y <= this.max.y &&
      point.z >= this.min.z && point.z <= this.max.z
    );
  }

  /**
   * Computes minimum translation vector (MTV) to resolve penetration of `this` out of `other`.
   * @param {AABB} other
   * @param {{ x: number, y: number, z: number }} out
   * @returns {boolean} True if penetrating, false otherwise
   */
  computePenetration(other, out) {
    if (!this.intersectsAABB(other)) {
      out.x = 0;
      out.y = 0;
      out.z = 0;
      return false;
    }

    const dx1 = other.max.x - this.min.x;
    const dx2 = this.max.x - other.min.x;
    const dy1 = other.max.y - this.min.y;
    const dy2 = this.max.y - other.min.y;
    const dz1 = other.max.z - this.min.z;
    const dz2 = this.max.z - other.min.z;

    const minX = dx1 < dx2 ? dx1 : -dx2;
    const minY = dy1 < dy2 ? dy1 : -dy2;
    const minZ = dz1 < dz2 ? dz1 : -dz2;

    const absX = Math.abs(minX);
    const absY = Math.abs(minY);
    const absZ = Math.abs(minZ);

    if (absX <= absY && absX <= absZ) {
      out.x = minX;
      out.y = 0;
      out.z = 0;
    } else if (absY <= absX && absY <= absZ) {
      out.x = 0;
      out.y = minY;
      out.z = 0;
    } else {
      out.x = 0;
      out.y = 0;
      out.z = minZ;
    }

    return true;
  }
}
