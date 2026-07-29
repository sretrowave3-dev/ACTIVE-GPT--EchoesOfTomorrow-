/**
 * src/framework/math/TransformSpatial.js
 *
 * Echo Engine — Math Library
 *
 * Static spatial utility algorithms for Transforms.
 *
 * This class is a pure algorithm container. It has no constructor,
 * no instance state, and no member variables. All methods are static.
 *
 * Responsibilities:
 * - transformPoint(): Apply full transform (translation, rotation, scale) to a point
 * - transformDirection(): Apply rotation and scale (ignoring translation) to a direction
 * - inverseTransformPoint(): Apply inverse transform to a point
 * - inverseTransformDirection(): Apply inverse rotation and scale to a direction
 * - distance(): Euclidean distance between two transform positions
 * - squaredDistance(): Squared Euclidean distance between two transform positions
 * - lookAt(): Orient a transform to look at a target position
 *
 * Design Principles:
 * - Pure Functions: Deterministic, no side effects (except lookAt which mutates the transform)
 * - Zero Allocations: All operations use local scalar variables only; no temporary objects
 * - No Instance State: All methods are static
 * - Defensive Validation: Duck typing on all inputs
 * - Self-Contained: Uses only scalar arithmetic; does not depend on Quaternion or Matrix4 helper methods
 *
 * Performance:
 * - All operations use local scalar variables only
 * - No heap allocations in any method
 * - Minimal floating-point operations
 * - Reuses cached matrix where possible
 *
 * Ownership:
 * - Inputs are read-only (except lookAt which mutates the transform)
 * - Outputs are written into by the caller
 * - No references are stored
 */

import { Transform } from './Transform.js';

export class TransformSpatial {
    /**
     * Transform a point by a transform.
     *
     * Applies full transformation (translation, rotation, scale) to the input point.
     *
     * @param {Transform} transform - Transform to apply
     * @param {Vector3} point - Point to transform
     * @param {Vector3} out - Output vector
     * @throws {TypeError} If inputs are invalid
     */
    static transformPoint(transform, point, out) {
        // ---- Duck-type validation ----
        if (!transform || typeof transform._position === 'undefined' ||
            typeof transform._rotation === 'undefined' || typeof transform._scale === 'undefined') {
            throw new TypeError('transformPoint(): transform must be a valid Transform instance');
        }
        if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
            throw new TypeError('transformPoint(): point must be a valid Vector3 instance');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new TypeError('transformPoint(): out must be a valid Vector3 instance');
        }

        // Get cached matrix (may recompute if dirty)
        const matrix = transform.getMatrix();
        const m = matrix.elements;

        const x = point.x, y = point.y, z = point.z;

