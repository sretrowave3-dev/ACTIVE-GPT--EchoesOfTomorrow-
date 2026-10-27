// src/animation/skeleton/SkeletonPose.js
import { Vector3 } from '../../framework/math/Vector3.js';
import { Quaternion } from '../../framework/math/Quaternion.js';
import { Matrix4 } from '../../framework/math/Matrix4.js';

/**
 * Mutable per-instance runtime pose representing bone transforms for a Skeleton.
 * Conforms to EDD Chapter 12 (Animation System).
 */
export class SkeletonPose {
  /**
   * @param {import('./Skeleton.js').Skeleton} skeleton
   */
  constructor(skeleton) {
    this.skeleton = skeleton;
    this.boneCount = skeleton ? (skeleton.bonesById ? skeleton.bonesById.size : 0) : 0;

    /** @type {Map<string, { position: Vector3, rotation: Quaternion, scale: Vector3, worldMatrix: Matrix4 }>} */
    this.bones = new Map();

    if (skeleton && skeleton.bonesById) {
      for (const [id, bone] of skeleton.bonesById.entries()) {
        this.bones.set(id, {
          position: new Vector3(0, 0, 0),
          rotation: new Quaternion(0, 0, 0, 1),
          scale: new Vector3(1, 1, 1),
          worldMatrix: new Matrix4()
        });
      }
    }
  }

  /**
   * Reset all bones in the pose to default / bind pose.
   */
  reset() {
    for (const transform of this.bones.values()) {
      transform.position.set(0, 0, 0);
      transform.rotation.set(0, 0, 0, 1);
      transform.scale.set(1, 1, 1);
      transform.worldMatrix.identity();
    }
  }

  /**
   * Update world matrices down the skeletal hierarchy.
   */
  updateWorldMatrices() {
    if (!this.skeleton || !this.skeleton.roots) return;

    for (const root of this.skeleton.roots) {
      this._updateSubtree(root, null);
    }
  }

  /** @private */
  _updateSubtree(bone, parentWorldMatrix) {
    const transform = this.bones.get(bone.id);
    if (!transform) return;

    // Compose local transform matrix
    transform.worldMatrix.compose(transform.position, transform.rotation, transform.scale);

    if (parentWorldMatrix) {
      transform.worldMatrix.multiplyMatrices(parentWorldMatrix, transform.worldMatrix);
    }

    if (bone.children) {
      for (const child of bone.children) {
        this._updateSubtree(child, transform.worldMatrix);
      }
    }
  }
}
