/**
 * src/framework/math/TransformAlgorithms.js
 *
 * Echo Engine — Math Library
 *
 * Stateless mathematical utilities for Transform operations.
 *
 * This class is a pure algorithm container. It has no constructor,
 * no instance state, and no member variables. All methods are static.
 *
 * Responsibilities:
 * - compose(): Convert Transform (position, rotation, scale) to Matrix4
 * - decompose(): Convert Matrix4 to position, rotation, scale
 *
 * Design Principles:
 * - Pure Functions: Deterministic, no side effects
 * - Zero Allocations: No temporary objects, arrays, or closures
 * - Direct Writes: Output parameters are written into directly
 * - No Exceptions: Validate inputs via duck typing, throw TypeError
 * - Numerical Stability: Epsilon checks, avoid divisions by zero
 * - Future-Ready: Designed for extension with additional algorithms
 *
 * Performance:
 * - All operations use local scalar variables only
 * - No heap allocations in any method
 * - No loops (unrolled for performance)
 * - Minimal floating-point operations
 *
 * Ownership:
 * - Inputs are read-only
 * - Outputs are written into by the caller
 * - No references are stored
 */

import { Vector3 } from './Vector3.js';
import { Quaternion } from './Quaternion.js';
import { Matrix4 } from './Matrix4.js';

export class TransformAlgorithms {
    /**
     * Compose a Transform into a Matrix4.
     *
     * Matrix = Translation * Rotation * Scale
     *
     * Writes directly into outMatrix with zero allocations.
     *
     * @param {Transform} transform - Transform to compose
     * @param {Matrix4} outMatrix - Output matrix (must be a valid Matrix4)
     * @throws {TypeError} If inputs are invalid
     */
    static compose(transform, outMatrix) {
        // ---- Duck-type validation ----
        if (!transform || typeof transform._position === 'undefined' ||
            typeof transform._rotation === 'undefined' ||
            typeof transform._scale === 'undefined') {
            throw new TypeError('compose(): transform must be a valid Transform instance');
        }

        const pos = transform._position;
        const rot = transform._rotation;
        const scl = transform._scale;

        // Validate components are Vector3/Quaternion-like
        if (typeof pos.x !== 'number' || typeof pos.y !== 'number' || typeof pos.z !== 'number') {
            throw new TypeError('compose(): transform.position is not a valid Vector3');
        }
        if (typeof rot.x !== 'number' || typeof rot.y !== 'number' ||
            typeof rot.z !== 'number' || typeof rot.w !== 'number') {
            throw new TypeError('compose(): transform.rotation is not a valid Quaternion');
        }
        if (typeof scl.x !== 'number' || typeof scl.y !== 'number' || typeof scl.z !== 'number') {
            throw new TypeError('compose(): transform.scale is not a valid Vector3');
        }

        if (!outMatrix || typeof outMatrix.elements === 'undefined') {
            throw new TypeError('compose(): outMatrix must be a valid Matrix4 instance');
        }

        // ---- Extract quaternion components ----
        const qx = rot.x, qy = rot.y, qz = rot.z, qw = rot.w;
        const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
        const xx = qx * x2, xy = qx * y2, xz = qx * z2;
        const yy = qy * y2, yz = qy * z2, zz = qz * z2;
        const wx = qw * x2, wy = qw * y2, wz = qw * z2;

        // ---- Scale components ----
        const sx = scl.x, sy = scl.y, sz = scl.z;

        // ---- Write directly into outMatrix elements ----
        const m = outMatrix.elements;

        // Column 0
        m[0] = (1 - (yy + zz)) * sx;
        m[1] = (xy + wz) * sx;
        m[2] = (xz - wy) * sx;
        m[3] = 0;

        // Column 1
        m[4] = (xy - wz) * sy;
        m[5] = (1 - (xx + zz)) * sy;
        m[6] = (yz + wx) * sy;
        m[7] = 0;

        // Column 2
        m[8] = (xz + wy) * sz;
        m[9] = (yz - wx) * sz;
        m[10] = (1 - (xx + yy)) * sz;
        m[11] = 0;

        // Column 3 (translation)
        m[12] = pos.x;
        m[13] = pos.y;
        m[14] = pos.z;
        m[15] = 1;
    }

