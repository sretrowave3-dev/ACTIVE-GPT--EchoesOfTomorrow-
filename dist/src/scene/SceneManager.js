import { SceneState } from './SceneState.js';
import { TransitionState } from './TransitionState.js';
import { SceneTransition } from './SceneTransition.js';

/**
 * Orchestrates scene registration, switching, stacking, and updates.
 * Does not own rendering, physics, or ECS.
 */
export class SceneManager {
    constructor() {
        /** @type {Map<string, Scene>} */
        this._registry = new Map();
        /** @type {Scene|null} */
        this._current = null;
        /** @type {Scene[]} */
        this._stack = [];
        /** @type {SceneTransition|null} */
        this._transition = null;
    }

    current() { return this._current; }
    get stack() { return this._stack; }
    get transition() { return this._transition; }

    /**
     * @param {Scene} scene
     */
    register(scene) {
        if (this._registry.has(scene.id)) {
            throw new Error(`Scene "${scene.id}" already registered`);
        }
        this._registry.set(scene.id, scene);
    }

    /**
     * @param {string} id
     */
    unregister(id) {
        const scene = this._registry.get(id);
        if (!scene) return;
        if (scene === this._current) {
            throw new Error(`Cannot unregister active scene "${id}"`);
        }
        this._shutdownScene(scene);
        this._registry.delete(id);
    }

    /**
     * @param {string} id
     */
    load(id) {
        const scene = this._registry.get(id);
        if (!scene) throw new Error(`Scene "${id}" not registered`);
        scene.load();
    }

    /**
     * @param {string} id
     */
    unload(id) {
        const scene = this._registry.get(id);
        if (!scene) throw new Error(`Scene "${id}" not registered`);
        if (scene === this._current) {
            throw new Error(`Cannot unload active scene "${id}"`);
        }
        this._shutdownScene(scene);
    }

    /**
     * Replace current scene with another.
     * @param {string} id
     */
    switch(id) {
        const toScene = this._registry.get(id);
        if (!toScene) throw new Error(`Scene "${id}" not registered`);

        const fromScene = this._current;
        this._transition = new SceneTransition(fromScene, toScene);
        this._transition.status = TransitionState.ACTIVE;

        if (fromScene) {
            this._shutdownScene(fromScene);
        }

        toScene.load();
        toScene.initialize();

        this._current = toScene;
        this._transition.status = TransitionState.COMPLETED;
        this._transition.progress = 1.0;
        this._stack = [];
    }

    /**
     * Push a scene onto the stack (pauses current).
     * @param {string} id
     */
    push(id) {
        const scene = this._registry.get(id);
        if (!scene) throw new Error(`Scene "${id}" not registered`);

        if (this._current) {
            this._stack.push(this._current);
            this._current.pause();
        }

        scene.load();
        scene.initialize();
        this._current = scene;
    }

    /**
     * Pop the top scene (restores previous).
     */
    pop() {
        if (this._stack.length === 0) {
            throw new Error('Scene stack is empty');
        }

        if (this._current) {
            this._shutdownScene(this._current);
        }

        this._current = this._stack.pop();
        this._current.resume();
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        // TODO: Replace with proper transition system (not time‑based)
        if (this._transition && this._transition.status !== TransitionState.COMPLETED) {
            this._transition.progress = Math.min(1, this._transition.progress + delta);
            if (this._transition.progress >= 1) {
                this._transition.status = TransitionState.COMPLETED;
            }
        }
        if (this._current) {
            this._current.update(delta);
        }
    }

    /** @param {string} id */
    getScene(id) { return this._registry.get(id); }

    /** @param {string} id */
    isRegistered(id) { return this._registry.has(id); }

    /** @returns {string[]} */
    getRegisteredSceneIds() { return Array.from(this._registry.keys()); }

    /**
     * Private helper to fully shut down a scene.
     * @param {Scene} scene
     * @private
     */
    _shutdownScene(scene) {
        if (scene.state === SceneState.DESTROYED) return;
        scene.stop();
        scene.unload();
        scene.destroy();
    }
}