/**
 * src/animation/skeleton/Bone.js
 * 
 * D016 Animation System — Bone
 * 
 * Represents a single bone in a skeleton hierarchy.
 * 
 * A Bone is an IMMUTABLE DEFINITION of a skeletal node.
 * It does NOT contain runtime transforms.
 * Runtime transforms are stored in SkeletonPose.
 * 
 * Responsibilities:
 * - Store bone identity (id, name, index)
 * - Maintain parent-child relationships (hierarchy)
 * - Store bind pose matrix (local space)
 * - Store inverse bind matrix (world-to-local)
 * - Provide optional metadata (IK targets, constraints, etc.)
 * 
 * Design Principles:
 * - Single Responsibility: Bone is only the definition
 * - Immutable Identity: id, name, index, bind matrices never change
 * - No Runtime State: No position, rotation, scale, matrices
 * - No Math Dependencies: Uses only Matrix4 from math library for bind data
 * - No Serialization: Persistence belongs to importers/exporters
 * - Optional Metadata: Lazy-allocated Map for extension data
 * 
 * Separation of Concerns:
 * - Bone = Skeleton Definition (immutable)
 * - SkeletonPose = Runtime Pose (mutable per instance)
 * - Skeleton = Container of Bones (shared across instances)
 * 
 * Future-Proof:
 * - Supports animation sharing (one skeleton, many poses)
 * - Supports layered animation (multiple pose layers)
 * - Supports IK, procedural animation, motion matching
 */

// ============================================================
// Imports: Central Math Library
// ============================================================

import { Matrix4 } from '../../framework/math/Matrix4.js';

// ============================================================
// Bone Class
// ============================================================

export class Bone {
    /**
     * Create a new Bone definition.
     * 
     * @param {string} id - Unique bone identifier (immutable)
     * @param {string} name - Human-readable bone name (immutable)
     * @param {Object} [options] - Optional configuration
     * @param {Bone} [options.parent] - Parent bone (null for root)
     * @param {Matrix4} [options.bindTransform] - Bind pose matrix (local space)
     * @param {Matrix4} [options.inverseBindTransform] - Inverse bind matrix (world-to-local)
     * @param {number} [options.index] - Bone index in skeleton (for array lookups)
     */
    constructor(id, name, options = {}) {
        // --- Identity (immutable) ---
        /** @readonly @type {string} */
        this._id = id;
        /** @readonly @type {string} */
        this._name = name;
        
        // --- Index (for array-based operations) ---
        /** @type {number} */
        this._index = options.index ?? -1;

        // --- Hierarchy ---
        /** @type {Bone|null} */
        this._parent = options.parent ?? null;
        /** @type {Bone[]} */
        this._children = [];

        // --- Bind Transforms (provided by importer, immutable) ---
        /** @type {Matrix4} */
        this._bindTransform = options.bindTransform 
            ? options.bindTransform.clone()
            : new Matrix4();
        
        /** @type {Matrix4} */
        this._inverseBindTransform = options.inverseBindTransform
            ? options.inverseBindTransform.clone()
            : this._bindTransform.clone().invert();

        // --- Optional Metadata (lazy-allocated) ---
        /** @type {Map<string, any>|null} */
        this._metadata = null;
    }

    // ============================================================
    // Getters (Read-Only Properties)
    // ============================================================

    /** @returns {string} Unique bone identifier */
    getId() {
        return this._id;
    }

    /** @returns {string} Human-readable bone name */
    getName() {
        return this._name;
    }

    /** @returns {number} Bone index in skeleton (-1 if not assigned) */
    getIndex() {
        return this._index;
    }

    // ============================================================
    // Hierarchy Methods
    // ============================================================

    /**
     * Add a child bone.
     * 
     * @param {Bone} child - Child bone to add
     * @throws {TypeError} If child is not a Bone instance
     * @throws {Error} If child would create a circular hierarchy
     * @returns {this} For method chaining
     */
    addChild(child) {
        if (!(child instanceof Bone)) {
            throw new TypeError('Child must be an instance of Bone');
        }

        // Prevent circular references
        if (this._isAncestorOf(child)) {
            throw new Error(`Cannot add child: would create circular hierarchy`);
        }

        // Remove from existing parent if any
        if (child._parent) {
            child._parent.removeChild(child);
        }

        // Set parent
        child._parent = this;
        this._children.push(child);

        return this;
    }

