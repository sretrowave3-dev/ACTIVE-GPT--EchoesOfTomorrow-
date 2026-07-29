/**
 * src/framework/math/Transform.js
 *
 * Echo Engine — Math Library
 *
 * Represents a 3D transform with position, rotation (quaternion), and scale.
 *
 * This is a SMART MATHEMATICAL OBJECT that owns its own TRS data and
 * provides mutating operations. Complex algorithms (compose, decompose,
 * interpolation) are delegated to TransformAlgorithms.
 *
 * Responsibilities:
 * - Store position (Vector3)
 * - Store rotation (Quaternion)
 * - Store scale (Vector3)
 * - Cache local matrix (Matrix4, reused)
 * - Track dirty state
 * - Provide mutating operations (translate, rotate, scale)
 * - Provide getters and setters
 * - Manage lazy matrix evaluation
 *
 * Design Principles:
 * - Single Responsibility: Transform owns only TRS data and local matrix cache
 * - Zero Allocations: No new Matrix4 allocations after construction
 * - Lazy Evaluation: Matrix computed only when requested and dirty
 * - Fluent API: Mutating methods return `this` for chaining
 * - Immutable Getters: Getters return copies, not references
 * - Defensive Validation: Duck typing on all public methods
 * - Future-Ready: _localMatrix naming prepares for world matrix support
 *
 * Performance:
 * - Matrix allocated once in constructor and reused forever
 * - Zero allocations in hot-path operations (translate, rotate, scale)
 * - getMatrix() only recomputes when dirty
 * - copyPosition() / copyRotation() / copyScale() are allocation-free
 * - Getters that return copies are the only allocation sources (by design)
 *
 * Ownership:
 * - Transform owns its position, rotation, scale, and _localMatrix
 * - getMatrix() returns a reference to the internal Matrix4
 * - Callers MUST treat the returned Matrix4 as read-only
 * - Modifying the returned Matrix4 directly invalidates Transform state
 */

import { Vector3 } from './Vector3.js';
import { Quaternion } from './Quaternion.js';
import { Matrix4 } from './Matrix4.js';
import { TransformAlgorithms } from './TransformAlgorithms.js';

export class Transform {
    /**
     * Create a new Transform.
     *
     * @param {Object} [options] - Optional configuration
     * @param {Vector3} [options.position] - Initial position (copied)
     * @param {Quaternion} [options.rotation] - Initial rotation (copied)
     * @param {Vector3} [options.scale] - Initial scale (copied)
     * @throws {TypeError} If any option is not a valid instance
     */
    constructor(options = {}) {
        /** @type {Vector3} */
        this._position = new Vector3();

        /** @type {Quaternion} */
        this._rotation = new Quaternion();

        /** @type {Vector3} */
        this._scale = new Vector3(1, 1, 1);

        /** @type {Matrix4} Reused local matrix cache (zero allocations). */
        this._localMatrix = new Matrix4();

        /** @type {boolean} Dirty flag for lazy matrix evaluation. */
        this._dirty = true;

        // Apply initial values if provided
        if ('position' in options) {
            const pos = options.position;
            if (!this._isVector3(pos)) {
                throw new TypeError('Transform: position must be a valid Vector3 instance');
            }
            this._position.copy(pos);
        }

        if ('rotation' in options) {
            const rot = options.rotation;
            if (!this._isQuaternion(rot)) {
                throw new TypeError('Transform: rotation must be a valid Quaternion instance');
            }
            this._rotation.copy(rot);
        }

        if ('scale' in options) {
            const scl = options.scale;
            if (!this._isVector3(scl)) {
                throw new TypeError('Transform: scale must be a valid Vector3 instance');
            }
            this._scale.copy(scl);
        }

        // Matrix is dirty because it hasn't been composed yet.
        this._dirty = true;
    }

    // ============================================================
    // Private Validation Helpers
    // ============================================================

