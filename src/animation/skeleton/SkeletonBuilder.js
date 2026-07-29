/**
 * src/animation/skeleton/SkeletonBuilder.js
 * 
 * D016 Animation System — SkeletonBuilder
 * 
 * Constructs and validates Skeleton instances.
 * 
 * Responsibilities:
 * - Build internal maps (by id, name, index)
 * - Identify root bones
 * - Validate hierarchy (no orphans, no cycles, no duplicates)
 * - Create immutable Skeleton instance
 * 
 * This class separates asset construction from asset representation.
 * The Skeleton class is a pure data container.
 */

import { Skeleton } from './Skeleton.js';
import { Bone } from './Bone.js';

export class SkeletonBuilder {
    /**
     * Create a new SkeletonBuilder.
     * 
     * @param {Bone[]} bones - Array of Bone objects
     * @throws {TypeError} If any element is not a Bone instance
     */
    constructor(bones = []) {
        if (!Array.isArray(bones)) {
            throw new TypeError('bones must be an array');
        }

        for (const bone of bones) {
            if (!(bone instanceof Bone)) {
                throw new TypeError('All elements must be instances of Bone');
            }
        }

        /** @type {Bone[]} */
        this._bones = bones;
    }

    /**
     * Build and validate the skeleton.
     * 
     * @returns {Skeleton} Immutable Skeleton instance
     * @throws {Error} If validation fails
     */
    build() {
        // --- Build maps ---
        const bonesById = new Map();
        const bonesByName = new Map();
        const bonesByIndex = [];
        const indexSet = new Set();

        for (const bone of this._bones) {
            // Validate ID uniqueness
            const id = bone.getId();
            if (bonesById.has(id)) {
                throw new Error(`Duplicate bone id: ${id}`);
            }
            bonesById.set(id, bone);

            // Validate Name uniqueness
            const name = bone.getName();
            if (bonesByName.has(name)) {
                throw new Error(`Duplicate bone name: ${name}`);
            }
            bonesByName.set(name, bone);

            // Validate Index uniqueness
            const index = bone.getIndex();
            if (index < 0) {
                throw new Error(`Bone "${name}" has invalid index: ${index}`);
            }
            if (indexSet.has(index)) {
                throw new Error(`Duplicate bone index: ${index} (bone: ${name})`);
            }
            indexSet.add(index);

            bonesByIndex[index] = bone;
        }

        // Validate index contiguity
        const expectedCount = this._bones.length;
        for (let i = 0; i < expectedCount; i++) {
            if (!bonesByIndex[i]) {
                throw new Error(
                    `Missing bone at index ${i}. Indices must be contiguous from 0 to ${expectedCount - 1}`
                );
            }
        }

        // --- Identify root bones ---
        const rootBones = [];
        for (const bone of bonesById.values()) {
            if (bone.isRoot()) {
                rootBones.push(bone);
            }
        }

        if (rootBones.length === 0 && bonesById.size > 0) {
            throw new Error('Skeleton has no root bones but contains bones');
        }

        // --- Validate hierarchy (no orphans, no cycles) ---
        const visited = new Set();
        const stack = [...rootBones];

        while (stack.length > 0) {
            const bone = stack.pop();
            if (visited.has(bone)) continue;
            visited.add(bone);

            for (const child of bone.getChildren()) {
                if (!bonesById.has(child.getId())) {
                    throw new Error(
                        `Bone "${child.getName()}" has a parent "${bone.getName()}" ` +
                        `that is not in the skeleton's bone list`
                    );
                }
                stack.push(child);
            }
        }

        // Check for orphans
        if (visited.size !== bonesById.size) {
            const missing = [];
            for (const bone of bonesById.values()) {
                if (!visited.has(bone)) {
                    missing.push(`"${bone.getName()}" (${bone.getId()})`);
                }
            }
            throw new Error(
                `Skeleton contains ${missing.length} orphaned bone(s): ${missing.join(', ')}`
            );
        }

        // --- Create immutable Skeleton ---
        return new Skeleton({
            bonesById,
            bonesByName,
            bonesByIndex,
            rootBones,
            boneCount: this._bones.length
        });
    }
}

export default SkeletonBuilder;