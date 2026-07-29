/**
 * src/framework/math/TransformInterpolator.js
 *
 * Echo Engine — Math Library
 *
 * Static interpolation algorithms for Transforms.
 *
 * This class is a pure algorithm container. It has no constructor,
 * no instance state, and no member variables. All methods are static.
 *
 * Responsibilities:
 * - lerp(): Default transform interpolation (position/scale lerp, rotation slerp)
 * - nlerp(): Normalized linear interpolation (position/scale lerp, rotation nlerp)
 * - slerp(): Spherical interpolation (position/scale lerp, rotation slerp)
 *
 * Design Principles:
 * - Pure Functions: Deterministic, no side effects
 * - Zero Allocations: Output parameters for all operations
 * - No Instance State: All methods are static
 * - Numerical Stability: Clamping, epsilon checks, normalize rotation after interpolation
 *
 * Performance:
 * - All operations use local scalar variables only
 * - No heap allocations in any method (output parameters)
 * - Minimal floating-point operations
 *
 * Ownership:
 * - Inputs are read-only
 * - Outputs are written into by the caller
 * - No references are stored
 */

import { Transform } from './Transform.js';

export class TransformInterpolator {
    /**
     * Default transform interpolation between two transforms.
     *
     * This is the engine's standard interpolation method.
     * Position and scale use linear interpolation (lerp).
     * Rotation uses spherical linear interpolation (slerp) for smooth, constant-speed rotation.
     *
     * @param {Transform} from - Starting transform
     * @param {Transform} to - Target transform
     * @param {number} t - Interpolation factor (0-1)
     * @param {Transform} out - Output transform
     * @throws {TypeError} If inputs are invalid
     */
    static lerp(from, to, t, out) {
        // ---- Duck-type validation ----
        if (!from || typeof from._position === 'undefined' ||
            typeof from._rotation === 'undefined' || typeof from._scale === 'undefined') {
            throw new TypeError('lerp(): from must be a valid Transform instance');
        }
        if (!to || typeof to._position === 'undefined' ||
            typeof to._rotation === 'undefined' || typeof to._scale === 'undefined') {
            throw new TypeError('lerp(): to must be a valid Transform instance');
        }
        if (typeof t !== 'number' || t < 0 || t > 1) {
            throw new TypeError('lerp(): t must be a number between 0 and 1');
        }
        if (!out || typeof out._position === 'undefined' ||
            typeof out._rotation === 'undefined' || typeof out._scale === 'undefined') {
            throw new TypeError('lerp(): out must be a valid Transform instance');
        }

        const clampT = Math.max(0, Math.min(1, t));

        // ---- Interpolate position (lerp) ----
        out._position.x = from._position.x + (to._position.x - from._position.x) * clampT;
        out._position.y = from._position.y + (to._position.y - from._position.y) * clampT;
        out._position.z = from._position.z + (to._position.z - from._position.z) * clampT;

        // ---- Interpolate rotation (slerp) ----
        const q1x = from._rotation.x, q1y = from._rotation.y,
              q1z = from._rotation.z, q1w = from._rotation.w;
        const q2x = to._rotation.x, q2y = to._rotation.y,
              q2z = to._rotation.z, q2w = to._rotation.w;

        let dot = q1x * q2x + q1y * q2y + q1z * q2z + q1w * q2w;
        let qx = q2x, qy = q2y, qz = q2z, qw = q2w;

        if (dot < 0) {
            dot = -dot;
            qx = -q2x;
            qy = -q2y;
            qz = -q2z;
            qw = -q2w;
        }

        let outX, outY, outZ, outW;

        if (dot > 0.999999) {
            outX = q1x + (qx - q1x) * clampT;
            outY = q1y + (qy - q1y) * clampT;
            outZ = q1z + (qz - q1z) * clampT;
            outW = q1w + (qw - q1w) * clampT;
        } else {
            const theta = Math.acos(dot);
            const sinTheta = Math.sin(theta);
            const invSinTheta = 1 / sinTheta;
            const t1 = Math.sin((1 - clampT) * theta) * invSinTheta;
            const t2 = Math.sin(clampT * theta) * invSinTheta;

            outX = q1x * t1 + qx * t2;
            outY = q1y * t1 + qy * t2;
            outZ = q1z * t1 + qz * t2;
            outW = q1w * t1 + qw * t2;
        }

        const lenSq = outX * outX + outY * outY + outZ * outZ + outW * outW;
        if (lenSq > 0) {
            const invLen = 1 / Math.sqrt(lenSq);
            out._rotation.x = outX * invLen;
            out._rotation.y = outY * invLen;
            out._rotation.z = outZ * invLen;
            out._rotation.w = outW * invLen;
        } else {
            out._rotation.identity();
        }

        // ---- Interpolate scale (lerp) ----
        out._scale.x = from._scale.x + (to._scale.x - from._scale.x) * clampT;
        out._scale.y = from._scale.y + (to._scale.y - from._scale.y) * clampT;
        out._scale.z = from._scale.z + (to._scale.z - from._scale.z) * clampT;

        out.markDirty();
    }

