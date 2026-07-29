/**
 * src/framework/math/Vector3.js
 *
 * Echo Engine — Math Library
 *
 * Represents a three-dimensional vector with x, y, z components.
 *
 * This is a PURE MATHEMATICAL primitive.
 * It has NO dependencies on rendering, scene graph, transforms, or matrices.
 *
 * Design Principles:
 * - Immutable by convention: Mutating methods return `this` for chaining.
 * - Zero allocations in hot-path operations (except where explicitly required).
 * - Defensive validation using duck typing (no instanceof) for cross-realm compatibility.
 * - Static utility methods for allocation-free operations.
 * - All methods are optimised for performance in release builds.
 *
 * Performance:
 * - All arithmetic operations avoid creating new objects unless necessary.
 * - `normalized()` and `clone()` allocate; all others mutate in-place.
 * - Static constants are frozen to prevent accidental mutation.
 * - Validation is minimal in release builds (duck typing only).
 */

export class Vector3 {
    /**
     * Create a new Vector3.
     *
     * @param {number} [x=0] - X component
     * @param {number} [y=0] - Y component
     * @param {number} [z=0] - Z component
     */
    constructor(x = 0, y = 0, z = 0) {
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
        /** @type {number} */
        this.z = z;
    }

    // ============================================================
    // Core Methods
    // ============================================================

