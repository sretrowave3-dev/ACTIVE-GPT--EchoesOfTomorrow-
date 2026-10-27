// src/physics/CollisionWorld.js
import { AABB } from './AABB.js';

/**
 * CollisionWorld manages static environmental boundaries and dynamic collision testing.
 * Conforms to EDD Chapter 15 §4 (Physics & Collision World).
 */
export class CollisionWorld {
  constructor() {
    /** @type {Map<string|number, { aabb: AABB, layer: number, isTrigger: boolean }>} @private */
    this._staticColliders = new Map();

    // Reusable scratch objects to eliminate per-frame allocations
    this._scratchPen = { x: 0, y: 0, z: 0 };
    this._scratchAABB = new AABB();
  }

  /**
   * Register a static axis-aligned collision box (e.g. wall, floor, pillar).
   * @param {string|number} id
   * @param {{ x: number, y: number, z: number }} center
   * @param {{ x: number, y: number, z: number }} size
   * @param {number} [layer=1]
   * @param {boolean} [isTrigger=false]
   */
  addStaticBox(id, center, size, layer = 1, isTrigger = false) {
    const aabb = new AABB().fromCenterAndSize(center, size);
    this._staticColliders.set(id, { aabb, layer, isTrigger });
  }

  /**
   * Remove a static collider by ID.
   * @param {string|number} id
   */
  removeStatic(id) {
    this._staticColliders.delete(id);
  }

  /**
   * Tests an AABB against all static colliders and resolves penetration.
   * @param {AABB} movingAABB
   * @param {{ x: number, y: number, z: number }} displacementOut Vector updated with required correction
   * @param {string|number|null} [ignoreId=null]
   * @returns {boolean} True if any collision occurred
   */
  resolveStaticCollision(movingAABB, displacementOut, ignoreId = null) {
    displacementOut.x = 0;
    displacementOut.y = 0;
    displacementOut.z = 0;

    let hasCollision = false;

    for (const [id, collider] of this._staticColliders.entries()) {
      if (id === ignoreId || collider.isTrigger) continue;

      if (movingAABB.computePenetration(collider.aabb, this._scratchPen)) {
        hasCollision = true;
        // Apply correction to the moving AABB so subsequent tests take previous resolution into account
        movingAABB.min.x += this._scratchPen.x;
        movingAABB.max.x += this._scratchPen.x;
        movingAABB.min.y += this._scratchPen.y;
        movingAABB.max.y += this._scratchPen.y;
        movingAABB.min.z += this._scratchPen.z;
        movingAABB.max.z += this._scratchPen.z;

        displacementOut.x += this._scratchPen.x;
        displacementOut.y += this._scratchPen.y;
        displacementOut.z += this._scratchPen.z;
      }
    }

    return hasCollision;
  }

  /**
   * Performs a raycast against all static bounding boxes.
   * @param {{ x: number, y: number, z: number }} origin
   * @param {{ x: number, y: number, z: number }} dir Normalized direction
   * @param {number} maxDist
   * @returns {{ hit: boolean, distance: number, id: any }|null}
   */
  raycast(origin, dir, maxDist = 100) {
    let closestDist = maxDist;
    let hitId = null;

    for (const [id, collider] of this._staticColliders.entries()) {
      if (collider.isTrigger) continue;
      const t = this._intersectRayAABB(origin, dir, collider.aabb);
      if (t !== null && t >= 0 && t < closestDist) {
        closestDist = t;
        hitId = id;
      }
    }

    if (hitId !== null) {
      return { hit: true, distance: closestDist, id: hitId };
    }
    return null;
  }

  /**
   * Ray-AABB intersection slab method.
   * @private
   */
  _intersectRayAABB(origin, dir, aabb) {
    let tmin = -Infinity;
    let tmax = Infinity;

    const axes = ['x', 'y', 'z'];
    for (let i = 0; i < 3; i++) {
      const axis = axes[i];
      if (Math.abs(dir[axis]) < 1e-8) {
        if (origin[axis] < aabb.min[axis] || origin[axis] > aabb.max[axis]) {
          return null;
        }
      } else {
        const invD = 1.0 / dir[axis];
        let t1 = (aabb.min[axis] - origin[axis]) * invD;
        let t2 = (aabb.max[axis] - origin[axis]) * invD;
        if (t1 > t2) {
          const tmp = t1; t1 = t2; t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return null;
      }
    }
    return tmin >= 0 ? tmin : (tmax >= 0 ? tmax : null);
  }

  /** Clear all colliders. */
  clear() {
    this._staticColliders.clear();
  }
}