    /**
     * Remove a child bone.
     * 
     * @param {Bone} child - Child bone to remove
     * @returns {this} For method chaining
     */
    removeChild(child) {
        const index = this._children.indexOf(child);
        if (index === -1) {
            return this;
        }

        this._children.splice(index, 1);
        child._parent = null;

        return this;
    }

    /**
     * Get the parent bone.
     * @returns {Bone|null} Parent bone or null if root
     */
    getParent() {
        return this._parent;
    }

    /**
     * Get all children bones.
     * @returns {Bone[]} Array of child bones (preserves insertion order)
     */
    getChildren() {
        return [...this._children];
    }

    /**
     * Check if this bone is a root (has no parent).
     * @returns {boolean}
     */
    isRoot() {
        return this._parent === null;
    }

    /**
     * Check if this bone is a leaf (has no children).
     * @returns {boolean}
     */
    isLeaf() {
        return this._children.length === 0;
    }

    /**
     * Get the root ancestor of this bone.
     * @returns {Bone} Root bone
     */
    getRoot() {
        let current = this;
        while (current._parent) {
            current = current._parent;
        }
        return current;
    }

    /**
     * Count all descendants (children, grandchildren, etc.).
     * @returns {number} Number of descendant bones
     */
    getDescendantCount() {
        let count = 0;
        for (const child of this._children) {
            count += 1 + child.getDescendantCount();
        }
        return count;
    }

    /**
     * Traverse the hierarchy in depth-first order.
     * 
     * @param {function(Bone, number): void} callback - Called for each bone
     * @param {number} [depth] - Current depth (used internally)
     */
    traverse(callback, depth = 0) {
        callback(this, depth);
        for (const child of this._children) {
            child.traverse(callback, depth + 1);
        }
    }

    /**
     * Compute the depth of this bone (distance from root).
     * This is computed on-demand to avoid storing it.
     * @returns {number} Depth (0 = root)
     */
    computeDepth() {
        let depth = 0;
        let current = this._parent;
        while (current) {
            depth++;
            current = current._parent;
        }
        return depth;
    }

    // ============================================================
    // Bind Transforms (Read-Only)
    // ============================================================

    /**
     * Get the local bind transform matrix.
     * @returns {Matrix4} Bind transform matrix (clone)
     */
    getBindTransform() {
        return this._bindTransform.clone();
    }

    /**
     * Get the inverse bind transform matrix.
     * @returns {Matrix4} Inverse bind transform matrix (clone)
     */
    getInverseBindTransform() {
        return this._inverseBindTransform.clone();
    }

    // ============================================================
    // Optional Metadata (Lazy-Allocated)
    // ============================================================

    /**
     * Store arbitrary metadata on this bone.
     * Use this for IK targets, constraints, weights, etc.
     * 
     * @param {string} key - Metadata key
     * @param {*} value - Metadata value
     * @returns {this} For method chaining
     */
    setMetadata(key, value) {
        if (!this._metadata) {
            this._metadata = new Map();
        }
        this._metadata.set(key, value);
        return this;
    }

    /**
     * Retrieve metadata by key.
     * @param {string} key - Metadata key
     * @returns {*} Metadata value or undefined
     */
    getMetadata(key) {
        return this._metadata ? this._metadata.get(key) : undefined;
    }

    /**
     * Check if metadata key exists.
     * @param {string} key - Metadata key
     * @returns {boolean}
     */
    hasMetadata(key) {
        return this._metadata ? this._metadata.has(key) : false;
    }

    /**
     * Remove metadata by key.
     * @param {string} key - Metadata key
     * @returns {boolean} True if removed
     */
    removeMetadata(key) {
        if (!this._metadata) return false;
        const removed = this._metadata.delete(key);
        if (this._metadata.size === 0) {
            this._metadata = null;
        }
        return removed;
    }

    /**
     * Get all metadata keys.
     * @returns {string[]} Array of metadata keys
     */
    getMetadataKeys() {
        return this._metadata ? Array.from(this._metadata.keys()) : [];
    }

    // ============================================================
    // Private Methods
    // ============================================================

    /**
     * Check if this bone is an ancestor of another bone.
     * @param {Bone} bone - Bone to check
     * @returns {boolean} True if this bone is an ancestor
     * @private
     */
    _isAncestorOf(bone) {
        let current = bone._parent;
        while (current) {
            if (current === this) return true;
            current = current._parent;
        }
        return false;
    }
}

// ============================================================
// Exports
// ============================================================

export default Bone;