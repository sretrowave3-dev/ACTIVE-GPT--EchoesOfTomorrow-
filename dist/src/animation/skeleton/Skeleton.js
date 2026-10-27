/**
 * src/animation/skeleton/Skeleton.js
 * 
 * D016 Animation System — Skeleton
 * 
 * Represents an immutable container of Bone definitions.
 * 
 * A Skeleton is a SHARED DEFINITION of a skeletal structure.
 * It does NOT contain runtime animation state.
 * Runtime transforms belong exclusively to SkeletonPose.
 * 
 * Responsibilities:
 * - Own a collection of Bone objects (immutable)
 * - Provide fast O(1) lookup by id, name, and index
 * - Maintain root bone(s) for traversal
 * - Provide deterministic traversal utilities (DFS, BFS)
 * - Provide iteration via forEachBone() and Symbol.iterator
 * - Immutable after construction (no modification methods)
 * 
 * Design Principles:
 * - Single Responsibility: Skeleton only defines and stores the hierarchy
 * - Immutable: Once constructed, the skeleton definition is frozen
 * - Shareable: One Skeleton can be used by hundreds of SkeletonPose instances
 * - Construction: Skeleton is created by SkeletonBuilder, not directly
 * - No Runtime State: Absolutely no position, rotation, scale, or matrices
 * - No Mutations: No add/remove methods. Hierarchy is fixed after construction
 * 
 * Separation of Concerns:
 * - SkeletonBuilder = Constructs and validates the skeleton
 * - Bone = Individual skeleton definition node (immutable)
 * - Skeleton = Container of Bones (immutable, shareable)
 * - SkeletonPose = Runtime transforms (mutable, per instance)
 * 
 * Future-Proof:
 * - Supports animation sharing across thousands of instances
 * - Supports hierarchical traversal for IK and procedural animation
 * - Efficient iteration without array allocations
 */

// ============================================================
// Imports
// ============================================================

import { Bone } from './Bone.js';

// ============================================================
// Skeleton Class
// ============================================================