    /**
     * Check if a value is a valid Vector3 instance (duck typing).
     *
     * @param {*} value - Value to check
     * @returns {boolean} True if value is a valid Vector3
     * @private
     */
    _isVector3(value) {
        return value && typeof value.x === 'number' &&
               typeof value.y === 'number' && typeof value.z === 'number';
    }

    /**
     * Check if a value is a valid Quaternion instance (duck typing).
     *
     * @param {*} value - Value to check
     * @returns {boolean} True if value is a valid Quaternion
     * @private
     */
    _isQuaternion(value) {
        return value && typeof value.x === 'number' &&
               typeof value.y === 'number' && typeof value.z === 'number' &&
               typeof value.w === 'number';
    }

    /**
     * Check if a value is a valid Transform instance (duck typing).
     *
     * @param {*} value - Value to check
     * @returns {boolean} True if value is a valid Transform
     * @private
     */
    _isTransform(value) {
        return value && typeof value._position !== 'undefined' &&
               typeof value._rotation !== 'undefined' &&
               typeof value._scale !== 'undefined';
    }

    // ============================================================
    // Getters (Return Copies)
    // ============================================================

    /**
     * Get a copy of the position.
     *
     * @returns {Vector3} Position (copy)
     */
    getPosition() {
        return this._position.clone();
    }

    /**
     * Get a copy of the rotation.
     *
     * @returns {Quaternion} Rotation (copy)
     */
    getRotation() {
        return this._rotation.clone();
    }

    /**
     * Get a copy of the scale.
     *
     * @returns {Vector3} Scale (copy)
     */
    getScale() {
        return this._scale.clone();
    }

    // ============================================================
    // Allocation-Free Copy Methods (Hot Path)
    // ============================================================

    /**
     * Copy position to output vector (allocation-free).
     *
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {TypeError} If `out` is not a valid Vector3
     */
    copyPosition(out) {
        if (!this._isVector3(out)) {
            throw new TypeError('copyPosition() requires a valid Vector3 instance');
        }
        out.copy(this._position);
        return out;
    }

    /**
     * Copy rotation to output quaternion (allocation-free).
     *
     * @param {Quaternion} out - Output quaternion
     * @returns {Quaternion} The output quaternion
     * @throws {TypeError} If `out` is not a valid Quaternion
     */
    copyRotation(out) {
        if (!this._isQuaternion(out)) {
            throw new TypeError('copyRotation() requires a valid Quaternion instance');
        }
        out.copy(this._rotation);
        return out;
    }

    /**
     * Copy scale to output vector (allocation-free).
     *
     * @param {Vector3} out - Output vector
     * @returns {Vector3} The output vector
     * @throws {TypeError} If `out` is not a valid Vector3
     */
    copyScale(out) {
        if (!this._isVector3(out)) {
            throw new TypeError('copyScale() requires a valid Vector3 instance');
        }
        out.copy(this._scale);
        return out;
    }

    // ============================================================
    // Setters (Replace Entire Value)
    // ============================================================

    /**
     * Set the position.
     *
     * @param {Vector3} position - New position
     * @returns {this} For method chaining
     * @throws {TypeError} If `position` is not a valid Vector3
     */
    setPosition(position) {
        if (!this._isVector3(position)) {
            throw new TypeError('setPosition() requires a valid Vector3 instance');
        }
        this._position.copy(position);
        this.markDirty();
        return this;
    }

    /**
     * Set the rotation.
     *
     * @param {Quaternion} rotation - New rotation
     * @returns {this} For method chaining
     * @throws {TypeError} If `rotation` is not a valid Quaternion
     */
    setRotation(rotation) {
        if (!this._isQuaternion(rotation)) {
            throw new TypeError('setRotation() requires a valid Quaternion instance');
        }
        this._rotation.copy(rotation);
        this.markDirty();
        return this;
    }

