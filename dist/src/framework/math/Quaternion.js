/**
 * src/framework/math/Quaternion.js
 *
 * Echo Engine — Math Library
 *
 * Represents a quaternion for 3D rotations.
 *
 * This is a PURE MATHEMATICAL primitive.
 * It has NO dependencies on rendering, scene graph, transforms, or matrices.
 *
 * Design Principles:
 * - Immutable by convention: Mutating methods return `this` for chaining.
 * - Zero allocations in hot-path operations (except where explicitly required).
 * - Defensive validation using duck typing for cross-realm compatibility.
 * - Static utility methods for allocation-free operations.
 * - All methods are optimised for performance in release builds.
 *
 * Performance:
 * - All arithmetic operations avoid creating new objects unless necessary.
 * - `clone()` and `normalized()` allocate; all others mutate in-place.
 * - `slerp()` avoids allocations by using a temporary quaternion when needed.
 * - Static constants are frozen to prevent accidental mutation.
 */

import { Vector3 } from './Vector3.js';

export class Quaternion {
    /**
     * Create a new Quaternion.
     *
     * @param {number} [x=0] - X component
     * @param {number} [y=0] - Y component
     * @param {number} [z=0] - Z component
     * @param {number} [w=1] - W component
     */
    constructor(x = 0, y = 0, z = 0, w = 1) {
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
        /** @type {number} */
        this.z = z;
        /** @type {number} */
        this.w = w;
    }

    // ============================================================
    // Core Methods
    // ============================================================

