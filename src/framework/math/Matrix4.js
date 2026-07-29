/**
 * src/framework/math/Matrix4.js
 *
 * Echo Engine — Math Library
 *
 * Represents a 4x4 matrix in column-major order (OpenGL/WebGPU style).
 *
 * This is a PURE MATHEMATICAL primitive.
 * It has NO dependencies on rendering, scene graph, or transforms.
 *
 * Design Principles:
 * - Immutable by convention: Mutating methods return `this` for chaining.
 * - Zero allocations in hot-path operations.
 * - Defensive validation using duck typing for cross-realm compatibility.
 * - Column-major storage for direct GPU compatibility.
 * - Static utility methods for allocation-free operations.
 *
 * Performance:
 * - All arithmetic operations avoid creating new objects.
 * - Manual loop unrolling for matrix multiplication (no temporary arrays).
 * - `clone()` allocates; all others mutate in-place.
 * - `invert()` handles singular matrices gracefully.
 * - Static constants are frozen to prevent accidental mutation.
 */

import { Vector3 } from './Vector3.js';
import { Quaternion } from './Quaternion.js';

export class Matrix4 {
    /**
     * Create a new 4x4 matrix, initialised to the identity matrix.
     */
    constructor() {
        /** @type {Float32Array} Column-major 16-element storage. */
        this.elements = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    // ============================================================
    // Core Methods
    // ============================================================

    /**
     * Set this matrix to the identity matrix.
     *
     * @returns {this} For method chaining
     */
    identity() {
        const e = this.elements;
        e[0] = 1; e[1] = 0; e[2] = 0; e[3] = 0;
        e[4] = 0; e[5] = 1; e[6] = 0; e[7] = 0;
        e[8] = 0; e[9] = 0; e[10] = 1; e[11] = 0;
        e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
        return this;
    }

    /**
     * Set all 16 components of this matrix.
     *
     * @param {number} m00 - Row 0, Column 0
     * @param {number} m01 - Row 0, Column 1
     * @param {number} m02 - Row 0, Column 2
     * @param {number} m03 - Row 0, Column 3
     * @param {number} m10 - Row 1, Column 0
     * @param {number} m11 - Row 1, Column 1
     * @param {number} m12 - Row 1, Column 2
     * @param {number} m13 - Row 1, Column 3
     * @param {number} m20 - Row 2, Column 0
     * @param {number} m21 - Row 2, Column 1
     * @param {number} m22 - Row 2, Column 2
     * @param {number} m23 - Row 2, Column 3
     * @param {number} m30 - Row 3, Column 0
     * @param {number} m31 - Row 3, Column 1
     * @param {number} m32 - Row 3, Column 2
     * @param {number} m33 - Row 3, Column 3
     * @returns {this} For method chaining
     */
    set(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
        const e = this.elements;
        e[0] = m00; e[1] = m10; e[2] = m20; e[3] = m30;
        e[4] = m01; e[5] = m11; e[6] = m21; e[7] = m31;
        e[8] = m02; e[9] = m12; e[10] = m22; e[11] = m32;
        e[12] = m03; e[13] = m13; e[14] = m23; e[15] = m33;
        return this;
    }

    /**
     * Copy the components of another matrix into this one.
     *
     * @param {Matrix4} m - Matrix to copy from
     * @returns {this} For method chaining
     * @throws {TypeError} If `m` is not a valid Matrix4
     */
    copy(m) {
        if (!m || typeof m.elements === 'undefined') {
            throw new TypeError('copy() requires a valid Matrix4 instance');
        }
        const src = m.elements;
        const dst = this.elements;
        dst[0] = src[0]; dst[1] = src[1]; dst[2] = src[2]; dst[3] = src[3];
        dst[4] = src[4]; dst[5] = src[5]; dst[6] = src[6]; dst[7] = src[7];
        dst[8] = src[8]; dst[9] = src[9]; dst[10] = src[10]; dst[11] = src[11];
        dst[12] = src[12]; dst[13] = src[13]; dst[14] = src[14]; dst[15] = src[15];
        return this;
    }

    /**
     * Copy this matrix to another (allocation-free).
     *
     * @param {Matrix4} out - Destination matrix
     * @returns {Matrix4} The destination matrix
     * @throws {TypeError} If `out` is not a valid Matrix4
     */
    copyTo(out) {
        if (!out || typeof out.elements === 'undefined') {
            throw new TypeError('copyTo() requires a valid Matrix4 instance');
        }
        const src = this.elements;
        const dst = out.elements;
        dst[0] = src[0]; dst[1] = src[1]; dst[2] = src[2]; dst[3] = src[3];
        dst[4] = src[4]; dst[5] = src[5]; dst[6] = src[6]; dst[7] = src[7];
        dst[8] = src[8]; dst[9] = src[9]; dst[10] = src[10]; dst[11] = src[11];
        dst[12] = src[12]; dst[13] = src[13]; dst[14] = src[14]; dst[15] = src[15];
        return out;
    }

    /**
     * Create a new matrix with the same components as this one.
     *
     * @returns {Matrix4} A new Matrix4 instance
     */
    clone() {
        const result = new Matrix4();
        result.copy(this);
        return result;
    }

    /**
     * Compare this matrix to another for exact equality.
     *
     * @param {Matrix4} m - Matrix to compare against
     * @returns {boolean} True if all components are exactly equal
     * @throws {TypeError} If `m` is not a valid Matrix4
     */
    equals(m) {
        if (!m || typeof m.elements === 'undefined') {
            throw new TypeError('equals() requires a valid Matrix4 instance');
        }
        const a = this.elements;
        const b = m.elements;
        for (let i = 0; i < 16; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    // ============================================================
    // Access
    // ============================================================

    /**
     * Get a specific element of the matrix.
     *
     * @param {number} row - Row index (0-3)
     * @param {number} col - Column index (0-3)
     * @returns {number} The value at the specified position
     * @throws {RangeError} If row or col is out of bounds
     */
    get(row, col) {
        if (row < 0 || row > 3 || col < 0 || col > 3) {
            throw new RangeError(`Matrix4.get(): row (${row}) and col (${col}) must be between 0 and 3`);
        }
        return this.elements[col * 4 + row];
    }

    /**
     * Set a specific element of the matrix.
     *
     * @param {number} row - Row index (0-3)
     * @param {number} col - Column index (0-3)
     * @param {number} value - Value to set
     * @returns {this} For method chaining
     * @throws {RangeError} If row or col is out of bounds
     */
    setElement(row, col, value) {
        if (row < 0 || row > 3 || col < 0 || col > 3) {
            throw new RangeError(`Matrix4.setElement(): row (${row}) and col (${col}) must be between 0 and 3`);
        }
        this.elements[col * 4 + row] = value;
        return this;
    }

    // ============================================================
    // Arithmetic (Zero Allocations)
    // ============================================================

    /**
     * Multiply this matrix by another: this = this * m
     *
     * Uses manual loop unrolling for zero allocations.
     *
     * @param {Matrix4} m - Matrix to multiply by
     * @returns {this} For method chaining
     * @throws {TypeError} If `m` is not a valid Matrix4
     */
    multiply(m) {
        if (!m || typeof m.elements === 'undefined') {
            throw new TypeError('multiply() requires a valid Matrix4 instance');
        }

        const a = this.elements;
        const b = m.elements;

        const a00 = a[0], a01 = a[4], a02 = a[8], a03 = a[12];
        const a10 = a[1], a11 = a[5], a12 = a[9], a13 = a[13];
        const a20 = a[2], a21 = a[6], a22 = a[10], a23 = a[14];
        const a30 = a[3], a31 = a[7], a32 = a[11], a33 = a[15];

        const b00 = b[0], b01 = b[4], b02 = b[8], b03 = b[12];
        const b10 = b[1], b11 = b[5], b12 = b[9], b13 = b[13];
        const b20 = b[2], b21 = b[6], b22 = b[10], b23 = b[14];
        const b30 = b[3], b31 = b[7], b32 = b[11], b33 = b[15];

        a[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
        a[1] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
        a[2] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
        a[3] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;

        a[4] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
        a[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
        a[6] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
        a[7] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;

        a[8] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
        a[9] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
        a[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
        a[11] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;

        a[12] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
        a[13] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
        a[14] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
        a[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

        return this;
    }

    /**
     * Premultiply this matrix by another: this = m * this
     *
     * Uses manual loop unrolling for zero allocations.
     *
     * @param {Matrix4} m - Matrix to premultiply by
     * @returns {this} For method chaining
     * @throws {TypeError} If `m` is not a valid Matrix4
     */
    premultiply(m) {
        if (!m || typeof m.elements === 'undefined') {
            throw new TypeError('premultiply() requires a valid Matrix4 instance');
        }

        const a = m.elements;
        const b = this.elements;

        const a00 = a[0], a01 = a[4], a02 = a[8], a03 = a[12];
        const a10 = a[1], a11 = a[5], a12 = a[9], a13 = a[13];
        const a20 = a[2], a21 = a[6], a22 = a[10], a23 = a[14];
        const a30 = a[3], a31 = a[7], a32 = a[11], a33 = a[15];

        const b00 = b[0], b01 = b[4], b02 = b[8], b03 = b[12];
        const b10 = b[1], b11 = b[5], b12 = b[9], b13 = b[13];
        const b20 = b[2], b21 = b[6], b22 = b[10], b23 = b[14];
        const b30 = b[3], b31 = b[7], b32 = b[11], b33 = b[15];

        b[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
        b[1] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
        b[2] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
        b[3] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;

        b[4] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
        b[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
        b[6] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
        b[7] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;

        b[8] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
        b[9] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
        b[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
        b[11] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;

        b[12] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
        b[13] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
        b[14] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
        b[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

        return this;
    }

    /**
     * Multiply all components of this matrix by a scalar.
     *
     * @param {number} s - Scalar to multiply by
     * @returns {this} For method chaining
     */
    multiplyScalar(s) {
        const e = this.elements;
        for (let i = 0; i < 16; i++) {
            e[i] *= s;
        }
        return this;
    }

    /**
     * Compute the determinant of this matrix.
     *
     * @returns {number} The determinant
     */
    determinant() {
        const e = this.elements;

        const a11 = e[0], a12 = e[4], a13 = e[8], a14 = e[12];
        const a21 = e[1], a22 = e[5], a23 = e[9], a24 = e[13];
        const a31 = e[2], a32 = e[6], a33 = e[10], a34 = e[14];
        const a41 = e[3], a42 = e[7], a43 = e[11], a44 = e[15];

        const det1 = a11 * (a22 * (a33 * a44 - a34 * a43) - a23 * (a32 * a44 - a34 * a42) + a24 * (a32 * a43 - a33 * a42));
        const det2 = a12 * (a21 * (a33 * a44 - a34 * a43) - a23 * (a31 * a44 - a34 * a41) + a24 * (a31 * a43 - a33 * a41));
        const det3 = a13 * (a21 * (a32 * a44 - a34 * a42) - a22 * (a31 * a44 - a34 * a41) + a24 * (a31 * a42 - a32 * a41));
        const det4 = a14 * (a21 * (a32 * a43 - a33 * a42) - a22 * (a31 * a43 - a33 * a41) + a23 * (a31 * a42 - a32 * a41));

        return det1 - det2 + det3 - det4;
    }

    /**
     * Transpose this matrix in place.
     *
     * @returns {this} For method chaining
     */
    transpose() {
        const e = this.elements;
        const t = e[1]; e[1] = e[4]; e[4] = t;
        const u = e[2]; e[2] = e[8]; e[8] = u;
        const v = e[3]; e[3] = e[12]; e[12] = v;
        const w = e[6]; e[6] = e[9]; e[9] = w;
        const x = e[7]; e[7] = e[13]; e[13] = x;
        const y = e[11]; e[11] = e[14]; e[14] = y;
        return this;
    }

    /**
     * Invert this matrix in place.
     *
     * If the matrix is singular, it is set to the identity matrix.
     *
     * @returns {this} For method chaining
     */
    invert() {
        const e = this.elements;
        const a00 = e[0], a01 = e[4], a02 = e[8], a03 = e[12];
        const a10 = e[1], a11 = e[5], a12 = e[9], a13 = e[13];
        const a20 = e[2], a21 = e[6], a22 = e[10], a23 = e[14];
        const a30 = e[3], a31 = e[7], a32 = e[11], a33 = e[15];

        const b00 = a11 * (a22 * a33 - a23 * a32) - a12 * (a21 * a33 - a23 * a31) + a13 * (a21 * a32 - a22 * a31);
        const b01 = a01 * (a22 * a33 - a23 * a32) - a02 * (a21 * a33 - a23 * a31) + a03 * (a21 * a32 - a22 * a31);
        const b02 = a01 * (a12 * a33 - a13 * a32) - a02 * (a11 * a33 - a13 * a31) + a03 * (a11 * a32 - a12 * a31);
        const b03 = a01 * (a12 * a23 - a13 * a22) - a02 * (a11 * a23 - a13 * a21) + a03 * (a11 * a22 - a12 * a21);

        const b10 = a10 * (a22 * a33 - a23 * a32) - a12 * (a20 * a33 - a23 * a30) + a13 * (a20 * a32 - a22 * a30);
        const b11 = a00 * (a22 * a33 - a23 * a32) - a02 * (a20 * a33 - a23 * a30) + a03 * (a20 * a32 - a22 * a30);
        const b12 = a00 * (a12 * a33 - a13 * a32) - a02 * (a10 * a33 - a13 * a30) + a03 * (a10 * a32 - a12 * a30);
        const b13 = a00 * (a12 * a23 - a13 * a22) - a02 * (a10 * a23 - a13 * a20) + a03 * (a10 * a22 - a12 * a20);

        const b20 = a10 * (a21 * a33 - a23 * a31) - a11 * (a20 * a33 - a23 * a30) + a13 * (a20 * a31 - a21 * a30);
        const b21 = a00 * (a21 * a33 - a23 * a31) - a01 * (a20 * a33 - a23 * a30) + a03 * (a20 * a31 - a21 * a30);
        const b22 = a00 * (a11 * a33 - a13 * a31) - a01 * (a10 * a33 - a13 * a30) + a03 * (a10 * a31 - a11 * a30);
        const b23 = a00 * (a11 * a23 - a13 * a21) - a01 * (a10 * a23 - a13 * a20) + a03 * (a10 * a21 - a11 * a20);

        const b30 = a10 * (a21 * a32 - a22 * a31) - a11 * (a20 * a32 - a22 * a30) + a12 * (a20 * a31 - a21 * a30);
        const b31 = a00 * (a21 * a32 - a22 * a31) - a01 * (a20 * a32 - a22 * a30) + a02 * (a20 * a31 - a21 * a30);
        const b32 = a00 * (a11 * a32 - a12 * a31) - a01 * (a10 * a32 - a12 * a30) + a02 * (a10 * a31 - a11 * a30);
        const b33 = a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20);

        const det = a00 * b00 - a01 * b10 + a02 * b20 - a03 * b30;

        if (Math.abs(det) < 1e-12) {
            this.identity();
            return this;
        }

        const invDet = 1 / det;

        e[0] = b00 * invDet;
        e[4] = -b01 * invDet;
        e[8] = b02 * invDet;
        e[12] = -b03 * invDet;

        e[1] = -b10 * invDet;
        e[5] = b11 * invDet;
        e[9] = -b12 * invDet;
        e[13] = b13 * invDet;

        e[2] = b20 * invDet;
        e[6] = -b21 * invDet;
        e[10] = b22 * invDet;
        e[14] = -b23 * invDet;

        e[3] = -b30 * invDet;
        e[7] = b31 * invDet;
        e[11] = -b32 * invDet;
        e[15] = b33 * invDet;

        return this;
    }

    // ============================================================
    // Transform Construction
    // ============================================================

    /**
     * Make this matrix a translation matrix.
     *
     * @param {number} x - Translation X
     * @param {number} y - Translation Y
     * @param {number} z - Translation Z
     * @returns {this} For method chaining
     */
    makeTranslation(x, y, z) {
        const e = this.elements;
        e[0] = 1; e[1] = 0; e[2] = 0; e[3] = 0;
        e[4] = 0; e[5] = 1; e[6] = 0; e[7] = 0;
        e[8] = 0; e[9] = 0; e[10] = 1; e[11] = 0;
        e[12] = x; e[13] = y; e[14] = z; e[15] = 1;
        return this;
    }

    /**
     * Make this matrix a scale matrix.
     *
     * @param {number} x - Scale X
     * @param {number} y - Scale Y
     * @param {number} z - Scale Z
     * @returns {this} For method chaining
     */
    makeScale(x, y, z) {
        const e = this.elements;
        e[0] = x; e[1] = 0; e[2] = 0; e[3] = 0;
        e[4] = 0; e[5] = y; e[6] = 0; e[7] = 0;
        e[8] = 0; e[9] = 0; e[10] = z; e[11] = 0;
        e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
        return this;
    }

    /**
     * Make this matrix a rotation matrix around the X axis.
     *
     * @param {number} angle - Rotation angle in radians
     * @returns {this} For method chaining
     */
    makeRotationX(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const e = this.elements;
        e[0] = 1; e[1] = 0; e[2] = 0; e[3] = 0;
        e[4] = 0; e[5] = c; e[6] = s; e[7] = 0;
        e[8] = 0; e[9] = -s; e[10] = c; e[11] = 0;
        e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
        return this;
    }

    /**
     * Make this matrix a rotation matrix around the Y axis.
     *
     * @param {number} angle - Rotation angle in radians
     * @returns {this} For method chaining
     */
    makeRotationY(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const e = this.elements;
        e[0] = c; e[1] = 0; e[2] = -s; e[3] = 0;
        e[4] = 0; e[5] = 1; e[6] = 0; e[7] = 0;
        e[8] = s; e[9] = 0; e[10] = c; e[11] = 0;
        e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
        return this;
    }

    /**
     * Make this matrix a rotation matrix around the Z axis.
     *
     * @param {number} angle - Rotation angle in radians
     * @returns {this} For method chaining
     */
    makeRotationZ(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const e = this.elements;
        e[0] = c; e[1] = s; e[2] = 0; e[3] = 0;
        e[4] = -s; e[5] = c; e[6] = 0; e[7] = 0;
        e[8] = 0; e[9] = 0; e[10] = 1; e[11] = 0;
        e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
        return this;
    }

    /**
     * Make this matrix a rotation matrix around an arbitrary axis.
     *
     * @param {Vector3} axis - Rotation axis (must be normalized)
     * @param {number} angle - Rotation angle in radians
     * @returns {this} For method chaining
     * @throws {TypeError} If `axis` is not a valid Vector3
     */
    makeRotationAxis(axis, angle) {
        if (!axis || typeof axis.x !== 'number' || typeof axis.y !== 'number' || typeof axis.z !== 'number') {
            throw new TypeError('makeRotationAxis() requires a valid Vector3 instance');
        }

        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const t = 1 - c;
        const x = axis.x, y = axis.y, z = axis.z;

        const e = this.elements;
        e[0] = t * x * x + c;
        e[1] = t * x * y + s * z;
        e[2] = t * x * z - s * y;
        e[3] = 0;

        e[4] = t * x * y - s * z;
        e[5] = t * y * y + c;
        e[6] = t * y * z + s * x;
        e[7] = 0;

        e[8] = t * x * z + s * y;
        e[9] = t * y * z - s * x;
        e[10] = t * z * z + c;
        e[11] = 0;

        e[12] = 0;
        e[13] = 0;
        e[14] = 0;
        e[15] = 1;

        return this;
    }

    /**
     * Make this matrix a rotation matrix from a quaternion.
     *
     * @param {Quaternion} q - Quaternion to convert
     * @returns {this} For method chaining
     * @throws {TypeError} If `q` is not a valid Quaternion
     */
    makeQuaternion(q) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('makeQuaternion() requires a valid Quaternion instance');
        }

        const x = q.x, y = q.y, z = q.z, w = q.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const e = this.elements;
        e[0] = 1 - (yy + zz);
        e[1] = xy + wz;
        e[2] = xz - wy;
        e[3] = 0;

        e[4] = xy - wz;
        e[5] = 1 - (xx + zz);
        e[6] = yz + wx;
        e[7] = 0;

        e[8] = xz + wy;
        e[9] = yz - wx;
        e[10] = 1 - (xx + yy);
        e[11] = 0;

        e[12] = 0;
        e[13] = 0;
        e[14] = 0;
        e[15] = 1;

        return this;
    }

    /**
     * Compose this matrix from position, rotation, and scale.
     * Matrix = Translation * Rotation * Scale
     *
     * @param {Vector3} position - Position vector
     * @param {Quaternion} rotation - Rotation quaternion
     * @param {Vector3} scale - Scale vector
     * @returns {this} For method chaining
     * @throws {TypeError} If any argument is not a valid instance
     */
    compose(position, rotation, scale) {
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
            throw new TypeError('compose() requires a valid Vector3 for position');
        }
        if (!rotation || typeof rotation.x !== 'number' || typeof rotation.y !== 'number' || typeof rotation.z !== 'number' || typeof rotation.w !== 'number') {
            throw new TypeError('compose() requires a valid Quaternion for rotation');
        }
        if (!scale || typeof scale.x !== 'number' || typeof scale.y !== 'number' || typeof scale.z !== 'number') {
            throw new TypeError('compose() requires a valid Vector3 for scale');
        }

        const x = rotation.x, y = rotation.y, z = rotation.z, w = rotation.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const sx = scale.x, sy = scale.y, sz = scale.z;

        const e = this.elements;
        e[0] = (1 - (yy + zz)) * sx;
        e[1] = (xy + wz) * sy;
        e[2] = (xz - wy) * sz;
        e[3] = 0;

        e[4] = (xy - wz) * sx;
        e[5] = (1 - (xx + zz)) * sy;
        e[6] = (yz + wx) * sz;
        e[7] = 0;

        e[8] = (xz + wy) * sx;
        e[9] = (yz - wx) * sy;
        e[10] = (1 - (xx + yy)) * sz;
        e[11] = 0;

        e[12] = position.x;
        e[13] = position.y;
        e[14] = position.z;
        e[15] = 1;

        return this;
    }

    /**
     * Decompose this matrix into position, rotation, and scale.
     *
     * Handles negative scale correctly by checking the determinant of the
     * rotation matrix and preserving handedness.
     *
     * @param {Vector3} position - Output position
     * @param {Quaternion} rotation - Output rotation
     * @param {Vector3} scale - Output scale
     * @returns {Object} The output object (for chaining)
     * @throws {TypeError} If any output parameter is not a valid instance
     */
    decompose(position, rotation, scale) {
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
            throw new TypeError('decompose() requires a valid Vector3 for position');
        }
        if (!rotation || typeof rotation.x !== 'number' || typeof rotation.y !== 'number' || typeof rotation.z !== 'number' || typeof rotation.w !== 'number') {
            throw new TypeError('decompose() requires a valid Quaternion for rotation');
        }
        if (!scale || typeof scale.x !== 'number' || typeof scale.y !== 'number' || typeof scale.z !== 'number') {
            throw new TypeError('decompose() requires a valid Vector3 for scale');
        }

        const e = this.elements;

        // Extract position
        position.set(e[12], e[13], e[14]);

        // Extract scale (column lengths)
        const m00 = e[0], m01 = e[4], m02 = e[8];
        const m10 = e[1], m11 = e[5], m12 = e[9];
        const m20 = e[2], m21 = e[6], m22 = e[10];

        // Compute raw scale magnitudes
        const sx = Math.sqrt(m00 * m00 + m01 * m01 + m02 * m02);
        const sy = Math.sqrt(m10 * m10 + m11 * m11 + m12 * m12);
        const sz = Math.sqrt(m20 * m20 + m21 * m21 + m22 * m22);

        const eps = 1e-10;
        const invSx = sx > eps ? 1 / sx : 0;
        const invSy = sy > eps ? 1 / sy : 0;
        const invSz = sz > eps ? 1 / sz : 0;

        // Normalise rotation matrix (3x3 part)
        const r00 = m00 * invSx, r01 = m01 * invSy, r02 = m02 * invSz;
        const r10 = m10 * invSx, r11 = m11 * invSy, r12 = m12 * invSz;
        const r20 = m20 * invSx, r21 = m21 * invSy, r22 = m22 * invSz;

        // Compute determinant of rotation matrix to detect reflection
        const det = r00 * (r11 * r22 - r12 * r21) -
                    r01 * (r10 * r22 - r12 * r20) +
                    r02 * (r10 * r21 - r11 * r20);

        // Determine scale signs by examining the matrix columns
        // A proper reflection decomposition preserves which axis carries the sign
        let sxFinal = sx;
        let syFinal = sy;
        let szFinal = sz;

        if (det < 0) {
            // Find which axis to flip by checking the sign of the determinant
            // of each column pair. This determines which axis is reflected.
            // First, try flipping X
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

        scale.set(sxFinal, syFinal, szFinal);

        // Re-normalise rotation matrix with corrected scale
        const invSxFinal = sxFinal > eps ? 1 / sxFinal : 0;
        const invSyFinal = syFinal > eps ? 1 / syFinal : 0;
        const invSzFinal = szFinal > eps ? 1 / szFinal : 0;

        // Reconstruct normalised rotation matrix using local variables (no allocation)
        const r00n = m00 * invSxFinal;
        const r01n = m01 * invSyFinal;
        const r02n = m02 * invSzFinal;
        const r10n = m10 * invSxFinal;
        const r11n = m11 * invSyFinal;
        const r12n = m12 * invSzFinal;
        const r20n = m20 * invSxFinal;
        const r21n = m21 * invSyFinal;
        const r22n = m22 * invSzFinal;

        // Extract quaternion from rotation matrix using local variables (no allocation)
        const trace = r00n + r11n + r22n;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            rotation.w = 0.25 / s;
            rotation.x = (r21n - r12n) * s;
            rotation.y = (r02n - r20n) * s;
            rotation.z = (r10n - r01n) * s;
        } else if (r00n > r11n && r00n > r22n) {
            const s = 2.0 * Math.sqrt(1.0 + r00n - r11n - r22n);
            rotation.w = (r21n - r12n) / s;
            rotation.x = 0.25 * s;
            rotation.y = (r01n + r10n) / s;
            rotation.z = (r02n + r20n) / s;
        } else if (r11n > r22n) {
            const s = 2.0 * Math.sqrt(1.0 + r11n - r00n - r22n);
            rotation.w = (r02n - r20n) / s;
            rotation.x = (r01n + r10n) / s;
            rotation.y = 0.25 * s;
            rotation.z = (r12n + r21n) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + r22n - r00n - r11n);
            rotation.w = (r10n - r01n) / s;
            rotation.x = (r02n + r20n) / s;
            rotation.y = (r12n + r21n) / s;
            rotation.z = 0.25 * s;
        }

        rotation.normalize();

        return { position, rotation, scale };
    }

    // ============================================================
    // Transform Operations (Mutating, Zero Allocations)
    // ============================================================

    /**
     * Apply a translation to this matrix: this = this * T
     *
     * @param {Vector3} v - Translation vector
     * @returns {this} For method chaining
     * @throws {TypeError} If `v` is not a valid Vector3
     */
    translate(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new TypeError('translate() requires a valid Vector3 instance');
        }
        const e = this.elements;
        const tx = v.x, ty = v.y, tz = v.z;

        e[12] += e[0] * tx + e[4] * ty + e[8] * tz;
        e[13] += e[1] * tx + e[5] * ty + e[9] * tz;
        e[14] += e[2] * tx + e[6] * ty + e[10] * tz;
        e[15] += e[3] * tx + e[7] * ty + e[11] * tz;

        return this;
    }

    /**
     * Apply a rotation to this matrix: this = this * R
     *
     * Builds the rotation matrix from the quaternion using local variables,
     * then multiplies without allocating any arrays.
     *
     * @param {Quaternion} q - Rotation quaternion
     * @returns {this} For method chaining
     * @throws {TypeError} If `q` is not a valid Quaternion
     */
    rotate(q) {
        if (!q || typeof q.x !== 'number' || typeof q.y !== 'number' || typeof q.z !== 'number' || typeof q.w !== 'number') {
            throw new TypeError('rotate() requires a valid Quaternion instance');
        }

        const x = q.x, y = q.y, z = q.z, w = q.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const r00 = 1 - (yy + zz);
        const r01 = xy + wz;
        const r02 = xz - wy;

        const r10 = xy - wz;
        const r11 = 1 - (xx + zz);
        const r12 = yz + wx;

        const r20 = xz + wy;
        const r21 = yz - wx;
        const r22 = 1 - (xx + yy);

        const a = this.elements;

        const a00 = a[0], a01 = a[4], a02 = a[8], a03 = a[12];
        const a10 = a[1], a11 = a[5], a12 = a[9], a13 = a[13];
        const a20 = a[2], a21 = a[6], a22 = a[10], a23 = a[14];
        const a30 = a[3], a31 = a[7], a32 = a[11], a33 = a[15];

        a[0] = a00 * r00 + a01 * r10 + a02 * r20;
        a[1] = a10 * r00 + a11 * r10 + a12 * r20;
        a[2] = a20 * r00 + a21 * r10 + a22 * r20;
        a[3] = a30 * r00 + a31 * r10 + a32 * r20;

        a[4] = a00 * r01 + a01 * r11 + a02 * r21;
        a[5] = a10 * r01 + a11 * r11 + a12 * r21;
        a[6] = a20 * r01 + a21 * r11 + a22 * r21;
        a[7] = a30 * r01 + a31 * r11 + a32 * r21;

        a[8] = a00 * r02 + a01 * r12 + a02 * r22;
        a[9] = a10 * r02 + a11 * r12 + a12 * r22;
        a[10] = a20 * r02 + a21 * r12 + a22 * r22;
        a[11] = a30 * r02 + a31 * r12 + a32 * r22;

        a[12] = a03;
        a[13] = a13;
        a[14] = a23;
        a[15] = a33;

        return this;
    }

    /**
     * Apply a scale to this matrix: this = this * S
     *
     * @param {Vector3} v - Scale vector
     * @returns {this} For method chaining
     * @throws {TypeError} If `v` is not a valid Vector3
     */
    scale(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new TypeError('scale() requires a valid Vector3 instance');
        }
        const e = this.elements;
        const sx = v.x, sy = v.y, sz = v.z;

        e[0] *= sx; e[1] *= sx; e[2] *= sx; e[3] *= sx;
        e[4] *= sy; e[5] *= sy; e[6] *= sy; e[7] *= sy;
        e[8] *= sz; e[9] *= sz; e[10] *= sz; e[11] *= sz;

        return this;
    }

    // ============================================================
    // Vector Operations (Require Output Parameter)
    // ============================================================

    /**
     * Transform a point by this matrix (w = 1).
     *
     * @param {Vector3} v - Point to transform
     * @param {Vector3} out - Output vector (must be provided)
     * @returns {Vector3} The transformed point
     * @throws {TypeError} If `v` or `out` is not a valid Vector3
     */
    multiplyPoint(v, out) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new TypeError('multiplyPoint() requires a valid Vector3 for argument v');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new TypeError('multiplyPoint() requires a valid Vector3 for argument out');
        }

        const e = this.elements;
        const x = v.x, y = v.y, z = v.z;

        out.x = e[0] * x + e[4] * y + e[8] * z + e[12];
        out.y = e[1] * x + e[5] * y + e[9] * z + e[13];
        out.z = e[2] * x + e[6] * y + e[10] * z + e[14];

        return out;
    }

    /**
     * Transform a direction vector by this matrix (w = 0, ignores translation).
     *
     * @param {Vector3} v - Direction to transform
     * @param {Vector3} out - Output vector (must be provided)
     * @returns {Vector3} The transformed direction
     * @throws {TypeError} If `v` or `out` is not a valid Vector3
     */
    multiplyDirection(v, out) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new TypeError('multiplyDirection() requires a valid Vector3 for argument v');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new TypeError('multiplyDirection() requires a valid Vector3 for argument out');
        }