    /**
     * Set the scale.
     *
     * @param {Vector3} scale - New scale
     * @returns {this} For method chaining
     * @throws {TypeError} If `scale` is not a valid Vector3
     */
    setScale(scale) {
        if (!this._isVector3(scale)) {
            throw new TypeError('setScale() requires a valid Vector3 instance');
        }
        this._scale.copy(scale);
        this.markDirty();
        return this;
    }

    // ============================================================
    // Mutating Operations (Modify In Place, Zero Allocations)
    // ============================================================

    /**
     * Translate by a vector.
     *
     * @param {Vector3} delta - Translation delta
     * @returns {this} For method chaining
     * @throws {TypeError} If `delta` is not a valid Vector3
     */
    translate(delta) {
        if (!this._isVector3(delta)) {
            throw new TypeError('translate() requires a valid Vector3 instance');
        }
        this._position.add(delta);
        this.markDirty();
        return this;
    }

    /**
     * Rotate by a quaternion.
     *
     * @param {Quaternion} delta - Rotation delta
     * @returns {this} For method chaining
     * @throws {TypeError} If `delta` is not a valid Quaternion
     */
    rotate(delta) {
        if (!this._isQuaternion(delta)) {
            throw new TypeError('rotate() requires a valid Quaternion instance');
        }
        this._rotation.multiply(delta);
        this.markDirty();
        return this;
    }

    /**
     * Scale by a factor.
     *
     * @param {Vector3} factor - Scale factor
     * @returns {this} For method chaining
     * @throws {TypeError} If `factor` is not a valid Vector3
     */
    scale(factor) {
        if (!this._isVector3(factor)) {
            throw new TypeError('scale() requires a valid Vector3 instance');
        }
        this._scale.multiply(factor);
        this.markDirty();
        return this;
    }

    // ============================================================
    // Utility Methods
    // ============================================================

    /**
     * Set all components from another transform.
     *
     * Since this is copying from another Transform instance, we use
     * direct private field access for maximum performance, and
     * validate that the object is indeed a Transform.
     *
     * @param {Transform} other - Transform to copy from
     * @returns {this} For method chaining
     * @throws {TypeError} If `other` is not a valid Transform
     */
    copy(other) {
        if (!this._isTransform(other)) {
            throw new TypeError('copy() requires a valid Transform instance');
        }
        this._position.copy(other._position);
        this._rotation.copy(other._rotation);
        this._scale.copy(other._scale);
        this.markDirty();
        return this;
    }

    /**
     * Clone this transform.
     *
     * @returns {Transform} New transform with same values (allocates)
     */
    clone() {
        return new Transform({
            position: this._position,
            rotation: this._rotation,
            scale: this._scale
        });
    }

    /**
     * Reset to identity transform.
     *
     * @returns {this} For method chaining
     */
    identity() {
        this._position.set(0, 0, 0);
        this._rotation.identity();
        this._scale.set(1, 1, 1);
        this.markDirty();
        return this;
    }

    /**
     * Mark as dirty, forcing matrix recomputation on next getMatrix().
     *
     * @returns {this} For method chaining
     */
    markDirty() {
        this._dirty = true;
        return this;
    }

    /**
     * Check if the matrix is dirty.
     *
     * @returns {boolean} True if dirty
     */
    isDirty() {
        return this._dirty;
    }

    // ============================================================
    // Matrix Access (Lazy, Zero Allocations)
    // ============================================================

    /**
     * Get the cached local matrix.
     *
     * If dirty, recompute via TransformAlgorithms.compose().
     * The matrix is reused — no allocation occurs.
     *
     * IMPORTANT: The returned Matrix4 is owned by this Transform.
     * Callers MUST treat it as read-only. Modifying it directly
     * will invalidate the Transform's dirty state.
     *
     * @returns {Matrix4} Cached local matrix (read-only by convention)
     */
    getMatrix() {
        if (this._dirty) {
            TransformAlgorithms.compose(
                this,
                this._localMatrix
            );
            this._dirty = false;
        }
        return this._localMatrix;
    }
}