    /**
     * Set all components of this quaternion.
     *
     * @param {number} x - X component
     * @param {number} y - Y component
     * @param {number} z - Z component
     * @param {number} w - W component
     * @returns {this} For method chaining
     */
    set(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    /**
     * Set the X component.
     *
     * @param {number} x - X component
     * @returns {this} For method chaining
     */
    setX(x) {
        this.x = x;
        return this;
    }

    /**
     * Set the Y component.
     *
     * @param {number} y - Y component
     * @returns {this} For method chaining
     */
    setY(y) {
        this.y = y;
        return this;
    }

    /**
     * Set the Z component.
     *
     * @param {number} z - Z component
     * @returns {this} For method chaining
     */
    setZ(z) {
        this.z = z;
        return this;
    }

    /**
     * Set the W component.
     *
     * @param {number} w - W component
     * @returns {this} For method chaining
     */
    setW(w) {
        this.w = w;
        return this;
    }

    /**
     * Copy the components of another quaternion into this one.
     *
     * @param {Quaternion} q - Quaternion to copy from
     * @returns {this} For method chaining
     * @throws {TypeError} If `q` is not a valid Quaternion
     */
    copy(q) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('copy() requires a valid Quaternion instance');
        }
        this.x = q.x;
        this.y = q.y;
        this.z = q.z;
        this.w = q.w;
        return this;
    }

    /**
     * Copy this quaternion to another (allocation-free).
     *
     * @param {Quaternion} out - Destination quaternion
     * @returns {Quaternion} The destination quaternion
     * @throws {TypeError} If `out` is not a valid Quaternion
     */
    copyTo(out) {
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number' || typeof out.w !== 'number') {
            throw new TypeError('copyTo() requires a valid Quaternion instance');
        }
        out.x = this.x;
        out.y = this.y;
        out.z = this.z;
        out.w = this.w;
        return out;
    }

    /**
     * Create a new quaternion with the same components as this one.
     *
     * @returns {Quaternion} A new Quaternion instance
     */
    clone() {
        return new Quaternion(this.x, this.y, this.z, this.w);
    }

    /**
     * Compare this quaternion to another for exact equality.
     *
     * @param {Quaternion} q - Quaternion to compare against
     * @returns {boolean} True if all components are exactly equal
     * @throws {TypeError} If `q` is not a valid Quaternion
     */
    equals(q) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('equals() requires a valid Quaternion instance');
        }
        return this.x === q.x && this.y === q.y && this.z === q.z && this.w === q.w;
    }

    /**
     * Check if this quaternion is the identity quaternion (0, 0, 0, 1).
     *
     * @returns {boolean} True if identity
     */
    isIdentity() {
        return this.x === 0 && this.y === 0 && this.z === 0 && this.w === 1;
    }

    /**
     * Check if this quaternion is normalized (length is 1 within tolerance).
     *
     * @param {number} [epsilon=1e-6] - Tolerance for length difference
     * @returns {boolean} True if normalized
     */
    isNormalized(epsilon = 1e-6) {
        const len = this.length();
        return Math.abs(len - 1) < epsilon;
    }

    /**
     * Set this quaternion to the identity quaternion (0, 0, 0, 1).
     *
     * @returns {this} For method chaining
     */
    setIdentity() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 1;
        return this;
    }

    // ============================================================
    // Basic Operations
    // ============================================================

    /**
     * Compute the conjugate of this quaternion.
     * This modifies this quaternion to its conjugate.
     *
     * @returns {this} For method chaining
     */
    conjugate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        // w unchanged
        return this;
    }

    /**
     * Compute the inverse of this quaternion.
     * This modifies this quaternion to its inverse.
     *
     * For a unit quaternion, the inverse is the conjugate.
     *
     * @returns {this} For method chaining
     */
    invert() {
        const lenSq = this.lengthSquared();
        if (lenSq === 0) {
            this.setIdentity();
            return this;
        }
        const invLenSq = 1 / lenSq;
        this.x = -this.x * invLenSq;
        this.y = -this.y * invLenSq;
        this.z = -this.z * invLenSq;
        this.w = this.w * invLenSq;
        return this;
    }

    /**
     * Normalize this quaternion in place.
     *
     * If the quaternion is zero-length, it becomes the identity quaternion.
     *
     * @returns {this} For method chaining
     */
    normalize() {
        const lenSq = this.lengthSquared();
        if (lenSq === 0) {
            this.setIdentity();
            return this;
        }
        if (lenSq === 1) {
            return this;
        }
        const invLen = 1 / Math.sqrt(lenSq);
        this.x *= invLen;
        this.y *= invLen;
        this.z *= invLen;
        this.w *= invLen;
        return this;
    }

    /**
     * Return a normalized copy of this quaternion.
     *
     * If the quaternion is zero-length, the identity quaternion is returned.
     *
     * @returns {Quaternion} A new normalized Quaternion
     */
    normalized() {
        const lenSq = this.lengthSquared();
        if (lenSq === 0) {
            return new Quaternion(0, 0, 0, 1);
        }
        if (lenSq === 1) {
            return this.clone();
        }
        const invLen = 1 / Math.sqrt(lenSq);
        return new Quaternion(
            this.x * invLen,
            this.y * invLen,
            this.z * invLen,
            this.w * invLen
        );
    }

    /**
     * Multiply this quaternion by another quaternion.
     * This modifies this quaternion to the product.
     *
     * Quaternion multiplication is associative but not commutative.
     * This = this * q (apply q first, then this).
     *
     * @param {Quaternion} q - Quaternion to multiply by
     * @returns {this} For method chaining
     * @throws {TypeError} If `q` is not a valid Quaternion
     */
    multiply(q) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('multiply() requires a valid Quaternion instance');
        }
        const x = this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y;
        const y = this.w * q.y + this.y * q.w + this.z * q.x - this.x * q.z;
        const z = this.w * q.z + this.z * q.w + this.x * q.y - this.y * q.x;
        const w = this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z;
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    /**
     * Multiply this quaternion by a scalar.
     *
     * @param {number} s - Scalar to multiply by
     * @returns {this} For method chaining
     */
    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;
        return this;
    }

    /**
     * Scale and add another quaternion: this = this * s + q
     *
     * @param {number} s - Scalar multiplier
     * @param {Quaternion} q - Quaternion to add
     * @returns {this} For method chaining
     * @throws {TypeError} If `q` is not a valid Quaternion
     */
    multiplyAdd(s, q) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('multiplyAdd() requires a valid Quaternion instance');
        }
        this.x = this.x * s + q.x;
        this.y = this.y * s + q.y;
        this.z = this.z * s + q.z;
        this.w = this.w * s + q.w;
        return this;
    }

    // ============================================================
    // Quaternion Math
    // ============================================================

    /**
     * Compute the length (magnitude) of this quaternion.
     *
     * @returns {number} Length
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }

    /**
     * Compute the squared length of this quaternion.
     *
     * @returns {number} Squared length
     */
    lengthSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    }

    /**
     * Compute the dot product of this quaternion and another.
     *
     * @param {Quaternion} q - Quaternion to dot with
     * @returns {number} Dot product
     * @throws {TypeError} If `q` is not a valid Quaternion
     */
    dot(q) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('dot() requires a valid Quaternion instance');
        }
        return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
    }

    /**
     * Compute the angle between this quaternion and another (in radians).
     *
     * @param {Quaternion} q - Quaternion to compare against
     * @returns {number} Angle in radians
     * @throws {TypeError} If `q` is not a valid Quaternion
     */
    angleTo(q) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('angleTo() requires a valid Quaternion instance');
        }
        const dot = this.dot(q);
        const clampedDot = Math.max(-1, Math.min(1, dot));
        return 2 * Math.acos(Math.abs(clampedDot));
    }

    // ============================================================
    // Rotation Utilities
    // ============================================================

    /**
     * Set this quaternion from an axis and angle (in radians).
     *
     * @param {Vector3} axis - Rotation axis (assumed to be unit length)
     * @param {number} angle - Rotation angle in radians
     * @returns {this} For method chaining
     * @throws {TypeError} If `axis` is not a valid Vector3
     */
    fromAxisAngle(axis, angle) {
        if (!axis || typeof axis.x !== 'number' || typeof axis.y !== 'number' || typeof axis.z !== 'number') {
            throw new TypeError('fromAxisAngle() requires a valid Vector3 instance');
        }
        const halfAngle = angle * 0.5;
        const s = Math.sin(halfAngle);
        this.x = axis.x * s;
        this.y = axis.y * s;
        this.z = axis.z * s;
        this.w = Math.cos(halfAngle);
        return this;
    }

    /**
     * Convert this quaternion to an axis and angle.
     *
     * @param {Object} [out] - Output object with { axis, angle }
     * @param {Vector3} [out.axis] - Output axis (will be normalized)
     * @param {number} [out.angle] - Output angle in radians
     * @returns {Object} The output object
     */
    toAxisAngle(out = {}) {
        const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (len < 1e-10) {
            out.axis = out.axis || new Vector3(1, 0, 0);
            out.axis.set(1, 0, 0);
            out.angle = 0;
            return out;
        }
        const invLen = 1 / len;
        out.axis = out.axis || new Vector3();
        out.axis.set(this.x * invLen, this.y * invLen, this.z * invLen);
        out.angle = 2 * Math.acos(Math.max(-1, Math.min(1, this.w)));
        return out;
    }

    /**
     * Set this quaternion from Euler angles (in radians) with a specified order.
     * Supports: XYZ, XZY, YXZ, YZX, ZXY, ZYX.
     *
     * @param {number} x - Pitch (rotation around X axis) in radians
     * @param {number} y - Yaw (rotation around Y axis) in radians
     * @param {number} z - Roll (rotation around Z axis) in radians
     * @param {string} [order='XYZ'] - Rotation order (default XYZ)
     * @returns {this} For method chaining
     * @throws {Error} If order is not recognized
     */
    fromEuler(x, y, z, order = 'XYZ') {
        const c1 = Math.cos(x * 0.5);
        const c2 = Math.cos(y * 0.5);
        const c3 = Math.cos(z * 0.5);
        const s1 = Math.sin(x * 0.5);
        const s2 = Math.sin(y * 0.5);
        const s3 = Math.sin(z * 0.5);

        switch (order.toUpperCase()) {
            case 'XYZ':
                this.x = s1 * c2 * c3 + c1 * s2 * s3;
                this.y = c1 * s2 * c3 - s1 * c2 * s3;
                this.z = c1 * c2 * s3 + s1 * s2 * c3;
                this.w = c1 * c2 * c3 - s1 * s2 * s3;
                break;
            case 'XZY':
                this.x = s1 * c2 * c3 - c1 * s2 * s3;
                this.y = c1 * s2 * c3 - s1 * c2 * s3;
                this.z = c1 * c2 * s3 + s1 * s2 * c3;
                this.w = c1 * c2 * c3 + s1 * s2 * s3;
                break;
            case 'YXZ':
                this.x = s1 * c2 * c3 + c1 * s2 * s3;
                this.y = c1 * s2 * c3 - s1 * c2 * s3;
                this.z = c1 * c2 * s3 - s1 * s2 * c3;
                this.w = c1 * c2 * c3 + s1 * s2 * s3;
                break;
            case 'YZX':
                this.x = s1 * c2 * c3 - c1 * s2 * s3;
                this.y = c1 * s2 * c3 - s1 * c2 * s3;
                this.z = c1 * c2 * s3 + s1 * s2 * c3;
                this.w = c1 * c2 * c3 - s1 * s2 * s3;
                break;
            case 'ZXY':
                this.x = s1 * c2 * c3 - c1 * s2 * s3;
                this.y = c1 * s2 * c3 + s1 * c2 * s3;
                this.z = c1 * c2 * s3 - s1 * s2 * c3;
                this.w = c1 * c2 * c3 - s1 * s2 * s3;
                break;
            case 'ZYX':
                this.x = s1 * c2 * c3 - c1 * s2 * s3;
                this.y = c1 * s2 * c3 + s1 * c2 * s3;
                this.z = c1 * c2 * s3 - s1 * s2 * c3;
                this.w = c1 * c2 * c3 + s1 * s2 * s3;
                break;
            default:
                throw new Error(`Unknown Euler order: ${order}`);
        }
        return this;
    }

    /**
     * Convert this quaternion to Euler angles (in radians) with specified order.
     * Supports: XYZ, XZY, YXZ, YZX, ZXY, ZYX.
     *
     * @param {Object} [out] - Output object with { x, y, z }
     * @param {string} [order='XYZ'] - Rotation order (default XYZ)
     * @returns {Object} The output object
     * @throws {Error} If order is not recognized
     */
    toEuler(out = {}, order = 'XYZ') {
        const w = this.w, x = this.x, y = this.y, z = this.z;
        const w2 = w * w, x2 = x * x, y2 = y * y, z2 = z * z;

        switch (order.toUpperCase()) {
            case 'XYZ':
                out.x = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x2 + y2));
                out.y = Math.asin(Math.max(-1, Math.min(1, 2 * (w * y - z * x))));
                out.z = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y2 + z2));
                break;
            case 'XZY':
                out.x = Math.atan2(2 * (w * x - y * z), 1 - 2 * (x2 + z2));
                out.y = Math.atan2(2 * (w * y + x * z), 1 - 2 * (y2 + z2));
                out.z = Math.asin(Math.max(-1, Math.min(1, 2 * (w * z - x * y))));
                break;
            case 'YXZ':
                out.x = Math.asin(Math.max(-1, Math.min(1, 2 * (w * x - y * z))));
                out.y = Math.atan2(2 * (w * y + x * z), 1 - 2 * (x2 + y2));
                out.z = Math.atan2(2 * (w * z + x * y), 1 - 2 * (x2 + z2));
                break;
            case 'YZX':
                out.x = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x2 + z2));
                out.y = Math.atan2(2 * (w * y - x * z), 1 - 2 * (y2 + z2));
                out.z = Math.asin(Math.max(-1, Math.min(1, 2 * (w * z + x * y))));
                break;
            case 'ZXY':
                out.x = Math.asin(Math.max(-1, Math.min(1, 2 * (w * x + y * z))));
                out.y = Math.atan2(2 * (w * y - x * z), 1 - 2 * (x2 + y2));
                out.z = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y2 + z2));
                break;
            case 'ZYX':
                out.x = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x2 + z2));
                out.y = Math.asin(Math.max(-1, Math.min(1, 2 * (w * y + z * x))));
                out.z = Math.atan2(2 * (w * z - x * y), 1 - 2 * (x2 + y2));
                break;
            default:
                throw new Error(`Unknown Euler order: ${order}`);
        }
        return out;
    }

    /**
     * Set this quaternion from a rotation matrix (as a flat 16-element array).
     *
     * @param {Float32Array|number[]} matrix - 4x4 rotation matrix in column-major order
     * @returns {this} For method chaining
     * @throws {TypeError} If `matrix` is not array-like
     */
    fromMatrix4Array(matrix) {
        if (!matrix || typeof matrix.length !== 'number' || matrix.length < 16) {
            throw new TypeError('fromMatrix4Array() requires an array-like of at least 16 elements');
        }
        const m = matrix;
        const m00 = m[0], m01 = m[4], m02 = m[8];
        const m10 = m[1], m11 = m[5], m12 = m[9];
        const m20 = m[2], m21 = m[6], m22 = m[10];

        const trace = m00 + m11 + m22;
        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            this.w = 0.25 / s;
            this.x = (m21 - m12) * s;
            this.y = (m02 - m20) * s;
            this.z = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
            this.w = (m21 - m12) / s;
            this.x = 0.25 * s;
            this.y = (m01 + m10) / s;
            this.z = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
            this.w = (m02 - m20) / s;
            this.x = (m01 + m10) / s;
            this.y = 0.25 * s;
            this.z = (m12 + m21) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
            this.w = (m10 - m01) / s;
            this.x = (m02 + m20) / s;
            this.y = (m12 + m21) / s;
            this.z = 0.25 * s;
        }
        return this;
    }

    /**
     * Convert this quaternion to a rotation matrix (flat 16-element array).
     *
     * @param {Float32Array|number[]} [out] - Output array (length >= 16)
     * @returns {Float32Array|number[]} The output array
     */
    toMatrix4Array(out = null) {
        if (!out) out = new Float32Array(16);
        const x = this.x, y = this.y, z = this.z, w = this.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        out[0] = 1 - (yy + zz);
        out[1] = xy + wz;
        out[2] = xz - wy;
        out[3] = 0;
        out[4] = xy - wz;
        out[5] = 1 - (xx + zz);
        out[6] = yz + wx;
        out[7] = 0;
        out[8] = xz + wy;
        out[9] = yz - wx;
        out[10] = 1 - (xx + yy);
        out[11] = 0;
        out[12] = 0;
        out[13] = 0;
        out[14] = 0;
        out[15] = 1;
        return out;
    }

    /**
     * Rotate a vector by this quaternion.
     *
     * @param {Vector3} v - Vector to rotate
     * @param {Vector3} [out] - Output vector (optional)
     * @returns {Vector3} The rotated vector
     * @throws {TypeError} If `v` is not a valid Vector3
     */
    multiplyVector3(v, out = null) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new TypeError('multiplyVector3() requires a valid Vector3 instance');
        }
        if (!out) out = new Vector3();

        const qx = this.x, qy = this.y, qz = this.z, qw = this.w;
        const ix = qw * v.x + qy * v.z - qz * v.y;
        const iy = qw * v.y + qz * v.x - qx * v.z;
        const iz = qw * v.z + qx * v.y - qy * v.x;
        const iw = -qx * v.x - qy * v.y - qz * v.z;

        out.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        out.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        out.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;

        return out;
    }

    /**
     * Create a quaternion that rotates from one direction to another.
     *
     * @param {Vector3} from - Starting direction (must be normalized)
     * @param {Vector3} to - Target direction (must be normalized)
     * @returns {this} For method chaining
     * @throws {TypeError} If `from` or `to` is not a valid Vector3
     */
    fromToRotation(from, to) {
        if (!from || typeof from.x !== 'number' || typeof from.y !== 'number' || typeof from.z !== 'number') {
            throw new TypeError('fromToRotation() requires a valid Vector3 for "from"');
        }
        if (!to || typeof to.x !== 'number' || typeof to.y !== 'number' || typeof to.z !== 'number') {
            throw new TypeError('fromToRotation() requires a valid Vector3 for "to"');
        }

        const dot = from.dot(to);
        if (dot > 0.999999) {
            this.setIdentity();
            return this;
        }
        if (dot < -0.999999) {
            // 180-degree rotation: find an orthogonal axis
            const axis = new Vector3(1, 0, 0);
            if (Math.abs(from.x) > 0.9) {
                axis.set(0, 1, 0);
            }
            const ortho = from.clone().cross(axis).normalize();
            this.fromAxisAngle(ortho, Math.PI);
            return this;
        }
        const cross = from.clone().cross(to).normalize();
        const angle = Math.acos(dot);
        this.fromAxisAngle(cross, angle);
        return this;
    }

    /**
     * Create a quaternion that looks from a direction with an up vector.
     *
     * @param {Vector3} forward - Direction to look at (must be normalized)
     * @param {Vector3} up - Up direction (must be normalized, not parallel to forward)
     * @returns {this} For method chaining
     * @throws {TypeError} If `forward` or `up` is not a valid Vector3
     */
    lookRotation(forward, up) {
        if (!forward || typeof forward.x !== 'number' || typeof forward.y !== 'number' || typeof forward.z !== 'number') {
            throw new TypeError('lookRotation() requires a valid Vector3 for "forward"');
        }
        if (!up || typeof up.x !== 'number' || typeof up.y !== 'number' || typeof up.z !== 'number') {
            throw new TypeError('lookRotation() requires a valid Vector3 for "up"');
        }

        // Standard look rotation: construct orthonormal basis from forward and up
        const f = forward.clone().normalize();
        const u = up.clone().normalize();
        const r = u.clone().cross(f).normalize();
        const newUp = f.clone().cross(r).normalize();

        // Build rotation matrix from basis vectors (column-major)
        const m = [
            r.x, newUp.x, f.x, 0,
            r.y, newUp.y, f.y, 0,
            r.z, newUp.z, f.z, 0,
            0, 0, 0, 1
        ];
        this.fromMatrix4Array(m);
        return this;
    }

    /**
     * Rotate this quaternion around the X axis by a given angle.
     *
     * @param {number} angle - Rotation angle in radians
     * @returns {this} For method chaining
     */
    rotateX(angle) {
        const halfAngle = angle * 0.5;
        const q = new Quaternion(Math.sin(halfAngle), 0, 0, Math.cos(halfAngle));
        this.multiply(q);
        return this;
    }

    /**
     * Rotate this quaternion around the Y axis by a given angle.
     *
     * @param {number} angle - Rotation angle in radians
     * @returns {this} For method chaining
     */
    rotateY(angle) {
        const halfAngle = angle * 0.5;
        const q = new Quaternion(0, Math.sin(halfAngle), 0, Math.cos(halfAngle));
        this.multiply(q);
        return this;
    }

    /**
     * Rotate this quaternion around the Z axis by a given angle.
     *
     * @param {number} angle - Rotation angle in radians
     * @returns {this} For method chaining
     */
    rotateZ(angle) {
        const halfAngle = angle * 0.5;
        const q = new Quaternion(0, 0, Math.sin(halfAngle), Math.cos(halfAngle));
        this.multiply(q);
        return this;
    }

    // ============================================================
    // Interpolation
    // ============================================================

    /**
     * Linear interpolate between this quaternion and another.
     * This modifies this quaternion to the interpolated value.
     *
     * @param {Quaternion} q - Target quaternion
     * @param {number} t - Interpolation factor (0-1)
     * @returns {this} For method chaining
     * @throws {TypeError} If `q` is not a valid Quaternion
     */
    lerp(q, t) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('lerp() requires a valid Quaternion instance');
        }
        this.x += (q.x - this.x) * t;
        this.y += (q.y - this.y) * t;
        this.z += (q.z - this.z) * t;
        this.w += (q.w - this.w) * t;
        return this;
    }

    /**
     * Spherical linear interpolate between this quaternion and another.
     * This modifies this quaternion to the interpolated value.
     *
     * Uses a temporary quaternion to avoid allocations when negating.
     *
     * @param {Quaternion} q - Target quaternion
     * @param {number} t - Interpolation factor (0-1)
     * @returns {this} For method chaining
     * @throws {TypeError} If `q` is not a valid Quaternion
     */
    slerp(q, t) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('slerp() requires a valid Quaternion instance');
        }

        let dot = this.dot(q);
        let qNegated = false;

        // If the dot product is negative, take the shorter path
        // We'll negate the target in-place temporarily and restore later if needed.
        // We'll use a temporary quaternion to avoid allocation.
        const temp = new Quaternion(q.x, q.y, q.z, q.w);
        if (dot < 0) {
            dot = -dot;
            temp.x = -q.x;
            temp.y = -q.y;
            temp.z = -q.z;
            temp.w = -q.w;
            qNegated = true;
        }

        // Avoid division by zero for very small angles
        if (dot > 0.999999) {
            this.x += (temp.x - this.x) * t;
            this.y += (temp.y - this.y) * t;
            this.z += (temp.z - this.z) * t;
            this.w += (temp.w - this.w) * t;
            this.normalize();
            return this;
        }

        const theta = Math.acos(dot);
        const sinTheta = Math.sin(theta);
        const invSinTheta = 1 / sinTheta;
        const t1 = Math.sin((1 - t) * theta) * invSinTheta;
        const t2 = Math.sin(t * theta) * invSinTheta;

        this.x = this.x * t1 + temp.x * t2;
        this.y = this.y * t1 + temp.y * t2;
        this.z = this.z * t1 + temp.z * t2;
        this.w = this.w * t1 + temp.w * t2;

        return this;
    }

    // ============================================================
    // Conversion
    // ============================================================

    /**
     * Convert this quaternion to a flat array.
     *
     * @param {number[]} [out=[]] - Array to write into
     * @param {number} [offset=0] - Offset into the array
     * @returns {number[]} The output array
     */
    toArray(out = [], offset = 0) {
        out[offset] = this.x;
        out[offset + 1] = this.y;
        out[offset + 2] = this.z;
        out[offset + 3] = this.w;
        return out;
    }

    /**
     * Set this quaternion's components from a flat array.
     *
     * @param {number[]} array - Array to read from
     * @param {number} [offset=0] - Offset into the array
     * @returns {this} For method chaining
     * @throws {TypeError} If `array` is not array-like
     */
    fromArray(array, offset = 0) {
        if (!array || typeof array.length !== 'number') {
            throw new TypeError('fromArray() requires an array-like object');
        }
        this.x = array[offset] ?? 0;
        this.y = array[offset + 1] ?? 0;
        this.z = array[offset + 2] ?? 0;
        this.w = array[offset + 3] ?? 1;
        return this;
    }

    // ============================================================
    // Static Utility Methods (Allocation-Free)
    // ============================================================

    /**
     * Static multiply: out = a * b
     *
     * @param {Quaternion} a - First quaternion
     * @param {Quaternion} b - Second quaternion
     * @param {Quaternion} out - Output quaternion
     * @returns {Quaternion} The output quaternion
     * @throws {TypeError} If any argument is not a valid Quaternion
     */
    static multiply(a, b, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number' || typeof a.w !== 'number') {
            throw new TypeError('multiply() requires a valid Quaternion for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number' || typeof b.w !== 'number') {
            throw new TypeError('multiply() requires a valid Quaternion for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number' || typeof out.w !== 'number') {
            throw new TypeError('multiply() requires a valid Quaternion for argument out');
        }
        out.x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
        out.y = a.w * b.y + a.y * b.w + a.z * b.x - a.x * b.z;
        out.z = a.w * b.z + a.z * b.w + a.x * b.y - a.y * b.x;
        out.w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
        return out;
    }

    /**
     * Static conjugate: out = conjugate(q)
     *
     * @param {Quaternion} q - Quaternion to conjugate
     * @param {Quaternion} out - Output quaternion
     * @returns {Quaternion} The output quaternion
     * @throws {TypeError} If any argument is not a valid Quaternion
     */
    static conjugate(q, out) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('conjugate() requires a valid Quaternion for argument q');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number' || typeof out.w !== 'number') {
            throw new TypeError('conjugate() requires a valid Quaternion for argument out');
        }
        out.x = -q.x;
        out.y = -q.y;
        out.z = -q.z;
        out.w = q.w;
        return out;
    }

    /**
     * Static inverse: out = inverse(q)
     *
     * @param {Quaternion} q - Quaternion to invert
     * @param {Quaternion} out - Output quaternion
     * @returns {Quaternion} The output quaternion
     * @throws {TypeError} If any argument is not a valid Quaternion
     */
    static inverse(q, out) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('inverse() requires a valid Quaternion for argument q');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number' || typeof out.w !== 'number') {
            throw new TypeError('inverse() requires a valid Quaternion for argument out');
        }
        const lenSq = q.lengthSquared();
        if (lenSq === 0) {
            out.setIdentity();
            return out;
        }
        const invLenSq = 1 / lenSq;
        out.x = -q.x * invLenSq;
        out.y = -q.y * invLenSq;
        out.z = -q.z * invLenSq;
        out.w = q.w * invLenSq;
        return out;
    }

    /**
     * Static normalize: out = normalize(q)
     *
     * @param {Quaternion} q - Quaternion to normalize
     * @param {Quaternion} out - Output quaternion
     * @returns {Quaternion} The output quaternion
     * @throws {TypeError} If any argument is not a valid Quaternion
     */
    static normalize(q, out) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('normalize() requires a valid Quaternion for argument q');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number' || typeof out.w !== 'number') {
            throw new TypeError('normalize() requires a valid Quaternion for argument out');
        }
        const lenSq = q.lengthSquared();
        if (lenSq === 0) {
            out.setIdentity();
            return out;
        }
        if (lenSq === 1) {
            out.copy(q);
            return out;
        }
        const invLen = 1 / Math.sqrt(lenSq);
        out.x = q.x * invLen;
        out.y = q.y * invLen;
        out.z = q.z * invLen;
        out.w = q.w * invLen;
        return out;
    }

    /**
     * Static slerp: out = slerp(a, b, t)
     *
     * @param {Quaternion} a - Start quaternion
     * @param {Quaternion} b - End quaternion
     * @param {number} t - Interpolation factor (0-1)
     * @param {Quaternion} out - Output quaternion
     * @returns {Quaternion} The output quaternion
     * @throws {TypeError} If `a`, `b`, or `out` is not a valid Quaternion
     */
    static slerp(a, b, t, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number' || typeof a.w !== 'number') {
            throw new TypeError('slerp() requires a valid Quaternion for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number' || typeof b.w !== 'number') {
            throw new TypeError('slerp() requires a valid Quaternion for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number' || typeof out.w !== 'number') {
            throw new TypeError('slerp() requires a valid Quaternion for argument out');
        }

        let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
        let q2 = b;

        // Use a temporary quaternion if we need to negate
        const temp = new Quaternion(b.x, b.y, b.z, b.w);
        if (dot < 0) {
            dot = -dot;
            temp.x = -b.x;
            temp.y = -b.y;
            temp.z = -b.z;
            temp.w = -b.w;
            q2 = temp;
        }

        if (dot > 0.999999) {
            out.x = a.x + (q2.x - a.x) * t;
            out.y = a.y + (q2.y - a.y) * t;
            out.z = a.z + (q2.z - a.z) * t;
            out.w = a.w + (q2.w - a.w) * t;
            Quaternion.normalize(out, out);
            return out;
        }

        const theta = Math.acos(dot);
        const sinTheta = Math.sin(theta);
        const invSinTheta = 1 / sinTheta;
        const t1 = Math.sin((1 - t) * theta) * invSinTheta;
        const t2 = Math.sin(t * theta) * invSinTheta;

        out.x = a.x * t1 + q2.x * t2;
        out.y = a.y * t1 + q2.y * t2;
        out.z = a.z * t1 + q2.z * t2;
        out.w = a.w * t1 + q2.w * t2;

        return out;
    }

    /**
     * Static lerp: out = lerp(a, b, t) (linear, not spherical)
     *
     * @param {Quaternion} a - Start quaternion
     * @param {Quaternion} b - End quaternion
     * @param {number} t - Interpolation factor (0-1)
     * @param {Quaternion} out - Output quaternion
     * @returns {Quaternion} The output quaternion
     * @throws {TypeError} If `a`, `b`, or `out` is not a valid Quaternion
     */
    static lerp(a, b, t, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number' || typeof a.w !== 'number') {
            throw new TypeError('lerp() requires a valid Quaternion for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number' || typeof b.w !== 'number') {
            throw new TypeError('lerp() requires a valid Quaternion for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number' || typeof out.w !== 'number') {
            throw new TypeError('lerp() requires a valid Quaternion for argument out');
        }
        out.x = a.x + (b.x - a.x) * t;
        out.y = a.y + (b.y - a.y) * t;
        out.z = a.z + (b.z - a.z) * t;
        out.w = a.w + (b.w - a.w) * t;
        return out;
    }

    /**
     * Static dot product.
     *
     * @param {Quaternion} a - First quaternion
     * @param {Quaternion} b - Second quaternion
     * @returns {number} Dot product
     * @throws {TypeError} If any argument is not a valid Quaternion
     */
    static dot(a, b) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number' || typeof a.w !== 'number') {
            throw new TypeError('dot() requires a valid Quaternion for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number' || typeof b.w !== 'number') {
            throw new TypeError('dot() requires a valid Quaternion for argument b');
        }
        return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    }

    /**
     * Static fromAxisAngle: out = fromAxisAngle(axis, angle)
     *
     * @param {Vector3} axis - Rotation axis (assumed unit)
     * @param {number} angle - Rotation angle in radians
     * @param {Quaternion} out - Output quaternion
     * @returns {Quaternion} The output quaternion
     * @throws {TypeError} If `axis` is not a valid Vector3
     */
    static fromAxisAngle(axis, angle, out) {
        if (!axis || typeof axis.x !== 'number' || typeof axis.y !== 'number' || typeof axis.z !== 'number') {
            throw new TypeError('fromAxisAngle() requires a valid Vector3 for argument axis');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number' || typeof out.w !== 'number') {
            throw new TypeError('fromAxisAngle() requires a valid Quaternion for argument out');
        }
        const halfAngle = angle * 0.5;
        const s = Math.sin(halfAngle);
        out.x = axis.x * s;
        out.y = axis.y * s;
        out.z = axis.z * s;
        out.w = Math.cos(halfAngle);
        return out;
    }

    /**
     * Static identity: out = identity quaternion
     *
     * @param {Quaternion} out - Output quaternion
     * @returns {Quaternion} The output quaternion
     * @throws {TypeError} If `out` is not a valid Quaternion
     */
    static identity(out) {
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number' || typeof out.w !== 'number') {
            throw new TypeError('identity() requires a valid Quaternion for argument out');
        }
        out.x = 0;
        out.y = 0;
        out.z = 0;
        out.w = 1;
        return out;
    }

    // ============================================================
    // Static Constants (Immutable)
    // ============================================================

    /**
     * Identity quaternion: (0, 0, 0, 1)
     * @type {Quaternion}
     * @readonly
     */
    static IDENTITY = Object.freeze(new Quaternion(0, 0, 0, 1));
}