    /**
     * Decompose a Matrix4 into position, rotation, and scale.
     *
     * Extracts translation, normalized rotation (quaternion), and scale
     * from a 4x4 transformation matrix.
     *
     * Handles non-uniform scale and reflection (negative scale) correctly.
     * The rotation matrix is renormalized after scale extraction.
     *
     * @param {Matrix4} matrix - Matrix to decompose
     * @param {Vector3} outPosition - Output position
     * @param {Quaternion} outRotation - Output rotation
     * @param {Vector3} outScale - Output scale
     * @throws {TypeError} If inputs are invalid
     */
    static decompose(matrix, outPosition, outRotation, outScale) {
        // ---- Duck-type validation ----
        if (!matrix || typeof matrix.elements === 'undefined') {
            throw new TypeError('decompose(): matrix must be a valid Matrix4 instance');
        }
        if (!outPosition || typeof outPosition.x !== 'number' ||
            typeof outPosition.y !== 'number' || typeof outPosition.z !== 'number') {
            throw new TypeError('decompose(): outPosition must be a valid Vector3 instance');
        }
        if (!outRotation || typeof outRotation.x !== 'number' ||
            typeof outRotation.y !== 'number' || typeof outRotation.z !== 'number' ||
            typeof outRotation.w !== 'number') {
            throw new TypeError('decompose(): outRotation must be a valid Quaternion instance');
        }
        if (!outScale || typeof outScale.x !== 'number' ||
            typeof outScale.y !== 'number' || typeof outScale.z !== 'number') {
            throw new TypeError('decompose(): outScale must be a valid Vector3 instance');
        }

        const m = matrix.elements;

        // ---- Extract translation ----
        outPosition.x = m[12];
        outPosition.y = m[13];
        outPosition.z = m[14];

        // ---- Extract scale ----
        // Column vectors (0-based)
        const col0x = m[0], col0y = m[1], col0z = m[2];
        const col1x = m[4], col1y = m[5], col1z = m[6];
        const col2x = m[8], col2y = m[9], col2z = m[10];

        // Magnitudes
        const sx = Math.sqrt(col0x * col0x + col0y * col0y + col0z * col0z);
        const sy = Math.sqrt(col1x * col1x + col1y * col1y + col1z * col1z);
        const sz = Math.sqrt(col2x * col2x + col2y * col2y + col2z * col2z);

        const eps = 1e-10;
        const invSx = sx > eps ? 1 / sx : 0;
        const invSy = sy > eps ? 1 / sy : 0;
        const invSz = sz > eps ? 1 / sz : 0;

        // Normalise rotation matrix
        const r00 = col0x * invSx, r01 = col1x * invSy, r02 = col2x * invSz;
        const r10 = col0y * invSx, r11 = col1y * invSy, r12 = col2y * invSz;
        const r20 = col0z * invSx, r21 = col1z * invSy, r22 = col2z * invSz;

        // ---- Determine scale signs via determinant ----
        const det = r00 * (r11 * r22 - r12 * r21) -
                    r01 * (r10 * r22 - r12 * r20) +
                    r02 * (r10 * r21 - r11 * r20);

        let sxFinal = sx;
        let syFinal = sy;
        let szFinal = sz;

        if (det < 0) {
            // Find which axis to flip by checking determinants of each column pair
            // Try flipping X first
            const detX = (-r00) * (r11 * r22 - r12 * r21) -
                         r01 * ((-r10) * r22 - r12 * (-r20)) +
                         r02 * ((-r10) * r21 - r11 * (-r20));
            if (detX > 0) {
                sxFinal = -sx;
            } else {
                // Try flipping Y
                const detY = r00 * (r11 * r22 - r12 * r21) -
                             (-r01) * (r10 * r22 - r12 * r20) +
                             r02 * (r10 * r21 - r11 * r20);
                if (detY > 0) {
                    syFinal = -sy;
                } else {
                    // Flip Z
                    szFinal = -sz;
                }
            }
        }

        outScale.x = sxFinal;
        outScale.y = syFinal;
        outScale.z = szFinal;

        // ---- Reconstruct normalised rotation matrix with corrected scale ----
        const invSxFinal = sxFinal > eps ? 1 / sxFinal : 0;
        const invSyFinal = syFinal > eps ? 1 / syFinal : 0;
        const invSzFinal = szFinal > eps ? 1 / szFinal : 0;

        const r00n = col0x * invSxFinal;
        const r01n = col1x * invSyFinal;
        const r02n = col2x * invSzFinal;
        const r10n = col0y * invSxFinal;
        const r11n = col1y * invSyFinal;
        const r12n = col2y * invSzFinal;
        const r20n = col0z * invSxFinal;
        const r21n = col1z * invSyFinal;
        const r22n = col2z * invSzFinal;

        // ---- Extract quaternion from rotation matrix (trace method) ----
        const trace = r00n + r11n + r22n;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            outRotation.w = 0.25 / s;
            outRotation.x = (r21n - r12n) * s;
            outRotation.y = (r02n - r20n) * s;
            outRotation.z = (r10n - r01n) * s;
        } else if (r00n > r11n && r00n > r22n) {
            const s = 2.0 * Math.sqrt(1.0 + r00n - r11n - r22n);
            outRotation.w = (r21n - r12n) / s;
            outRotation.x = 0.25 * s;
            outRotation.y = (r01n + r10n) / s;
            outRotation.z = (r02n + r20n) / s;
        } else if (r11n > r22n) {
            const s = 2.0 * Math.sqrt(1.0 + r11n - r00n - r22n);
            outRotation.w = (r02n - r20n) / s;
            outRotation.x = (r01n + r10n) / s;
            outRotation.y = 0.25 * s;
            outRotation.z = (r12n + r21n) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + r22n - r00n - r11n);
            outRotation.w = (r10n - r01n) / s;
            outRotation.x = (r02n + r20n) / s;
            outRotation.y = (r12n + r21n) / s;
            outRotation.z = 0.25 * s;
        }

        // ---- Normalize quaternion to prevent drift ----
        outRotation.normalize();
    }
}