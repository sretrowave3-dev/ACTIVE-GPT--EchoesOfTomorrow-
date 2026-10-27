// src/animation/assets/AnimationClip.js
import { Vector3 } from '../../framework/math/Vector3.js';
import { Quaternion } from '../../framework/math/Quaternion.js';

/**
 * Keyframed animation track data for a single bone or property.
 * @typedef {Object} AnimationTrack
 * @property {string} boneName
 * @property {'translation'|'rotation'|'scale'} property
 * @property {Float32Array} times Keyframe timestamps in seconds
 * @property {Float32Array} values Keyframe values (3 floats per key for vec3, 4 for quat)
 */

/**
 * AnimationClip stores a collection of keyframed tracks representing a single animation.
 * Conforms to EDD Chapter 12 (Animation System).
 */
export class AnimationClip {
  /**
   * @param {string} name
   * @param {number} duration Duration in seconds
   */
  constructor(name, duration = 1.0) {
    this.name = name;
    this.duration = Math.max(0.001, duration);
    /** @type {Map<string, AnimationTrack>} key is `boneName:property` */
    this.tracks = new Map();
  }

  /**
   * Add a translation track for a bone.
   * @param {string} boneName
   * @param {Float32Array} times
   * @param {Float32Array} values (x, y, z triplets)
   */
  addTranslationTrack(boneName, times, values) {
    this.tracks.set(`${boneName}:translation`, {
      boneName,
      property: 'translation',
      times,
      values
    });
  }

  /**
   * Add a rotation track for a bone.
   * @param {string} boneName
   * @param {Float32Array} times
   * @param {Float32Array} values (x, y, z, w quats)
   */
  addRotationTrack(boneName, times, values) {
    this.tracks.set(`${boneName}:rotation`, {
      boneName,
      property: 'rotation',
      times,
      values
    });
  }

  /**
   * Sample translation at normalized time t.
   * @param {string} boneName
   * @param {number} time
   * @param {Vector3} out
   * @returns {boolean} True if track exists and was sampled
   */
  sampleTranslation(boneName, time, out) {
    const track = this.tracks.get(`${boneName}:translation`);
    if (!track) return false;

    const t = Math.max(0, Math.min(this.duration, time));
    const times = track.times;
    const values = track.values;
    const count = times.length;

    if (count === 1 || t <= times[0]) {
      out.set(values[0], values[1], values[2]);
      return true;
    }
    if (t >= times[count - 1]) {
      const idx = (count - 1) * 3;
      out.set(values[idx], values[idx + 1], values[idx + 2]);
      return true;
    }

    // Binary search for keyframe segment
    let low = 0;
    let high = count - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (times[mid] <= t) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const i = Math.max(0, high);
    const t0 = times[i];
    const t1 = times[i + 1];
    const factor = (t - t0) / (t1 - t0);

    const i0 = i * 3;
    const i1 = (i + 1) * 3;
    out.set(
      values[i0] + (values[i1] - values[i0]) * factor,
      values[i0 + 1] + (values[i1 + 1] - values[i0 + 1]) * factor,
      values[i0 + 2] + (values[i1 + 2] - values[i0 + 2]) * factor
    );
    return true;
  }

  /**
   * Sample rotation at time t (Spherical Linear Interpolation).
   * @param {string} boneName
   * @param {number} time
   * @param {Quaternion} out
   * @returns {boolean} True if track exists and was sampled
   */
  sampleRotation(boneName, time, out) {
    const track = this.tracks.get(`${boneName}:rotation`);
    if (!track) return false;

    const t = Math.max(0, Math.min(this.duration, time));
    const times = track.times;
    const values = track.values;
    const count = times.length;

    if (count === 1 || t <= times[0]) {
      out.set(values[0], values[1], values[2], values[3]);
      return true;
    }
    if (t >= times[count - 1]) {
      const idx = (count - 1) * 4;
      out.set(values[idx], values[idx + 1], values[idx + 2], values[idx + 3]);
      return true;
    }

    let low = 0;
    let high = count - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (times[mid] <= t) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const i = Math.max(0, high);
    const t0 = times[i];
    const t1 = times[i + 1];
    const factor = (t - t0) / (t1 - t0);

    const i0 = i * 4;
    const i1 = (i + 1) * 4;

    // Simple normalized quaternion LERP fallback for fast execution
    let x = values[i0] + (values[i1] - values[i0]) * factor;
    let y = values[i0 + 1] + (values[i1 + 1] - values[i0 + 1]) * factor;
    let z = values[i0 + 2] + (values[i1 + 2] - values[i0 + 2]) * factor;
    let w = values[i0 + 3] + (values[i1 + 3] - values[i0 + 3]) * factor;
    const len = Math.hypot(x, y, z, w) || 1.0;
    out.set(x / len, y / len, z / len, w / len);
    return true;
  }
}