    /**
     * Set all components of this vector.
     *
     * @param {number} x - X component
     * @param {number} y - Y component
     * @param {number} z - Z component
     * @returns {this} For method chaining
     */
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
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
     * Copy the components of another vector into this one.
     *
     * @param {Vector3} v - Vector to copy from
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    copy(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('copy() requires a valid Vector3 instance');
        }
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    /**
     * Copy this vector to another vector (allocation-free).
     *
     * @param {Vector3} out - Destination vector
     * @returns {Vector3} The destination vector
     * @throws {Error} If `out` is not a valid Vector3
     */
    copyTo(out) {
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('copyTo() requires a valid Vector3 instance');
        }
        out.x = this.x;
        out.y = this.y;
        out.z = this.z;
        return out;
    }

    /**
     * Create a new vector with the same components as this one.
     *
     * @returns {Vector3} A new Vector3 instance
     */
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    /**
     * Compare this vector to another for exact equality.
     *
     * @param {Vector3} v - Vector to compare against
     * @returns {boolean} True if all components are exactly equal
     * @throws {Error} If `v` is not a valid Vector3
     */
    equals(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('equals() requires a valid Vector3 instance');
        }
        return this.x === v.x && this.y === v.y && this.z === v.z;
    }

    /**
     * Check if this vector is the zero vector.
     *
     * @returns {boolean} True if all components are zero
     */
    isZero() {
        return this.x === 0 && this.y === 0 && this.z === 0;
    }

    /**
     * Set this vector to the zero vector.
     *
     * @returns {this} For method chaining
     */
    setZero() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        return this;
    }

    // ============================================================
    // Arithmetic (Mutating)
    // ============================================================

    /**
     * Add another vector to this one (component-wise).
     *
     * @param {Vector3} v - Vector to add
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    add(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('add() requires a valid Vector3 instance');
        }
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    /**
     * Subtract another vector from this one (component-wise).
     *
     * @param {Vector3} v - Vector to subtract
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    subtract(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('subtract() requires a valid Vector3 instance');
        }
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    /**
     * Multiply this vector by another vector (component-wise).
     *
     * @param {Vector3} v - Vector to multiply by
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    multiply(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('multiply() requires a valid Vector3 instance');
        }
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        return this;
    }

    /**
     * Divide this vector by another vector (component-wise).
     *
     * Division by zero is safely handled by treating the result as zero
     * for that component.
     *
     * @param {Vector3} v - Vector to divide by
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    divide(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('divide() requires a valid Vector3 instance');
        }
        this.x = (v.x !== 0) ? this.x / v.x : 0;
        this.y = (v.y !== 0) ? this.y / v.y : 0;
        this.z = (v.z !== 0) ? this.z / v.z : 0;
        return this;
    }

    /**
     * Add a scalar to all components.
     *
     * @param {number} s - Scalar to add
     * @returns {this} For method chaining
     */
    addScalar(s) {
        this.x += s;
        this.y += s;
        this.z += s;
        return this;
    }

    /**
     * Subtract a scalar from all components.
     *
     * @param {number} s - Scalar to subtract
     * @returns {this} For method chaining
     */
    subtractScalar(s) {
        this.x -= s;
        this.y -= s;
        this.z -= s;
        return this;
    }

    /**
     * Multiply all components by a scalar.
     *
     * @param {number} s - Scalar to multiply by
     * @returns {this} For method chaining
     */
    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    /**
     * Divide all components by a scalar.
     *
     * Division by zero is safely handled by setting all components to zero.
     *
     * @param {number} s - Scalar to divide by
     * @returns {this} For method chaining
     */
    divideScalar(s) {
        if (s !== 0) {
            const inv = 1 / s;
            this.x *= inv;
            this.y *= inv;
            this.z *= inv;
        } else {
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
        return this;
    }

    /**
     * Multiply this vector by a scalar and add another vector.
     * This is a fused operation: this = this * scalar + v
     *
     * @param {number} s - Scalar multiplier
     * @param {Vector3} v - Vector to add
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    multiplyAdd(s, v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('multiplyAdd() requires a valid Vector3 instance');
        }
        this.x = this.x * s + v.x;
        this.y = this.y * s + v.y;
        this.z = this.z * s + v.z;
        return this;
    }

    /**
     * Negate all components of this vector.
     *
     * @returns {this} For method chaining
     */
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    // ============================================================
    // Vector Math (Non-Mutating)
    // ============================================================

    /**
     * Compute the dot product of this vector and another.
     *
     * @param {Vector3} v - Vector to dot with
     * @returns {number} Dot product
     * @throws {Error} If `v` is not a valid Vector3
     */
    dot(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('dot() requires a valid Vector3 instance');
        }
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    /**
     * Compute the cross product of this vector and another.
     * This modifies this vector to the cross product result.
     *
     * @param {Vector3} v - Vector to cross with
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    cross(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('cross() requires a valid Vector3 instance');
        }
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /**
     * Compute the length (magnitude) of this vector.
     *
     * @returns {number} Length
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /**
     * Compute the squared length of this vector.
     *
     * @returns {number} Squared length
     */
    lengthSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    /**
     * Compute the distance between this vector and another.
     *
     * @param {Vector3} v - Vector to compute distance to
     * @returns {number} Distance
     * @throws {Error} If `v` is not a valid Vector3
     */
    distance(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('distance() requires a valid Vector3 instance');
        }
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Compute the squared distance between this vector and another.
     *
     * @param {Vector3} v - Vector to compute squared distance to
     * @returns {number} Squared distance
     * @throws {Error} If `v` is not a valid Vector3
     */
    distanceSquared(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('distanceSquared() requires a valid Vector3 instance');
        }
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Normalize this vector in place.
     *
     * If the vector is zero-length, it remains the zero vector.
     *
     * @returns {this} For method chaining
     */
    normalize() {
        const lenSq = this.lengthSquared();
        if (lenSq === 0 || lenSq === 1) {
            return this;
        }
        const invLen = 1 / Math.sqrt(lenSq);
        this.x *= invLen;
        this.y *= invLen;
        this.z *= invLen;
        return this;
    }

    /**
     * Return a normalized copy of this vector.
     *
     * If the vector is zero-length, a zero vector is returned.
     *
     * @returns {Vector3} A new normalized Vector3
     */
    normalized() {
        const lenSq = this.lengthSquared();
        if (lenSq === 0) {
            return new Vector3(0, 0, 0);
        }
        const invLen = 1 / Math.sqrt(lenSq);
        return new Vector3(this.x * invLen, this.y * invLen, this.z * invLen);
    }

    /**
     * Linearly interpolate between this vector and another.
     * This modifies this vector to the interpolated value.
     *
     * @param {Vector3} v - Target vector
     * @param {number} t - Interpolation factor (0-1)
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    lerp(v, t) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('lerp() requires a valid Vector3 instance');
        }
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
        return this;
    }

    // ============================================================
    // Projection
    // ============================================================

    /**
     * Project this vector onto another vector.
     * This modifies this vector to the projection result.
     *
     * @param {Vector3} v - Vector to project onto
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    projectOnVector(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('projectOnVector() requires a valid Vector3 instance');
        }
        const vLenSq = v.lengthSquared();
        if (vLenSq === 0) {
            this.setZero();
            return this;
        }
        const scalar = this.dot(v) / vLenSq;
        this.x = v.x * scalar;
        this.y = v.y * scalar;
        this.z = v.z * scalar;
        return this;
    }

    /**
     * Project this vector onto a plane defined by a normal.
     * This modifies this vector to the projection result.
     *
     * @param {Vector3} normal - Plane normal (assumed to be unit length)
     * @returns {this} For method chaining
     * @throws {Error} If `normal` is not a valid Vector3
     */
    projectOnPlane(normal) {
        if (!normal || typeof normal.x !== 'number' || typeof normal.y !== 'number' || typeof normal.z !== 'number') {
            throw new Error('projectOnPlane() requires a valid Vector3 instance');
        }
        const dot = this.dot(normal);
        this.x -= normal.x * dot;
        this.y -= normal.y * dot;
        this.z -= normal.z * dot;
        return this;
    }

    // ============================================================
    // Reflection
    // ============================================================

    /**
     * Reflect this vector across a plane defined by a normal.
     * This modifies this vector to the reflected result.
     *
     * @param {Vector3} normal - Plane normal (assumed to be unit length)
     * @returns {this} For method chaining
     * @throws {Error} If `normal` is not a valid Vector3
     */
    reflect(normal) {
        if (!normal || typeof normal.x !== 'number' || typeof normal.y !== 'number' || typeof normal.z !== 'number') {
            throw new Error('reflect() requires a valid Vector3 instance');
        }
        const dot = this.dot(normal);
        this.x -= 2 * normal.x * dot;
        this.y -= 2 * normal.y * dot;
        this.z -= 2 * normal.z * dot;
        return this;
    }

    // ============================================================
    // Utilities
    // ============================================================

    /**
     * Set each component to the minimum of this vector and another.
     *
     * @param {Vector3} v - Vector to compare against
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    min(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('min() requires a valid Vector3 instance');
        }
        this.x = Math.min(this.x, v.x);
        this.y = Math.min(this.y, v.y);
        this.z = Math.min(this.z, v.z);
        return this;
    }

    /**
     * Set each component to the maximum of this vector and another.
     *
     * @param {Vector3} v - Vector to compare against
     * @returns {this} For method chaining
     * @throws {Error} If `v` is not a valid Vector3
     */
    max(v) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('max() requires a valid Vector3 instance');
        }
        this.x = Math.max(this.x, v.x);
        this.y = Math.max(this.y, v.y);
        this.z = Math.max(this.z, v.z);
        return this;
    }

    /**
     * Clamp each component between a scalar minimum and maximum.
     *
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {this} For method chaining
     */
    clampScalar(min, max) {
        this.x = Math.max(min, Math.min(max, this.x));
        this.y = Math.max(min, Math.min(max, this.y));
        this.z = Math.max(min, Math.min(max, this.z));
        return this;
    }

    /**
     * Clamp each component between a vector minimum and maximum.
     *
     * @param {Vector3} min - Minimum vector
     * @param {Vector3} max - Maximum vector
     * @returns {this} For method chaining
     * @throws {Error} If `min` or `max` is not a valid Vector3
     */
    clampVector(min, max) {
        if (!min || typeof min.x !== 'number' || typeof min.y !== 'number' || typeof min.z !== 'number') {
            throw new Error('clampVector() requires a valid Vector3 instance for min');
        }
        if (!max || typeof max.x !== 'number' || typeof max.y !== 'number' || typeof max.z !== 'number') {
            throw new Error('clampVector() requires a valid Vector3 instance for max');
        }
        this.x = Math.max(min.x, Math.min(max.x, this.x));
        this.y = Math.max(min.y, Math.min(max.y, this.y));
        this.z = Math.max(min.z, Math.min(max.z, this.z));
        return this;
    }

    /**
     * Apply absolute value to each component.
     *
     * @returns {this} For method chaining
     */
    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        this.z = Math.abs(this.z);
        return this;
    }

    /**
     * Apply floor to each component.
     *
     * @returns {this} For method chaining
     */
    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.z = Math.floor(this.z);
        return this;
    }

    /**
     * Apply ceil to each component.
     *
     * @returns {this} For method chaining
     */
    ceil() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        this.z = Math.ceil(this.z);
        return this;
    }

    /**
     * Apply round to each component.
     *
     * @returns {this} For method chaining
     */
    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        this.z = Math.round(this.z);
        return this;
    }

    // ============================================================
    // Conversion
    // ============================================================

    /**
     * Convert this vector to a flat array.
     *
     * @param {number[]} [out=[]] - Array to write into
     * @param {number} [offset=0] - Offset into the array
     * @returns {number[]} The output array
     */
    toArray(out = [], offset = 0) {
        out[offset] = this.x;
        out[offset + 1] = this.y;
        out[offset + 2] = this.z;
        return out;
    }

    /**
     * Set this vector's components from a flat array.
     *
     * @param {number[]} array - Array to read from
     * @param {number} [offset=0] - Offset into the array
     * @returns {this} For method chaining
     * @throws {Error} If `array` is not array-like
     */
    fromArray(array, offset = 0) {
        if (!array || typeof array.length !== 'number') {
            throw new Error('fromArray() requires an array-like object');
        }
        this.x = array[offset] ?? 0;
        this.y = array[offset + 1] ?? 0;
        this.z = array[offset + 2] ?? 0;
        return this;
    }

    // ============================================================
    // Static Utility Methods (Allocation-Free)
    // ============================================================

    /**
     * Static add: out = a + b
     *
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {Error} If any argument is not a valid Vector3
     */
    static add(a, b, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('add() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('add() requires a valid Vector3 for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('add() requires a valid Vector3 for argument out');
        }
        out.x = a.x + b.x;
        out.y = a.y + b.y;
        out.z = a.z + b.z;
        return out;
    }

    /**
     * Static subtract: out = a - b
     *
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {Error} If any argument is not a valid Vector3
     */
    static subtract(a, b, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('subtract() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('subtract() requires a valid Vector3 for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('subtract() requires a valid Vector3 for argument out');
        }
        out.x = a.x - b.x;
        out.y = a.y - b.y;
        out.z = a.z - b.z;
        return out;
    }

    /**
     * Static multiply: out = a * b (component-wise)
     *
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {Error} If any argument is not a valid Vector3
     */
    static multiply(a, b, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('multiply() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('multiply() requires a valid Vector3 for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('multiply() requires a valid Vector3 for argument out');
        }
        out.x = a.x * b.x;
        out.y = a.y * b.y;
        out.z = a.z * b.z;
        return out;
    }

    /**
     * Static divide: out = a / b (component-wise)
     * Division by zero is safely handled by treating the result as zero.
     *
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {Error} If any argument is not a valid Vector3
     */
    static divide(a, b, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('divide() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('divide() requires a valid Vector3 for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('divide() requires a valid Vector3 for argument out');
        }
        out.x = (b.x !== 0) ? a.x / b.x : 0;
        out.y = (b.y !== 0) ? a.y / b.y : 0;
        out.z = (b.z !== 0) ? a.z / b.z : 0;
        return out;
    }

    /**
     * Static scale: out = v * s
     *
     * @param {Vector3} v - Vector to scale
     * @param {number} s - Scalar
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {Error} If `v` or `out` is not a valid Vector3
     */
    static scale(v, s, out) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('scale() requires a valid Vector3 for argument v');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('scale() requires a valid Vector3 for argument out');
        }
        out.x = v.x * s;
        out.y = v.y * s;
        out.z = v.z * s;
        return out;
    }

    /**
     * Static cross: out = a × b
     *
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {Error} If any argument is not a valid Vector3
     */
    static cross(a, b, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('cross() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('cross() requires a valid Vector3 for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('cross() requires a valid Vector3 for argument out');
        }
        out.x = a.y * b.z - a.z * b.y;
        out.y = a.z * b.x - a.x * b.z;
        out.z = a.x * b.y - a.y * b.x;
        return out;
    }

    /**
     * Static dot product.
     *
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @returns {number} Dot product
     * @throws {Error} If any argument is not a valid Vector3
     */
    static dot(a, b) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('dot() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('dot() requires a valid Vector3 for argument b');
        }
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    /**
     * Static distance.
     *
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @returns {number} Distance
     * @throws {Error} If any argument is not a valid Vector3
     */
    static distance(a, b) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('distance() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('distance() requires a valid Vector3 for argument b');
        }
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Static squared distance.
     *
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @returns {number} Squared distance
     * @throws {Error} If any argument is not a valid Vector3
     */
    static distanceSquared(a, b) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('distanceSquared() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('distanceSquared() requires a valid Vector3 for argument b');
        }
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Static lerp: out = a + (b - a) * t
     *
     * @param {Vector3} a - Start vector
     * @param {Vector3} b - End vector
     * @param {number} t - Interpolation factor (0-1)
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {Error} If `a`, `b`, or `out` is not a valid Vector3
     */
    static lerp(a, b, t, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('lerp() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('lerp() requires a valid Vector3 for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('lerp() requires a valid Vector3 for argument out');
        }
        out.x = a.x + (b.x - a.x) * t;
        out.y = a.y + (b.y - a.y) * t;
        out.z = a.z + (b.z - a.z) * t;
        return out;
    }

    /**
     * Static min: out = min(a, b) (component-wise)
     *
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {Error} If any argument is not a valid Vector3
     */
    static min(a, b, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('min() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('min() requires a valid Vector3 for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('min() requires a valid Vector3 for argument out');
        }
        out.x = Math.min(a.x, b.x);
        out.y = Math.min(a.y, b.y);
        out.z = Math.min(a.z, b.z);
        return out;
    }

    /**
     * Static max: out = max(a, b) (component-wise)
     *
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {Error} If any argument is not a valid Vector3
     */
    static max(a, b, out) {
        if (!a || typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number') {
            throw new Error('max() requires a valid Vector3 for argument a');
        }
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number') {
            throw new Error('max() requires a valid Vector3 for argument b');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('max() requires a valid Vector3 for argument out');
        }
        out.x = Math.max(a.x, b.x);
        out.y = Math.max(a.y, b.y);
        out.z = Math.max(a.z, b.z);
        return out;
    }

    /**
     * Static reflect: out = v - 2 * (v · n) * n
     *
     * @param {Vector3} v - Vector to reflect
     * @param {Vector3} normal - Plane normal (assumed unit)
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {Error} If any argument is not a valid Vector3
     */
    static reflect(v, normal, out) {
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') {
            throw new Error('reflect() requires a valid Vector3 for argument v');
        }
        if (!normal || typeof normal.x !== 'number' || typeof normal.y !== 'number' || typeof normal.z !== 'number') {
            throw new Error('reflect() requires a valid Vector3 for argument normal');
        }
        if (!out || typeof out.x !== 'number' || typeof out.y !== 'number' || typeof out.z !== 'number') {
            throw new Error('reflect() requires a valid Vector3 for argument out');
        }
        const dot = v.x * normal.x + v.y * normal.y + v.z * normal.z;
        out.x = v.x - 2 * normal.x * dot;
        out.y = v.y - 2 * normal.y * dot;
        out.z = v.z - 2 * normal.z * dot;
        return out;
    }

    // ============================================================
    // Static Constants (Immutable)
    // ============================================================

    /**
     * Zero vector: (0, 0, 0)
     * @type {Vector3}
     * @readonly
     */
    static ZERO = Object.freeze(new Vector3(0, 0, 0));

    /**
     * One vector: (1, 1, 1)
     * @type {Vector3}
     * @readonly
     */
    static ONE = Object.freeze(new Vector3(1, 1, 1));

    /**
     * Up vector: (0, 1, 0)
     * @type {Vector3}
     * @readonly
     */
    static UP = Object.freeze(new Vector3(0, 1, 0));

    /**
     * Down vector: (0, -1, 0)
     * @type {Vector3}
     * @readonly
     */
    static DOWN = Object.freeze(new Vector3(0, -1, 0));

    /**
     * Left vector: (-1, 0, 0)
     * @type {Vector3}
     * @readonly
     */
    static LEFT = Object.freeze(new Vector3(-1, 0, 0));

    /**
     * Right vector: (1, 0, 0)
     * @type {Vector3}
     * @readonly
     */
    static RIGHT = Object.freeze(new Vector3(1, 0, 0));

    /**
     * Forward vector: (0, 0, -1)
     * @type {Vector3}
     * @readonly
     */
    static FORWARD = Object.freeze(new Vector3(0, 0, -1));

    /**
     * Back vector: (0, 0, 1)
     * @type {Vector3}
     * @readonly
     */
    static BACK = Object.freeze(new Vector3(0, 0, 1));
}