export class Skeleton {
    /**
     * Create a new Skeleton definition.
     * 
     * This constructor is intentionally minimal. It does NOT perform
     * validation, hierarchy building, or map construction.
     * 
     * Use SkeletonBuilder to construct validated Skeleton instances.
     * 
     * @param {Object} data - Skeleton data
     * @param {Map<string, Bone>} data.bonesById - Map of id → Bone
     * @param {Map<string, Bone>} data.bonesByName - Map of name → Bone
     * @param {Bone[]} data.bonesByIndex - Array of Bones (index order)
     * @param {Bone[]} data.rootBones - Array of root Bones
     * @param {number} data.boneCount - Total number of bones
     */
    constructor(data) {
        /** @type {Map<string, Bone>} */
        this.#bonesById = data.bonesById;
        
        /** @type {Map<string, Bone>} */
        this.#bonesByName = data.bonesByName;
        
        /** @type {Bone[]} */
        this.#bonesByIndex = data.bonesByIndex;
        
        /** @type {Bone[]} */
        this.#rootBones = data.rootBones;
        
        /** @type {number} */
        this.#boneCount = data.boneCount;

        // Freeze internal arrays for immutability
        Object.freeze(this.#bonesByIndex);
        Object.freeze(this.#rootBones);
        
        // Mark the skeleton as immutable
        Object.freeze(this);
    }

    // ============================================================
    // Lookup Methods (O(1))
    // ============================================================

    /**
     * Retrieve a bone by its unique identifier.
     * 
     * @param {string} id - Bone ID
     * @returns {Bone|undefined} The bone, or undefined if not found
     */
    getBoneById(id) {
        return this.#bonesById.get(id);
    }

    /**
     * Retrieve a bone by its name.
     * 
     * @param {string} name - Bone name
     * @returns {Bone|undefined} The bone, or undefined if not found
     */
    getBoneByName(name) {
        return this.#bonesByName.get(name);
    }

    /**
     * Retrieve a bone by its index.
     * 
     * @param {number} index - Bone index
     * @returns {Bone|undefined} The bone, or undefined if out of range
     */
    getBoneByIndex(index) {
        if (index < 0 || index >= this.#bonesByIndex.length) {
            return undefined;
        }
        return this.#bonesByIndex[index];
    }

    /**
     * Get all root bones of the hierarchy.
     * 
     * @returns {readonly Bone[]} Array of root bones (read-only)
     */
    getRootBones() {
        return this.#rootBones;
    }

    /**
     * Get all bones in the skeleton (index order).
     * 
     * @returns {readonly Bone[]} Array of all bones (read-only)
     */
    getBones() {
        return this.#bonesByIndex;
    }

    /**
     * Get the total number of bones in the skeleton.
     * 
     * @returns {number} Bone count
     */
    getBoneCount() {
        return this.#boneCount;
    }

    /**
     * Check if the skeleton contains a specific bone.
     * 
     * @param {Bone|string} bone - Bone instance or ID
     * @returns {boolean} True if the bone belongs to this skeleton
     */
    containsBone(bone) {
        if (bone instanceof Bone) {
            return this.#bonesById.has(bone.getId()) && 
                   this.#bonesById.get(bone.getId()) === bone;
        }
        if (typeof bone === 'string') {
            return this.#bonesById.has(bone);
        }
        return false;
    }

    // ============================================================
    // Iteration Methods (No Allocations)
    // ============================================================

    /**
     * Iterate over all bones in the skeleton.
     * 
     * This is the preferred method for iterating bones
     * because it avoids allocating an array.
     * 
     * @param {function(Bone, number): void} callback - Called for each bone with its index
     */
    forEachBone(callback) {
        const bones = this.#bonesByIndex;
        for (let i = 0; i < bones.length; i++) {
            callback(bones[i], i);
        }
    }

    /**
     * Iterate over all root bones in the skeleton.
     * 
     * @param {function(Bone, number): void} callback - Called for each root bone with its index
     */
    forEachRootBone(callback) {
        const roots = this.#rootBones;
        for (let i = 0; i < roots.length; i++) {
            callback(roots[i], i);
        }
    }

    /**
     * Implement Symbol.iterator for for...of support.
     * 
     * This allows:
     *   for (const bone of skeleton) { ... }
     * 
     * Without allocating an array.
     * 
     * @returns {Iterator<Bone>}
     */
    [Symbol.iterator]() {
        const bones = this.#bonesByIndex;
        let index = 0;
        const length = bones.length;

        return {
            next() {
                if (index < length) {
                    return { value: bones[index++], done: false };
                }
                return { value: undefined, done: true };
            }
        };
    }

    // ============================================================
    // Traversal Methods (Iterative, No Recursion)
    // ============================================================

    /**
     * Traverse the hierarchy in Depth-First order (iterative).
     * 
     * This uses an explicit stack to avoid recursion depth limits.
     * It visits nodes in pre-order (parent before children).
     * 
     * @param {function(Bone, number): void} callback - Called for each bone
     * @param {Bone|Bone[]} [roots] - Starting bone(s). Defaults to all root bones.
     * @param {number} [maxDepth] - Maximum traversal depth (inclusive). Defaults to Infinity.
     */
    traverseDepthFirst(callback, roots = null, maxDepth = Infinity) {
        const startNodes = roots 
            ? (Array.isArray(roots) ? roots : [roots])
            : this.#rootBones;

        // Explicit stack for iterative traversal
        const stack = [];
        const depthMap = new Map();

        for (const root of startNodes) {
            if (!this.containsBone(root)) {
                continue;
            }
            stack.push(root);
            depthMap.set(root, 0);
        }

        while (stack.length > 0) {
            const bone = stack.pop();
            const depth = depthMap.get(bone) || 0;
            
            callback(bone, depth);

            if (depth >= maxDepth) {
                continue;
            }

            // Push children in reverse order to maintain original order
            const children = bone.getChildren();
            for (let i = children.length - 1; i >= 0; i--) {
                const child = children[i];
                if (!this.containsBone(child)) {
                    continue;
                }
                if (!depthMap.has(child)) {
                    depthMap.set(child, depth + 1);
                    stack.push(child);
                }
            }
        }
    }

    /**
     * Traverse the hierarchy in Breadth-First order (iterative).
     * 
     * This uses a head-index queue to avoid O(n) shift() operations.
     * It visits nodes level by level.
     * 
     * @param {function(Bone, number): void} callback - Called for each bone
     * @param {Bone|Bone[]} [roots] - Starting bone(s). Defaults to all root bones.
     * @param {number} [maxDepth] - Maximum traversal depth (inclusive). Defaults to Infinity.
     */
    traverseBreadthFirst(callback, roots = null, maxDepth = Infinity) {
        const startNodes = roots 
            ? (Array.isArray(roots) ? roots : [roots])
            : this.#rootBones;

        // Use head-index queue to avoid O(n) shift()
        const queue = [];
        const depthMap = new Map();
        let head = 0;

        for (const root of startNodes) {
            if (!this.containsBone(root)) {
                continue;
            }
            queue.push(root);
            depthMap.set(root, 0);
        }

        while (head < queue.length) {
            const bone = queue[head++];
            const depth = depthMap.get(bone) || 0;
            
            callback(bone, depth);

            if (depth >= maxDepth) {
                continue;
            }

            for (const child of bone.getChildren()) {
                if (!this.containsBone(child)) {
                    continue;
                }
                if (!depthMap.has(child)) {
                    depthMap.set(child, depth + 1);
                    queue.push(child);
                }
            }
        }
    }

    // ============================================================
    // Private Fields
    // ============================================================

    /** @type {Map<string, Bone>} */
    #bonesById;

    /** @type {Map<string, Bone>} */
    #bonesByName;

    /** @type {Bone[]} */
    #bonesByIndex;

    /** @type {Bone[]} */
    #rootBones;

    /** @type {number} */
    #boneCount;
}

// ============================================================
// Exports
// ============================================================

export default Skeleton;