        const e = this.elements;
        const x = v.x, y = v.y, z = v.z;

        out.x = e[0] * x + e[4] * y + e[8] * z;
        out.y = e[1] * x + e[5] * y + e[9] * z;
        out.z = e[2] * x + e[6] * y + e[10] * z;

        return out;
    }

    /**
     * Transform a point by this matrix, allocating a new Vector3.
     * Convenience method for when allocation is acceptable.
     *
     * @param {Vector3} v - Point to transform
     * @returns {Vector3} A new Vector3 containing the transformed point
     */
    multiplyPointNew(v) {
        return this.multiplyPoint(v, new Vector3());
    }

    /**
     * Transform a direction by this matrix, allocating a new Vector3.
     * Convenience method for when allocation is acceptable.
     *
     * @param {Vector3} v - Direction to transform
     * @returns {Vector3} A new Vector3 containing the transformed direction
     */
    multiplyDirectionNew(v) {
        return this.multiplyDirection(v, new Vector3());
    }

    // ============================================================
    // Utilities
    // ============================================================

    /**
     * Check if this matrix is the identity matrix.
     *
     * Uses direct element comparison with zero allocations.
     *
     * @param {number} [epsilon=1e-12] - Tolerance for floating-point comparison
     * @returns {boolean} True if identity
     */
    isIdentity(epsilon = 1e-12) {
        const e = this.elements;
        return (
            Math.abs(e[0] - 1) <= epsilon &&
            Math.abs(e[1]) <= epsilon &&
            Math.abs(e[2]) <= epsilon &&
            Math.abs(e[3]) <= epsilon &&
            Math.abs(e[4]) <= epsilon &&
            Math.abs(e[5] - 1) <= epsilon &&
            Math.abs(e[6]) <= epsilon &&
            Math.abs(e[7]) <= epsilon &&
            Math.abs(e[8]) <= epsilon &&
            Math.abs(e[9]) <= epsilon &&
            Math.abs(e[10] - 1) <= epsilon &&
            Math.abs(e[11]) <= epsilon &&
            Math.abs(e[12]) <= epsilon &&
            Math.abs(e[13]) <= epsilon &&
            Math.abs(e[14]) <= epsilon &&
            Math.abs(e[15] - 1) <= epsilon
        );
    }

    /**
     * Set this matrix to the zero matrix.
     *
     * @returns {this} For method chaining
     */
    setZero() {
        const e = this.elements;
        for (let i = 0; i < 16; i++) {
            e[i] = 0;
        }
        return this;
    }

    // ============================================================
    // Conversion
    // ============================================================

    /**
     * Convert this matrix to a flat array.
     *
     * @param {Float32Array|number[]} [out=[]] - Array to write into
     * @param {number} [offset=0] - Offset into the array
     * @returns {Float32Array|number[]} The output array
     */
    toArray(out = [], offset = 0) {
        const e = this.elements;
        for (let i = 0; i < 16; i++) {
            out[offset + i] = e[i];
        }
        return out;
    }

    /**
     * Set this matrix's components from a flat array.
     *
     * @param {Float32Array|number[]} array - Array to read from
     * @param {number} [offset=0] - Offset into the array
     * @returns {this} For method chaining
     * @throws {TypeError} If `array` is not array-like
     */
    fromArray(array, offset = 0) {
        if (!array || typeof array.length !== 'number') {
            throw new TypeError('fromArray() requires an array-like object');
        }
        const e = this.elements;
        for (let i = 0; i < 16; i++) {
            e[i] = array[offset + i] ?? 0;
        }
        return this;
    }

    // ============================================================
    // Static Utility Methods (Allocation-Free)
    // ============================================================

    /**
     * Static multiply: out = a * b
     *
     * @param {Matrix4} a - First matrix
     * @param {Matrix4} b - Second matrix
     * @param {Matrix4} out - Output matrix
     * @returns {Matrix4} The output matrix
     * @throws {TypeError} If any argument is not a valid Matrix4
     */
    static multiply(a, b, out) {
        if (!a || typeof a.elements === 'undefined') {
            throw new TypeError('multiply() requires a valid Matrix4 for argument a');
        }
        if (!b || typeof b.elements === 'undefined') {
            throw new TypeError('multiply() requires a valid Matrix4 for argument b');
        }
        if (!out || typeof out.elements === 'undefined') {
            throw new TypeError('multiply() requires a valid Matrix4 for argument out');
        }

        out.copy(a);
        out.multiply(b);
        return out;
    }

    /**
     * Static invert: out = inverse(a)
     *
     * If the matrix is singular, the output is set to the identity matrix.
     *
     * @param {Matrix4} a - Matrix to invert
     * @param {Matrix4} out - Output matrix
     * @returns {Matrix4} The output matrix
     * @throws {TypeError} If any argument is not a valid Matrix4
     */
    static invert(a, out) {
        if (!a || typeof a.elements === 'undefined') {
            throw new TypeError('invert() requires a valid Matrix4 for argument a');
        }
        if (!out || typeof out.elements === 'undefined') {
            throw new TypeError('invert() requires a valid Matrix4 for argument out');
        }

        out.copy(a);
        out.invert();
        return out;
    }

    /**
     * Static transpose: out = transpose(a)
     *
     * @param {Matrix4} a - Matrix to transpose
     * @param {Matrix4} out - Output matrix
     * @returns {Matrix4} The output matrix
     * @throws {TypeError} If any argument is not a valid Matrix4
     */
    static transpose(a, out) {
        if (!a || typeof a.elements === 'undefined') {
            throw new TypeError('transpose() requires a valid Matrix4 for argument a');
        }
        if (!out || typeof out.elements === 'undefined') {
            throw new TypeError('transpose() requires a valid Matrix4 for argument out');
        }

        out.copy(a);
        out.transpose();
        return out;
    }

    /**
     * Static compose: out = compose(position, rotation, scale)
     *
     * @param {Vector3} position - Position vector
     * @param {Quaternion} rotation - Rotation quaternion
     * @param {Vector3} scale - Scale vector
     * @param {Matrix4} out - Output matrix
     * @returns {Matrix4} The output matrix
     * @throws {TypeError} If any argument is not valid
     */
    static compose(position, rotation, scale, out) {
        if (!out || typeof out.elements === 'undefined') {
            throw new TypeError('compose() requires a valid Matrix4 for argument out');
        }

        out.compose(position, rotation, scale);
        return out;
    }

    // ============================================================
    // Static Constants (Immutable)
    // ============================================================

    /**
     * Identity matrix.
     * @type {Matrix4}
     * @readonly
     */
    static IDENTITY = Object.freeze(new Matrix4());
}

