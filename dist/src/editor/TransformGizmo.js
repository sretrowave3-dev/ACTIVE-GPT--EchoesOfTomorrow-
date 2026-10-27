// src/editor/TransformGizmo.js

/**
 * @fileoverview TransformGizmo provides 3D viewport spatial manipulation
 * for Translation (W), Rotation (E), and Scale (R) with grid snapping and
 * coordinate space switching (World vs Local), matching Unreal Engine viewport standards.
 */

export const GizmoMode = {
  TRANSLATE: 'TRANSLATE',
  ROTATE: 'ROTATE',
  SCALE: 'SCALE'
};

export const CoordinateSpace = {
  WORLD: 'WORLD',
  LOCAL: 'LOCAL'
};

export class TransformGizmo {
  constructor() {
    this.mode = GizmoMode.TRANSLATE;
    this.space = CoordinateSpace.WORLD;

    this.snappingEnabled = false;
    this.gridStep = 0.5; // Grid snap step in meters
    this.angleStepDeg = 15; // Rotation snap step in degrees
    this.scaleStep = 0.1;

    this.activeAxis = null; // 'x' | 'y' | 'z' | 'xyz' | null
    this.isDragging = false;
  }

  /**
   * Set gizmo transformation mode.
   * @param {'TRANSLATE'|'ROTATE'|'SCALE'} mode
   */
  setMode(mode) {
    if (Object.values(GizmoMode).includes(mode)) {
      this.mode = mode;
    }
  }

  /**
   * Set coordinate space.
   * @param {'WORLD'|'LOCAL'} space
   */
  setSpace(space) {
    if (Object.values(CoordinateSpace).includes(space)) {
      this.space = space;
    }
  }

  /**
   * Configure spatial snapping.
   * @param {boolean} enabled
   * @param {number} [gridStep]
   * @param {number} [angleStepDeg]
   * @param {number} [scaleStep]
   */
  configureSnapping(enabled, gridStep = 0.5, angleStepDeg = 15, scaleStep = 0.1) {
    this.snappingEnabled = enabled;
    this.gridStep = Math.max(0.01, gridStep);
    this.angleStepDeg = Math.max(1, angleStepDeg);
    this.scaleStep = Math.max(0.01, scaleStep);
  }

  /**
   * Apply a transform delta along the active axis to a target transform object.
   *
   * @param {string} axis - 'x' | 'y' | 'z'
   * @param {number} rawDelta - Continuous delta value from pointer drag
   * @param {Object} target - Target transform { position, rotation, scale }
   * @returns {{ modified: boolean, deltaApplied: number }}
   */
  applyDelta(axis, rawDelta, target) {
    if (!target) return { modified: false, deltaApplied: 0 };

    let delta = rawDelta;

    if (this.mode === GizmoMode.TRANSLATE) {
      if (this.snappingEnabled && this.gridStep > 0) {
        delta = Math.round(delta / this.gridStep) * this.gridStep;
      }
      if (!target.position) target.position = { x: 0, y: 0, z: 0 };
      target.position[axis] = (target.position[axis] || 0) + delta;
      return { modified: true, deltaApplied: delta };
    }

    if (this.mode === GizmoMode.ROTATE) {
      if (this.snappingEnabled && this.angleStepDeg > 0) {
        delta = Math.round(delta / this.angleStepDeg) * this.angleStepDeg;
      }
      if (!target.rotation) target.rotation = { x: 0, y: 0, z: 0 };
      target.rotation[axis] = (target.rotation[axis] || 0) + delta;
      return { modified: true, deltaApplied: delta };
    }

    if (this.mode === GizmoMode.SCALE) {
      if (this.snappingEnabled && this.scaleStep > 0) {
        delta = Math.round(delta / this.scaleStep) * this.scaleStep;
      }
      if (!target.scale) target.scale = { x: 1, y: 1, z: 1 };
      target.scale[axis] = Math.max(0.001, (target.scale[axis] || 1) + delta);
      return { modified: true, deltaApplied: delta };
    }

    return { modified: false, deltaApplied: 0 };
  }
}