        out.x = m[0] * x + m[4] * y + m[8] * z + m[12];
        out.y = m[1] * x + m[5] * y + m[9] * z + m[13];
        out.z = m[2] * x + m[6] * y + m[10] * z + m[14];
    }

    /**
     * Transform a direction by a transform.
     *
     * Applies rotation and scale (ignoring translation) to the input direction.
     *
     * Note: This applies the full 3x3 portion of the matrix, which includes scaling.
     * For pure rotation-only direction transforms, use transformDirectionRotationOnly()
     * if added in the future.
     *
     * @param {Transform} transform - Transform to apply
     * @param {Vector3} direction - Direction to transform
     * @param {Vector3} out - Output vector
     * @throws {TypeError} If inputs are invalid
     */
    static transformDirection(transform, direction, out) {
        if (!transform || typeof transform._position === 'undefined' ||
            typeof transform._rotation === 'undefined' || typeof transform._scale === 'undefined') {
            throw new TypeError('transformDirection(): transform must be a valid Transform instance');
        }
        if (!direction || typeof direction.x !== 'number' || typeof direction.y !== 'number' || typeof direction.z !== 'number') {
            throw new TypeError('transformDirection(): direction must be a valid Vector3 instance');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new TypeError('transformDirection(): out must be a valid Vector3 instance');
        }

        const matrix = transform.getMatrix();
        const m = matrix.elements;

        const x = direction.x, y = direction.y, z = direction.z;

        out.x = m[0] * x + m[4] * y + m[8] * z;
        out.y = m[1] * x + m[5] * y + m[9] * z;
        out.z = m[2] * x + m[6] * y + m[10] * z;
    }

    /**
     * Inverse-transform a point by a transform.
     *
     * Applies the inverse of the transform to the input point.
     * Zero-allocation implementation using scalar arithmetic only.
     *
     * @param {Transform} transform - Transform to invert and apply
     * @param {Vector3} point - Point to transform
     * @param {Vector3} out - Output vector
     * @throws {TypeError} If inputs are invalid
     */
    static inverseTransformPoint(transform, point, out) {
        if (!transform || typeof transform._position === 'undefined' ||
            typeof transform._rotation === 'undefined' || typeof transform._scale === 'undefined') {
            throw new TypeError('inverseTransformPoint(): transform must be a valid Transform instance');
        }
        if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
            throw new TypeError('inverseTransformPoint(): point must be a valid Vector3 instance');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new TypeError('inverseTransformPoint(): out must be a valid Vector3 instance');
        }

        const pos = transform._position;
        const rot = transform._rotation;
        const scl = transform._scale;

        // ---- Inverse rotation (conjugate) ----
        const qx = rot.x, qy = rot.y, qz = rot.z, qw = rot.w;
        const invQx = -qx, invQy = -qy, invQz = -qz, invQw = qw;

        // ---- Inverse scale ----
        const sx = scl.x !== 0 ? 1 / scl.x : 1;
        const sy = scl.y !== 0 ? 1 / scl.y : 1;
        const sz = scl.z !== 0 ? 1 / scl.z : 1;

        // ---- Apply inverse transform: p' = S_inv * R_inv * (p - t) ----
        // Step 1: subtract translation
        const pLocalX = point.x - pos.x;
        const pLocalY = point.y - pos.y;
        const pLocalZ = point.z - pos.z;

        // Step 2: rotate by invQ (quaternion-vector multiplication)
        // q * v * q_conj, where q = invQ and q_conj = (qx, qy, qz, qw)
        const ix = invQw * pLocalX + invQy * pLocalZ - invQz * pLocalY;
        const iy = invQw * pLocalY + invQz * pLocalX - invQx * pLocalZ;
        const iz = invQw * pLocalZ + invQx * pLocalY - invQy * pLocalX;
        const iw = -invQx * pLocalX - invQy * pLocalY - invQz * pLocalZ;

        // Multiply by q_conj (which is the original quaternion)
        const vx = iw * qx + ix * qw + iy * qz - iz * qy;
        const vy = iw * qy + iy * qw + iz * qx - ix * qz;
        const vz = iw * qz + iz * qw + ix * qy - iy * qx;

        // Step 3: apply inverse scale
        out.x = vx * sx;
        out.y = vy * sy;
        out.z = vz * sz;
    }

    /**
     * Inverse-transform a direction by a transform.
     *
     * Applies inverse rotation and scale (ignoring translation) to the input direction.
     * Zero-allocation implementation using scalar arithmetic only.
     *
     * @param {Transform} transform - Transform to invert and apply
     * @param {Vector3} direction - Direction to transform
     * @param {Vector3} out - Output vector
     * @throws {TypeError} If inputs are invalid
     */
    static inverseTransformDirection(transform, direction, out) {
        if (!transform || typeof transform._position === 'undefined' ||
            typeof transform._rotation === 'undefined' || typeof transform._scale === 'undefined') {
            throw new TypeError('inverseTransformDirection(): transform must be a valid Transform instance');
        }
        if (!direction || typeof direction.x !== 'number' || typeof direction.y !== 'number' || typeof direction.z !== 'number') {
            throw new TypeError('inverseTransformDirection(): direction must be a valid Vector3 instance');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new TypeError('inverseTransformDirection(): out must be a valid Vector3 instance');
        }

        const rot = transform._rotation;
        const scl = transform._scale;

        // ---- Inverse rotation (conjugate) ----
        const qx = rot.x, qy = rot.y, qz = rot.z, qw = rot.w;
        const invQx = -qx, invQy = -qy, invQz = -qz, invQw = qw;

        // ---- Inverse scale ----
        const sx = scl.x !== 0 ? 1 / scl.x : 1;
        const sy = scl.y !== 0 ? 1 / scl.y : 1;
        const sz = scl.z !== 0 ? 1 / scl.z : 1;

        // ---- Apply inverse rotation to direction ----
        // q * v * q_conj, where q = invQ and q_conj = (qx, qy, qz, qw)
        const vx = direction.x, vy = direction.y, vz = direction.z;
        const ix = invQw * vx + invQy * vz - invQz * vy;
        const iy = invQw * vy + invQz * vx - invQx * vz;
        const iz = invQw * vz + invQx * vy - invQy * vx;
        const iw = -invQx * vx - invQy * vy - invQz * vz;

        const rx = iw * qx + ix * qw + iy * qz - iz * qy;
        const ry = iw * qy + iy * qw + iz * qx - ix * qz;
        const rz = iw * qz + iz * qw + ix * qy - iy * qx;

        // ---- Apply inverse scale ----
        out.x = rx * sx;
        out.y = ry * sy;
        out.z = rz * sz;
    }

    /**
     * Compute the Euclidean distance between two transforms' positions.
     *
     * @param {Transform} a - First transform
     * @param {Transform} b - Second transform
     * @returns {number} Distance
     * @throws {TypeError} If inputs are invalid
     */
    static distance(a, b) {
        if (!a || typeof a._position === 'undefined' ||
            typeof a._rotation === 'undefined' || typeof a._scale === 'undefined') {
            throw new TypeError('distance(): a must be a valid Transform instance');
        }
        if (!b || typeof b._position === 'undefined' ||
            typeof b._rotation === 'undefined' || typeof b._scale === 'undefined') {
            throw new TypeError('distance(): b must be a valid Transform instance');
        }

        const dx = a._position.x - b._position.x;
        const dy = a._position.y - b._position.y;
        const dz = a._position.z - b._position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Compute the squared Euclidean distance between two transforms' positions.
     *
     * @param {Transform} a - First transform
     * @param {Transform} b - Second transform
     * @returns {number} Squared distance
     * @throws {TypeError} If inputs are invalid
     */
    static squaredDistance(a, b) {
        if (!a || typeof a._position === 'undefined' ||
            typeof a._rotation === 'undefined' || typeof a._scale === 'undefined') {
            throw new TypeError('squaredDistance(): a must be a valid Transform instance');
        }
        if (!b || typeof b._position === 'undefined' ||
            typeof b._rotation === 'undefined' || typeof b._scale === 'undefined') {
            throw new TypeError('squaredDistance(): b must be a valid Transform instance');
        }

        const dx = a._position.x - b._position.x;
        const dy = a._position.y - b._position.y;
        const dz = a._position.z - b._position.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Orient a transform to look at a target position.
     *
     * Modifies the transform's rotation so that its forward direction (assumed -Z)
     * points toward the target. The transform's position and scale are unchanged.
     *
     * Zero-allocation implementation using scalar arithmetic only.
     *
     * @param {Transform} transform - Transform to orient
     * @param {Vector3} target - Target position to look at
     * @param {Vector3} [up] - Up direction (defaults to (0,1,0))
     * @throws {TypeError} If inputs are invalid
     */
    static lookAt(transform, target, up = null) {
        if (!transform || typeof transform._position === 'undefined' ||
            typeof transform._rotation === 'undefined' || typeof transform._scale === 'undefined') {
            throw new TypeError('lookAt(): transform must be a valid Transform instance');
        }
        if (!target || typeof target.x !== 'number' || typeof target.y !== 'number' || typeof target.z !== 'number') {
            throw new TypeError('lookAt(): target must be a valid Vector3 instance');
        }
        if (up !== null && (typeof up.x !== 'number' || typeof up.y !== 'number' || typeof up.z !== 'number')) {
            throw new TypeError('lookAt(): up must be a valid Vector3 instance or null');
        }

        const pos = transform._position;

        // ---- Compute forward direction (normalized) ----
        const dirX = target.x - pos.x;
        const dirY = target.y - pos.y;
        const dirZ = target.z - pos.z;
        const lenSq = dirX * dirX + dirY * dirY + dirZ * dirZ;
        if (lenSq < 1e-12) {
            // Target coincides with position, cannot determine orientation.
            return;
        }
        const invLen = 1 / Math.sqrt(lenSq);
        const fwdX = dirX * invLen;
        const fwdY = dirY * invLen;
        const fwdZ = dirZ * invLen;

        // ---- Define up vector ----
        let upX = 0, upY = 1, upZ = 0;
        if (up) {
            upX = up.x;
            upY = up.y;
            upZ = up.z;
        }

        // ---- Compute right = forward × up ----
        let rightX = fwdY * upZ - fwdZ * upY;
        let rightY = fwdZ * upX - fwdX * upZ;
        let rightZ = fwdX * upY - fwdY * upX;

        // ---- Re-normalize right ----
        let rightLenSq = rightX * rightX + rightY * rightY + rightZ * rightZ;
        if (rightLenSq < 1e-12) {
            // Forward and up are parallel, use a fallback up
            upX = 0; upY = 0; upZ = 1;
            rightX = fwdY * upZ - fwdZ * upY;
            rightY = fwdZ * upX - fwdX * upZ;
            rightZ = fwdX * upY - fwdY * upX;
            rightLenSq = rightX * rightX + rightY * rightY + rightZ * rightZ;
            if (rightLenSq < 1e-12) {
                // Still zero, use (1,0,0) as fallback
                rightX = 1; rightY = 0; rightZ = 0;
                rightLenSq = 1;
            }
        }
        const invRightLen = 1 / Math.sqrt(rightLenSq);
        rightX *= invRightLen;
        rightY *= invRightLen;
        rightZ *= invRightLen;

        // ---- Compute final up = right × forward ----
        const upFinalX = rightY * fwdZ - rightZ * fwdY;
        const upFinalY = rightZ * fwdX - rightX * fwdZ;
        const upFinalZ = rightX * fwdY - rightY * fwdX;

        // ---- Build rotation matrix and convert to quaternion ----
        // Matrix columns: [right | upFinal | -forward]
        const m00 = rightX, m01 = upFinalX, m02 = -fwdX;
        const m10 = rightY, m11 = upFinalY, m12 = -fwdY;
        const m20 = rightZ, m21 = upFinalZ, m22 = -fwdZ;

        // ---- Trace method for quaternion extraction ----
        const trace = m00 + m11 + m22;
        let qx, qy, qz, qw;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            qw = 0.25 / s;
            qx = (m21 - m12) * s;
            qy = (m02 - m20) * s;
            qz = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
            qw = (m21 - m12) / s;
            qx = 0.25 * s;
            qy = (m01 + m10) / s;
            qz = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
            qw = (m02 - m20) / s;
            qx = (m01 + m10) / s;
            qy = 0.25 * s;
            qz = (m12 + m21) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
            qw = (m10 - m01) / s;
            qx = (m02 + m20) / s;
            qy = (m12 + m21) / s;
            qz = 0.25 * s;
        }

        // ---- Normalize quaternion ----
        const qLenSq = qx * qx + qy * qy + qz * qz + qw * qw;
        if (qLenSq > 0) {
            const invQLen = 1 / Math.sqrt(qLenSq);
            transform._rotation.set(qx * invQLen, qy * invQLen, qz * invQLen, qw * invQLen);
        } else {
            transform._rotation.identity();
        }

        transform.markDirty();
    }
}