/**
 * src/framework/math/Transform.js
 * 
 * Echo Engine — Math Library
 * 
 * Represents a 3D transform with position, rotation (quaternion), and scale.
 * 
 * This is a PURE DATA CONTAINER.
 * All operations are in separate static modules.
 * 
 * Responsibilities:
 * - Store position (Vector3)
 * - Store rotation (Quaternion)
 * - Store scale (Vector3)
 * - Cache computed matrix (Matrix4)
 * - Track dirty state
 * 
 * Design Principles:
 * - Single Responsibility: Transform only stores TRS data
 * - Immutable Getter Returns: Getters return copies, not references
 * - Allocation-Free Copies: copyPosition(), copyRotation(), copyScale() for hot paths
 * - No Operations: No matrix math, interpolation, or utilities
 * - Lazy Matrix: Matrix computed via static TransformAlgorithms
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
     */
    constructor(options = {}) {
        /** @type {Vector3} */
        this._position = options.position 
            ? options.position.clone() 
            : new Vector3(0, 0, 0);
        
        /** @type {Quaternion} */
        this._rotation = options.rotation 
            ? options.rotation.clone() 
            : new Quaternion();
        
        /** @type {Vector3} */
        this._scale = options.scale 
            ? options.scale.clone() 
            : new Vector3(1, 1, 1);

        /** @type {Matrix4|null} */
        this._matrix = null;
        
        /** @type {boolean} */
        this._dirty = true;
    }

    // ============================================================
    // Convenience Getters (Return Copies)
    // ============================================================

    /**
     * Get a copy of the position.
     * @returns {Vector3} Position (copy)
     */
    getPosition() {
        return this._position.clone();
    }

    /**
     * Get a copy of the rotation.
     * @returns {Quaternion} Rotation (copy)
     */
    getRotation() {
        return this._rotation.clone();
    }

    /**
     * Get a copy of the scale.
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
     * @param {Vector3} out - Output vector
     * @returns {Vector3} Output vector
     */
    copyPosition(out) {
        out.copy(this._position);
        return out;
    }

    /**
     * Copy rotation to output quaternion (allocation-free).
     * @param {Quaternion} out - Output quaternion
     * @returns {Quaternion} Output quaternion
     */
    copyRotation(out) {
        out.copy(this._rotation);
        return out;
    }

    /**
     * Copy scale to output vector (allocation-free).
     * @param {Vector3} out - Output vector
     * @returns {Vector3} Output vector
     */
    copyScale(out) {
        out.copy(this._scale);
        return out;
    }

    // ============================================================
    // Setters (Replace Entire Value)
    // ============================================================

    /**
     * Set the position.
     * @param {Vector3} position - New position
     * @returns {this} For method chaining
     */
    setPosition(position) {
        this._position.copy(position);
        this._markDirty();
        return this;
    }

    /**
     * Set the rotation.
     * @param {Quaternion} rotation - New rotation
     * @returns {this} For method chaining
     */
    setRotation(rotation) {
        this._rotation.copy(rotation);
        this._markDirty();
        return this;
    }

    /**
     * Set the scale.
     * @param {Vector3} scale - New scale
     * @returns {this} For method chaining
     */
    setScale(scale) {
        this._scale.copy(scale);
        this._markDirty();
        return this;
    }

    // ============================================================
    // Mutative Operations (Modify In Place)
    // ============================================================

    /**
     * Translate by a vector.
     * @param {Vector3} delta - Translation delta
     * @returns {this} For method chaining
     */
    translate(delta) {
        this._position.add(delta);
        this._markDirty();
        return this;
    }

    /**
     * Rotate by a quaternion.
     * @param {Quaternion} delta - Rotation delta
     * @returns {this} For method chaining
     */
    rotate(delta) {
        this._rotation.multiply(delta);
        this._markDirty();
        return this;
    }

    /**
     * Scale by a factor.
     * @param {Vector3} factor - Scale factor
     * @returns {this} For method chaining
     */
    scale(factor) {
        this._scale.multiply(factor);
        this._markDirty();
        return this;
    }

    /**
     * Set all components from another transform.
     * @param {Transform} other - Transform to copy from
     * @returns {this} For method chaining
     */
    copy(other) {
        this._position.copy(other._position);
        this._rotation.copy(other._rotation);
        this._scale.copy(other._scale);
        this._dirty = true;
        return this;
    }

    /**
     * Reset to identity transform.
     * @returns {this} For method chaining
     */
    identity() {
        this._position.set(0, 0, 0);
        this._rotation.identity();
        this._scale.set(1, 1, 1);
        this._dirty = true;
        return this;
    }

    // ============================================================
    // Matrix Access (Lazy, Cached)
    // ============================================================

    /**
     * Get the cached matrix.
     * If dirty, recompute via TransformAlgorithms.compose().
     * 
     * @returns {Matrix4} Cached matrix
     */
    getMatrix() {
        if (this._dirty || !this._matrix) {
            this._matrix = TransformAlgorithms.compose(this);
            this._dirty = false;
        }
        return this._matrix;
    }

    /**
     * Mark as dirty, forcing matrix recomputation.
     * @returns {this} For method chaining
     */
    markDirty() {
        this._dirty = true;
        return this;
    }

    /**
     * Check if the matrix is dirty.
     * @returns {boolean} True if dirty
     */
    isDirty() {
        return this._dirty;
    }

    /**
     * Clone this transform.
     * @returns {Transform} New transform with same values
     */
    clone() {
        return new Transform({
            position: this._position,
            rotation: this._rotation,
            scale: this._scale
        });
    }

    // ============================================================
    // Internal
    // ============================================================

    /**
     * Mark transform as dirty.
     * @private
     */
    _markDirty() {
        this._dirty = true;
    }
}