    /**
     * Normalized linear interpolation between two transforms.
     *
     * Position and scale use linear interpolation (lerp).
     * Rotation uses normalized linear interpolation (nlerp): linear interpolation
     * followed by normalization. This is faster than slerp but may not maintain
     * constant angular velocity.
     *
     * @param {Transform} from - Starting transform
     * @param {Transform} to - Target transform
     * @param {number} t - Interpolation factor (0-1)
     * @param {Transform} out - Output transform
     * @throws {TypeError} If inputs are invalid
     */
    static nlerp(from, to, t, out) {
        // ---- Duck-type validation ----
        if (!from || typeof from._position === 'undefined' ||
            typeof from._rotation === 'undefined' || typeof from._scale === 'undefined') {
            throw new TypeError('nlerp(): from must be a valid Transform instance');
        }
        if (!to || typeof to._position === 'undefined' ||
            typeof to._rotation === 'undefined' || typeof to._scale === 'undefined') {
            throw new TypeError('nlerp(): to must be a valid Transform instance');
        }
        if (typeof t !== 'number' || t < 0 || t > 1) {
            throw new TypeError('nlerp(): t must be a number between 0 and 1');
        }
        if (!out || typeof out._position === 'undefined' ||
            typeof out._rotation === 'undefined' || typeof out._scale === 'undefined') {
            throw new TypeError('nlerp(): out must be a valid Transform instance');
        }

        const clampT = Math.max(0, Math.min(1, t));

        // ---- Interpolate position (lerp) ----
        out._position.x = from._position.x + (to._position.x - from._position.x) * clampT;
        out._position.y = from._position.y + (to._position.y - from._position.y) * clampT;
        out._position.z = from._position.z + (to._position.z - from._position.z) * clampT;

        // ---- Interpolate rotation (nlerp) ----
        const q1x = from._rotation.x, q1y = from._rotation.y,
              q1z = from._rotation.z, q1w = from._rotation.w;
        const q2x = to._rotation.x, q2y = to._rotation.y,
              q2z = to._rotation.z, q2w = to._rotation.w;

        let dot = q1x * q2x + q1y * q2y + q1z * q2z + q1w * q2w;
        let qx = q2x, qy = q2y, qz = q2z, qw = q2w;

        if (dot < 0) {
            qx = -q2x;
            qy = -q2y;
            qz = -q2z;
            qw = -q2w;
        }

        // Linear interpolation
        let outX = q1x + (qx - q1x) * clampT;
        let outY = q1y + (qy - q1y) * clampT;
        let outZ = q1z + (qz - q1z) * clampT;
        let outW = q1w + (qw - q1w) * clampT;

        // Normalize
        const lenSq = outX * outX + outY * outY + outZ * outZ + outW * outW;
        if (lenSq > 0) {
            const invLen = 1 / Math.sqrt(lenSq);
            out._rotation.x = outX * invLen;
            out._rotation.y = outY * invLen;
            out._rotation.z = outZ * invLen;
            out._rotation.w = outW * invLen;
        } else {
            out._rotation.identity();
        }

        // ---- Interpolate scale (lerp) ----
        out._scale.x = from._scale.x + (to._scale.x - from._scale.x) * clampT;
        out._scale.y = from._scale.y + (to._scale.y - from._scale.y) * clampT;
        out._scale.z = from._scale.z + (to._scale.z - from._scale.z) * clampT;

        out.markDirty();
    }

    /**
     * Spherical linear interpolation between two transforms.
     *
     * Position and scale use linear interpolation (lerp).
     * Rotation uses spherical linear interpolation (slerp).
     *
     * This method provides the same rotation interpolation as lerp(),
     * but is included for symmetry and for cases where callers want
     * to explicitly express slerp intent in their code.
     *
     * @param {Transform} from - Starting transform
     * @param {Transform} to - Target transform
     * @param {number} t - Interpolation factor (0-1)
     * @param {Transform} out - Output transform
     * @throws {TypeError} If inputs are invalid
     */
    static slerp(from, to, t, out) {
        // ---- Duck-type validation ----
        if (!from || typeof from._position === 'undefined' ||
            typeof from._rotation === 'undefined' || typeof from._scale === 'undefined') {
            throw new TypeError('slerp(): from must be a valid Transform instance');
        }
        if (!to || typeof to._position === 'undefined' ||
            typeof to._rotation === 'undefined' || typeof to._scale === 'undefined') {
            throw new TypeError('slerp(): to must be a valid Transform instance');
        }
        if (typeof t !== 'number' || t < 0 || t > 1) {
            throw new TypeError('slerp(): t must be a number between 0 and 1');
        }
        if (!out || typeof out._position === 'undefined' ||
            typeof out._rotation === 'undefined' || typeof out._scale === 'undefined') {
            throw new TypeError('slerp(): out must be a valid Transform instance');
        }

        const clampT = Math.max(0, Math.min(1, t));

        // ---- Interpolate position (lerp) ----
        out._position.x = from._position.x + (to._position.x - from._position.x) * clampT;
        out._position.y = from._position.y + (to._position.y - from._position.y) * clampT;
        out._position.z = from._position.z + (to._position.z - from._position.z) * clampT;

        // ---- Interpolate rotation (slerp) ----
        const q1x = from._rotation.x, q1y = from._rotation.y,
              q1z = from._rotation.z, q1w = from._rotation.w;
        const q2x = to._rotation.x, q2y = to._rotation.y,
              q2z = to._rotation.z, q2w = to._rotation.w;

        let dot = q1x * q2x + q1y * q2y + q1z * q2z + q1w * q2w;
        let qx = q2x, qy = q2y, qz = q2z, qw = q2w;

        if (dot < 0) {
            dot = -dot;
            qx = -q2x;
            qy = -q2y;
            qz = -q2z;
            qw = -q2w;
        }

        let outX, outY, outZ, outW;

        if (dot > 0.999999) {
            outX = q1x + (qx - q1x) * clampT;
            outY = q1y + (qy - q1y) * clampT;
            outZ = q1z + (qz - q1z) * clampT;
            outW = q1w + (qw - q1w) * clampT;
        } else {
            const theta = Math.acos(dot);
            const sinTheta = Math.sin(theta);
            const invSinTheta = 1 / sinTheta;
            const t1 = Math.sin((1 - clampT) * theta) * invSinTheta;
            const t2 = Math.sin(clampT * theta) * invSinTheta;

            outX = q1x * t1 + qx * t2;
            outY = q1y * t1 + qy * t2;
            outZ = q1z * t1 + qz * t2;
            outW = q1w * t1 + qw * t2;
        }

        const lenSq = outX * outX + outY * outY + outZ * outZ + outW * outW;
        if (lenSq > 0) {
            const invLen = 1 / Math.sqrt(lenSq);
            out._rotation.x = outX * invLen;
            out._rotation.y = outY * invLen;
            out._rotation.z = outZ * invLen;
            out._rotation.w = outW * invLen;
        } else {
            out._rotation.identity();
        }

        // ---- Interpolate scale (lerp) ----
        out._scale.x = from._scale.x + (to._scale.x - from._scale.x) * clampT;
        out._scale.y = from._scale.y + (to._scale.y - from._scale.y) * clampT;
        out._scale.z = from._scale.z + (to._scale.z - from._scale.z) * clampT;

        out.markDirty();
    }
}